-- T.E.K Nurse — 0007_approval_attribution.sql
--
-- Adds first-class approval attribution on borrow_request + consumable_request
-- so a future "verify at pickup" flow can answer "who approved this and when?"
-- without joining audit_log.
--
-- Background:
--   Today, approving a request is the same action as releasing the item — the
--   AFTER UPDATE trigger on PENDING_PICKUP -> APPROVED immediately creates
--   the borrow_transaction / consumable_usage. So borrow_request itself has
--   no approver column; the approver is only recorded on the resulting
--   transaction/usage row.
--
--   A future slice will decouple "approve" from "release" (pickup-code flow,
--   mockup C). When that lands, the request row needs to carry its own
--   approver + timestamp so the release UI can show:
--     "Approved by Maria S. · May 22, 9:15"
--
-- Strategy:
--   1. Add two nullable columns to each request table.
--   2. Backfill historical APPROVED rows from audit_log (which has the
--      actor_id + timestamp via the borrow_request_approved /
--      consumable_request_approved entries).
--   3. Add a lenient CHECK: APPROVED rows must have both fields populated.
--      Non-APPROVED rows have no requirement (avoids breaking seeds /
--      legacy rows mid-flight).
--   4. Update BEFORE UPDATE triggers to populate approved_by + approved_at
--      automatically on the PENDING_PICKUP -> APPROVED transition, so the
--      existing action layer (approveBorrowRequest, approveConsumableRequest,
--      and the AFTER INSERT trigger that creates approve rows) keeps working
--      without changes.
--
-- Apply: paste into Supabase SQL Editor and run.

-- ============================================================================
-- 1. Columns
-- ============================================================================

alter table public.borrow_request
  add column if not exists approved_by uuid references public.users(id) on delete restrict,
  add column if not exists approved_at timestamptz;

alter table public.consumable_request
  add column if not exists approved_by uuid references public.users(id) on delete restrict,
  add column if not exists approved_at timestamptz;

-- ============================================================================
-- 2. Backfill from audit_log
--    Every approval went through tr_*_request_after_update, which wrote a
--    'borrow_request_approved' or 'consumable_request_approved' audit entry
--    carrying actor_id + timestamp. Use those as the historical source of
--    truth.
-- ============================================================================

update public.borrow_request br
  set approved_by = al.actor_id,
      approved_at = al.timestamp
  from public.audit_log al
  where al.entity_type = 'borrow_request'
    and al.entity_id   = br.id
    and al.action_type = 'borrow_request_approved'
    and br.status      = 'APPROVED'
    and br.approved_by is null;

update public.consumable_request cr
  set approved_by = al.actor_id,
      approved_at = al.timestamp
  from public.audit_log al
  where al.entity_type = 'consumable_request'
    and al.entity_id   = cr.id
    and al.action_type = 'consumable_request_approved'
    and cr.status      = 'APPROVED'
    and cr.approved_by is null;

-- ============================================================================
-- 3. Lenient consistency constraint
--    APPROVED ⇒ both attribution fields populated.
--    Other statuses have no requirement.
-- ============================================================================

alter table public.borrow_request
  drop constraint if exists borrow_request_approved_attribution;
alter table public.borrow_request
  add constraint borrow_request_approved_attribution
  check (
    status <> 'APPROVED'::public.equipment_request_status
    or (approved_by is not null and approved_at is not null)
  );

alter table public.consumable_request
  drop constraint if exists consumable_request_approved_attribution;
alter table public.consumable_request
  add constraint consumable_request_approved_attribution
  check (
    status <> 'APPROVED'::public.consumable_request_status
    or (approved_by is not null and approved_at is not null)
  );

-- ============================================================================
-- 4. Reporting indexes — "approvals by staff X" queries
-- ============================================================================

create index if not exists borrow_request_approved_by_idx
  on public.borrow_request (approved_by, approved_at desc)
  where approved_by is not null;

create index if not exists consumable_request_approved_by_idx
  on public.consumable_request (approved_by, approved_at desc)
  where approved_by is not null;

-- ============================================================================
-- 5. borrow_request — BEFORE UPDATE
--    Preserves every rule from 0005 and adds attribution-population on the
--    PENDING_PICKUP -> APPROVED transition.
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

    -- Populate approval attribution on PENDING_PICKUP -> APPROVED if the
    -- caller didn't supply them. Defensive defaults so the existing action
    -- layer (approveBorrowRequest) keeps working without changes.
    if new.status = 'APPROVED' then
      if new.approved_by is null then
        new.approved_by := auth.uid();
      end if;
      if new.approved_at is null then
        new.approved_at := now();
      end if;
    end if;

    return new;
  end if;

  raise exception 'borrow_request: unhandled transition % -> %', old.status, new.status;
end;
$$;

-- ============================================================================
-- 6. consumable_request — BEFORE UPDATE
--    Same shape: preserve 0005 rules + auto-populate attribution on approve.
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

  if old.status = 'PENDING_PICKUP' and new.status = 'APPROVED' then
    if new.approved_by is null then
      new.approved_by := auth.uid();
    end if;
    if new.approved_at is null then
      new.approved_at := now();
    end if;
  end if;

  return new;
end;
$$;
