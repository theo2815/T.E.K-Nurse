-- T.E.K Nurse — 0009_pickup_code.sql
--
-- Part 2 of 2 for the pickup-code decouple (slice #4). Splits the existing
-- "approve = release" flow into two phases:
--
--   PENDING_PICKUP -> APPROVED  -- generates pickup code; reservation held;
--                                  student is notified with the code.
--   APPROVED       -> RELEASED  -- staff verifies code at counter and clicks
--                                  Release; transaction is created here;
--                                  units move from reserved -> borrowed.
--   APPROVED       -> EXPIRED   -- pickup window passed; reservation freed.
--                                  Cron job to flip these lives in Phase 9;
--                                  the transition rule is in place now.
--
-- PREREQUISITE: 0008_add_released_enum.sql must have been applied first
-- (so the 'RELEASED' enum value is committed). Running this script before
-- 0008 will fail with `unsafe use of new value "RELEASED"`.
--
-- All existing APPROVED rows are backfilled to RELEASED with synthetic
-- pickup codes — they already have transactions created at original
-- approval time, so the new model maps cleanly onto them.

-- ============================================================================
-- 1. Columns on borrow_request + consumable_request
-- ============================================================================

alter table public.borrow_request
  add column if not exists pickup_code text,
  add column if not exists pickup_expires_at timestamptz,
  add column if not exists released_at timestamptz,
  add column if not exists released_by uuid references public.users(id) on delete restrict;

alter table public.consumable_request
  add column if not exists pickup_code text,
  add column if not exists pickup_expires_at timestamptz,
  add column if not exists released_at timestamptz,
  add column if not exists released_by uuid references public.users(id) on delete restrict;

-- ============================================================================
-- 2. generate_pickup_code()
--    Crockford base32 alphabet (no I L O U for readability). 6 chars =
--    32^6 ≈ 1.07B combinations. Retries on collision against active codes
--    (PENDING_PICKUP or APPROVED rows in either request table). Released
--    or terminated rows can have their codes reused without confusion.
-- ============================================================================

create or replace function public.generate_pickup_code()
returns text
language plpgsql
security definer
set search_path = public
volatile
as $$
declare
  alphabet text := '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
  code text;
  attempts int := 0;
  max_attempts int := 10;
begin
  loop
    code := '';
    for i in 1..6 loop
      code := code || substring(alphabet from (1 + floor(random() * 32)::int) for 1);
    end loop;

    if not exists (
      select 1 from public.borrow_request
        where pickup_code = code and status in ('APPROVED')
      union all
      select 1 from public.consumable_request
        where pickup_code = code and status in ('APPROVED')
    ) then
      return code;
    end if;

    attempts := attempts + 1;
    if attempts >= max_attempts then
      raise exception 'generate_pickup_code: exhausted attempts (%); too many active codes', max_attempts;
    end if;
  end loop;
end;
$$;

-- ============================================================================
-- 3. borrow_request — BEFORE UPDATE
--    Extends 0007 rules to allow APPROVED -> RELEASED|EXPIRED, populates
--    pickup_code + pickup_expires_at on approve, and released_at +
--    released_by on release.
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

  -- Terminal states are sticky. APPROVED is no longer terminal in this model.
  if old.status in ('RELEASED', 'EXPIRED', 'SKIPPED', 'CANCELLED', 'DECLINED') then
    raise exception 'borrow_request.status is terminal: % cannot change', old.status;
  end if;

  -- From PENDING_PICKUP, only specific transitions are allowed.
  if old.status = 'PENDING_PICKUP' then
    if new.status not in ('APPROVED', 'EXPIRED', 'SKIPPED', 'CANCELLED', 'DECLINED') then
      raise exception 'borrow_request: invalid transition % -> %', old.status, new.status;
    end if;

    if new.status = 'APPROVED' then
      -- Slice 3: approval attribution.
      if new.approved_by is null then
        new.approved_by := auth.uid();
      end if;
      if new.approved_at is null then
        new.approved_at := now();
      end if;
      -- Slice 4: pickup code + expiry window.
      if new.pickup_code is null then
        new.pickup_code := public.generate_pickup_code();
      end if;
      if new.pickup_expires_at is null then
        new.pickup_expires_at := new.approved_at + interval '24 hours';
      end if;
    end if;

    return new;
  end if;

  -- From APPROVED, allow RELEASED or EXPIRED.
  if old.status = 'APPROVED' then
    if new.status not in ('RELEASED', 'EXPIRED') then
      raise exception 'borrow_request: invalid transition % -> %', old.status, new.status;
    end if;

    if new.status = 'RELEASED' then
      if new.released_by is null then
        new.released_by := auth.uid();
      end if;
      if new.released_at is null then
        new.released_at := now();
      end if;
    end if;

    return new;
  end if;

  raise exception 'borrow_request: unhandled transition % -> %', old.status, new.status;
end;
$$;

-- ============================================================================
-- 4. borrow_request — AFTER UPDATE
--    Approval no longer creates the transaction. Release does.
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
    -- Reservation stays in reserved_units; no transaction yet. The student
    -- needs to physically present at the counter and have the code verified
    -- before the unit moves to borrowed_units.

    perform public.write_audit_log(
      'borrow_request_approved', 'borrow_request', new.id, to_jsonb(old), to_jsonb(new)
    );
    perform public.enqueue_notification(
      new.student_id, 'borrow_approved',
      'Borrow approved · code ' || new.pickup_code,
      'Show ' || new.pickup_code || ' to the lab nurse to collect your item.',
      '/student/requests/' || new.id::text
    );
    perform public.enqueue_email(
      new.student_id, 'borrow_approved_with_code',
      jsonb_build_object(
        'request_id',         new.id,
        'pickup_code',        new.pickup_code,
        'pickup_expires_at',  new.pickup_expires_at,
        'quantity',           new.quantity
      )
    );

  elsif old.status = 'APPROVED' and new.status = 'RELEASED' then
    -- Idempotency guard: if a transaction already exists for this request,
    -- this UPDATE is the migration backfill (the original transaction was
    -- created at approval time under the old model). Skip side effects —
    -- the original 'borrow_request_approved' audit entry already covers it.
    -- (No write_audit_log here: the SQL editor running the backfill has no
    --  auth.uid() context, which would fail write_audit_log's actor check.)
    if not exists (
      select 1 from public.borrow_transaction where source_request_id = new.id
    ) then
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
        new.expected_return_date, 'BORROWED', new.released_by, new.id
      );

      perform public.write_audit_log(
        'borrow_request_released', 'borrow_request', new.id, to_jsonb(old), to_jsonb(new)
      );
      perform public.enqueue_notification(
        new.student_id, 'borrow_picked_up', 'Item picked up',
        'Returned by ' || new.expected_return_date || '. Thanks!',
        '/student/history'
      );
      perform public.enqueue_email(
        new.student_id, 'borrow_picked_up',
        jsonb_build_object(
          'request_id',           new.id,
          'expected_return_date', new.expected_return_date
        )
      );
    end if;

  elsif old.status = 'APPROVED' and new.status = 'EXPIRED' then
    -- Pickup window passed; release the reservation back to available.
    update public.equipment_sku
      set reserved_units  = reserved_units  - old.quantity,
          available_units = available_units + old.quantity
      where id = new.equipment_sku_id;

    perform public.write_audit_log(
      'borrow_request_pickup_expired', 'borrow_request', new.id, to_jsonb(old), to_jsonb(new)
    );
    perform public.enqueue_notification(
      new.student_id, 'borrow_pickup_expired', 'Pickup window expired',
      'Your approval expired before pickup. Please request again if you still need the item.',
      '/student/requests/' || new.id::text
    );
    perform public.enqueue_email(
      new.student_id, 'borrow_pickup_expired',
      jsonb_build_object('request_id', new.id)
    );

  elsif old.status = 'PENDING_PICKUP'
        and new.status in ('EXPIRED', 'SKIPPED', 'CANCELLED', 'DECLINED') then
    -- Pre-approval terminations: release the equipment reservation.
    update public.equipment_sku
      set reserved_units  = reserved_units  - old.quantity,
          available_units = available_units + old.quantity
      where id = new.equipment_sku_id;

    perform public.write_audit_log(
      'borrow_request_' || lower(new.status::text),
      'borrow_request', new.id, to_jsonb(old), to_jsonb(new)
    );

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
        new.student_id, 'borrow_declined', 'Request declined',
        'Staff declined your request: ' || new.decline_reason,
        '/student/requests/' || new.id::text
      );
      perform public.enqueue_email(
        new.student_id, 'borrow_declined',
        jsonb_build_object(
          'request_id',     new.id,
          'decline_reason', new.decline_reason
        )
      );
    end if;
  end if;

  return new;
end;
$$;

-- ============================================================================
-- 5. consumable_request — BEFORE UPDATE (same shape as borrow_request)
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

  if old.status in ('RELEASED', 'EXPIRED', 'CANCELLED', 'DECLINED') then
    raise exception 'consumable_request.status is terminal: % cannot change', old.status;
  end if;

  if old.status = 'PENDING_PICKUP' then
    if new.status not in ('APPROVED', 'EXPIRED', 'CANCELLED', 'DECLINED') then
      raise exception 'consumable_request: invalid transition % -> %', old.status, new.status;
    end if;
    if new.status = 'APPROVED' then
      if new.approved_by is null then
        new.approved_by := auth.uid();
      end if;
      if new.approved_at is null then
        new.approved_at := now();
      end if;
      if new.pickup_code is null then
        new.pickup_code := public.generate_pickup_code();
      end if;
      if new.pickup_expires_at is null then
        new.pickup_expires_at := new.approved_at + interval '24 hours';
      end if;
    end if;
    return new;
  end if;

  if old.status = 'APPROVED' then
    if new.status not in ('RELEASED', 'EXPIRED') then
      raise exception 'consumable_request: invalid transition % -> %', old.status, new.status;
    end if;
    if new.status = 'RELEASED' then
      if new.released_by is null then
        new.released_by := auth.uid();
      end if;
      if new.released_at is null then
        new.released_at := now();
      end if;
    end if;
    return new;
  end if;

  raise exception 'consumable_request: unhandled transition % -> %', old.status, new.status;
end;
$$;

-- ============================================================================
-- 6. consumable_request — AFTER UPDATE
--    Approval generates code (no usage row); release creates the usage,
--    which triggers FIFO + lot deductions via tr_consumable_usage_after_insert.
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
    perform public.write_audit_log(
      'consumable_request_approved', 'consumable_request', new.id, to_jsonb(old), to_jsonb(new)
    );
    perform public.enqueue_notification(
      new.student_id, 'consumable_approved',
      'Consumable approved · code ' || new.pickup_code,
      'Show ' || new.pickup_code || ' to the lab nurse to collect your supplies.',
      '/student/requests/' || new.id::text
    );
    perform public.enqueue_email(
      new.student_id, 'consumable_approved_with_code',
      jsonb_build_object(
        'request_id',        new.id,
        'pickup_code',       new.pickup_code,
        'pickup_expires_at', new.pickup_expires_at,
        'quantity',          new.quantity
      )
    );

  elsif old.status = 'APPROVED' and new.status = 'RELEASED' then
    -- Idempotency guard for migration backfill — see equivalent comment in
    -- tr_borrow_request_after_update.
    if not exists (
      select 1 from public.consumable_usage where source_request_id = new.id
    ) then
      insert into public.consumable_usage (
        student_id, consumable_sku_id, quantity_used, used_at,
        approved_by, source_request_id
      )
      values (
        new.student_id, new.consumable_sku_id, new.quantity, now(),
        new.released_by, new.id
      );
      perform public.write_audit_log(
        'consumable_request_released', 'consumable_request', new.id, to_jsonb(old), to_jsonb(new)
      );
    end if;

  elsif old.status = 'APPROVED' and new.status = 'EXPIRED' then
    -- Consumables don't reserve stock until release, so no count move here.
    -- Just audit + notify.
    perform public.write_audit_log(
      'consumable_request_pickup_expired', 'consumable_request', new.id, to_jsonb(old), to_jsonb(new)
    );
    perform public.enqueue_notification(
      new.student_id, 'consumable_pickup_expired', 'Pickup window expired',
      'Your consumable approval expired before pickup. Please request again if still needed.',
      '/student/requests/' || new.id::text
    );
    perform public.enqueue_email(
      new.student_id, 'consumable_pickup_expired',
      jsonb_build_object('request_id', new.id)
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
        'Your consumable request expired before pickup.',
        '/student/requests/' || new.id::text
      );
      perform public.enqueue_email(
        new.student_id, 'consumable_request_expired',
        jsonb_build_object('request_id', new.id)
      );
    elsif new.status = 'DECLINED' then
      perform public.enqueue_notification(
        new.student_id, 'consumable_request_declined', 'Request declined',
        'Staff declined your request: ' || new.decline_reason,
        '/student/requests/' || new.id::text
      );
      perform public.enqueue_email(
        new.student_id, 'consumable_request_declined',
        jsonb_build_object(
          'request_id',     new.id,
          'decline_reason', new.decline_reason
        )
      );
    end if;
  end if;

  return new;
end;
$$;

-- ============================================================================
-- 7. Backfill existing APPROVED rows -> RELEASED
--    Under the old model, every APPROVED row already had its transaction
--    created at approval time. The new constraint requires RELEASED rows to
--    have released_at + released_by + pickup_code, so we flip them and
--    synthesize the missing fields. The trigger's idempotency guards prevent
--    duplicate transactions and skip the picked-up notification (since the
--    item was actually handed over hours/days ago).
-- ============================================================================

update public.borrow_request
  set status            = 'RELEASED',
      pickup_code       = public.generate_pickup_code(),
      pickup_expires_at = coalesce(approved_at, now()) + interval '24 hours',
      released_at       = coalesce(approved_at, now()),
      released_by       = approved_by
  where status = 'APPROVED';

update public.consumable_request
  set status            = 'RELEASED',
      pickup_code       = public.generate_pickup_code(),
      pickup_expires_at = coalesce(approved_at, now()) + interval '24 hours',
      released_at       = coalesce(approved_at, now()),
      released_by       = approved_by
  where status = 'APPROVED';

-- ============================================================================
-- 8. Consistency constraints
--    Apply AFTER backfill so existing data passes.
-- ============================================================================

alter table public.borrow_request
  drop constraint if exists borrow_request_pickup_code_states;
alter table public.borrow_request
  add constraint borrow_request_pickup_code_states
  check (
    status in ('APPROVED'::public.equipment_request_status,
               'RELEASED'::public.equipment_request_status,
               'EXPIRED'::public.equipment_request_status)
    or pickup_code is null
  );

alter table public.borrow_request
  drop constraint if exists borrow_request_released_attribution;
alter table public.borrow_request
  add constraint borrow_request_released_attribution
  check (
    status <> 'RELEASED'::public.equipment_request_status
    or (released_at is not null
        and released_by is not null
        and pickup_code is not null)
  );

alter table public.consumable_request
  drop constraint if exists consumable_request_pickup_code_states;
alter table public.consumable_request
  add constraint consumable_request_pickup_code_states
  check (
    status in ('APPROVED'::public.consumable_request_status,
               'RELEASED'::public.consumable_request_status,
               'EXPIRED'::public.consumable_request_status)
    or pickup_code is null
  );

alter table public.consumable_request
  drop constraint if exists consumable_request_released_attribution;
alter table public.consumable_request
  add constraint consumable_request_released_attribution
  check (
    status <> 'RELEASED'::public.consumable_request_status
    or (released_at is not null
        and released_by is not null
        and pickup_code is not null)
  );

-- ============================================================================
-- 9. Lookup index — "find active request by pickup code"
-- ============================================================================

create index if not exists borrow_request_active_pickup_code_idx
  on public.borrow_request (pickup_code)
  where status = 'APPROVED' and pickup_code is not null;

create index if not exists consumable_request_active_pickup_code_idx
  on public.consumable_request (pickup_code)
  where status = 'APPROVED' and pickup_code is not null;
