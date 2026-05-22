-- T.E.K Nurse — 0005_request_declined.sql
--
-- Part 2 of 2 for the DECLINED status feature. Adds the decline_reason
-- column, CHECK constraints that reference 'DECLINED', and updated trigger
-- functions that handle the new transition.
--
-- PREREQUISITE: 0004_add_declined_enum.sql must have been applied first
-- (so the new enum value is committed). Running this script before 0004
-- will fail with `unsafe use of new value "DECLINED"`.
--
-- Semantics (vs the existing SKIPPED state):
--   SKIPPED   — staff issued the units to a walk-in instead. Reservation
--               released. No reason captured.
--   DECLINED  — staff rejected the request outright. Reservation released
--               (equipment) or no count move (consumable). A free-text
--               reason is REQUIRED so the student understands why.
--
-- Apply: paste into Supabase SQL Editor and run.

-- ============================================================================
-- 1. decline_reason column on both request tables
-- ============================================================================

alter table public.borrow_request
  add column if not exists decline_reason text;

alter table public.consumable_request
  add column if not exists decline_reason text;

-- A DECLINED row must carry a non-empty reason (≥ 3 chars after trim).
-- Non-DECLINED rows may have decline_reason null.

alter table public.borrow_request
  drop constraint if exists borrow_request_decline_reason_required;
alter table public.borrow_request
  add constraint borrow_request_decline_reason_required
  check (
    (status <> 'DECLINED'::public.equipment_request_status)
    or (decline_reason is not null and length(btrim(decline_reason)) >= 3)
  );

alter table public.consumable_request
  drop constraint if exists consumable_request_decline_reason_required;
alter table public.consumable_request
  add constraint consumable_request_decline_reason_required
  check (
    (status <> 'DECLINED'::public.consumable_request_status)
    or (decline_reason is not null and length(btrim(decline_reason)) >= 3)
  );

-- ============================================================================
-- 2. borrow_request — BEFORE UPDATE: extend transition rules to allow DECLINED
-- ============================================================================

create or replace function public.tr_borrow_request_before_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.status = new.status then
    return new;  -- non-status edits, no transition rules to enforce
  end if;

  -- Terminal states are sticky.
  if old.status in ('APPROVED', 'EXPIRED', 'SKIPPED', 'CANCELLED', 'DECLINED') then
    raise exception 'borrow_request.status is terminal: % cannot change', old.status;
  end if;

  -- From PENDING_PICKUP, only specific transitions are allowed.
  if old.status = 'PENDING_PICKUP' then
    if new.status not in ('APPROVED', 'EXPIRED', 'SKIPPED', 'CANCELLED', 'DECLINED') then
      raise exception 'borrow_request: invalid transition % -> %', old.status, new.status;
    end if;
    return new;
  end if;

  raise exception 'borrow_request: unhandled transition % -> %', old.status, new.status;
end;
$$;

-- ============================================================================
-- 3. borrow_request — AFTER UPDATE: handle DECLINED alongside the other
--    PENDING_PICKUP terminals. Equipment reservation is released on decline.
-- ============================================================================

create or replace function public.tr_borrow_request_after_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.status = new.status then
    return new;
  end if;

  if old.status = 'PENDING_PICKUP' and new.status = 'APPROVED' then
    update public.equipment_sku
      set reserved_units = reserved_units - old.quantity,
          borrowed_units = borrowed_units + old.quantity
      where id = new.equipment_sku_id;

    insert into public.borrow_transaction (
      student_id, equipment_sku_id, quantity, borrowed_at,
      expected_return_date, status, approved_by, source_request_id
    )
    values (
      new.student_id, new.equipment_sku_id, new.quantity, now(),
      new.expected_return_date, 'BORROWED', auth.uid(), new.id
    );

    perform public.write_audit_log(
      'borrow_request_approved', 'borrow_request', new.id, to_jsonb(old), to_jsonb(new)
    );
    perform public.enqueue_notification(
      new.student_id, 'borrow_approved', 'Borrow approved',
      'Please collect your equipment from the lab.', '/student/requests/' || new.id::text
    );
    perform public.enqueue_email(new.student_id, 'borrow_confirm',
      jsonb_build_object('request_id', new.id, 'quantity', new.quantity));

  elsif old.status = 'PENDING_PICKUP'
        and new.status in ('EXPIRED', 'SKIPPED', 'CANCELLED', 'DECLINED') then
    -- All four release the equipment reservation.
    update public.equipment_sku
      set reserved_units  = reserved_units  - old.quantity,
          available_units = available_units + old.quantity
      where id = new.equipment_sku_id;

    perform public.write_audit_log(
      'borrow_request_' || lower(new.status::text),
      'borrow_request', new.id, to_jsonb(old), to_jsonb(new)
    );

    -- Notify the student for non-cancellation transitions.
    if new.status in ('EXPIRED', 'SKIPPED') then
      perform public.enqueue_notification(
        new.student_id,
        case new.status when 'EXPIRED' then 'borrow_expired' else 'borrow_skipped' end,
        case new.status when 'EXPIRED' then 'Request expired' else 'Request skipped' end,
        case new.status
          when 'EXPIRED' then 'Your borrow request expired before pickup.'
          else 'Staff issued the units to another borrower. Please re-request.'
        end,
        '/student/requests/' || new.id::text
      );
      perform public.enqueue_email(
        new.student_id,
        case new.status when 'EXPIRED' then 'borrow_expired' else 'borrow_skipped' end,
        jsonb_build_object('request_id', new.id)
      );
    elsif new.status = 'DECLINED' then
      perform public.enqueue_notification(
        new.student_id,
        'borrow_declined',
        'Request declined',
        'Staff declined your request: ' || new.decline_reason,
        '/student/requests/' || new.id::text
      );
      perform public.enqueue_email(
        new.student_id,
        'borrow_declined',
        jsonb_build_object(
          'request_id', new.id,
          'decline_reason', new.decline_reason
        )
      );
    end if;
  end if;

  return new;
end;
$$;

-- ============================================================================
-- 4. consumable_request — BEFORE UPDATE: extend transition rules
-- ============================================================================

create or replace function public.tr_consumable_request_before_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.status = new.status then
    return new;
  end if;
  if old.status in ('APPROVED', 'EXPIRED', 'CANCELLED', 'DECLINED') then
    raise exception 'consumable_request.status is terminal: % cannot change', old.status;
  end if;
  if old.status = 'PENDING_PICKUP'
     and new.status not in ('APPROVED', 'EXPIRED', 'CANCELLED', 'DECLINED') then
    raise exception 'consumable_request: invalid transition % -> %', old.status, new.status;
  end if;
  return new;
end;
$$;

-- ============================================================================
-- 5. consumable_request — AFTER UPDATE: handle DECLINED (no count moves;
--    consumables don't reserve stock until APPROVED).
-- ============================================================================

create or replace function public.tr_consumable_request_after_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.status = new.status then
    return new;
  end if;

  if old.status = 'PENDING_PICKUP' and new.status = 'APPROVED' then
    insert into public.consumable_usage (
      student_id, consumable_sku_id, quantity_used, used_at,
      approved_by, source_request_id
    )
    values (
      new.student_id, new.consumable_sku_id, new.quantity, now(),
      auth.uid(), new.id
    );
    perform public.write_audit_log(
      'consumable_request_approved', 'consumable_request', new.id, to_jsonb(old), to_jsonb(new)
    );

  elsif old.status = 'PENDING_PICKUP'
        and new.status in ('EXPIRED', 'CANCELLED', 'DECLINED') then
    perform public.write_audit_log(
      'consumable_request_' || lower(new.status::text),
      'consumable_request', new.id, to_jsonb(old), to_jsonb(new)
    );

    if new.status = 'EXPIRED' then
      perform public.enqueue_notification(
        new.student_id, 'consumable_request_expired', 'Request expired',
        'Your consumable request expired before pickup.', '/student/requests/' || new.id::text
      );
      perform public.enqueue_email(new.student_id, 'consumable_request_expired',
        jsonb_build_object('request_id', new.id));
    elsif new.status = 'DECLINED' then
      perform public.enqueue_notification(
        new.student_id,
        'consumable_request_declined',
        'Request declined',
        'Staff declined your request: ' || new.decline_reason,
        '/student/requests/' || new.id::text
      );
      perform public.enqueue_email(
        new.student_id,
        'consumable_request_declined',
        jsonb_build_object(
          'request_id', new.id,
          'decline_reason', new.decline_reason
        )
      );
    end if;
  end if;

  return new;
end;
$$;
