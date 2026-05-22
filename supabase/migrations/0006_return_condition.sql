-- T.E.K Nurse — 0006_return_condition.sql
-- Adds Good / Damaged / Lost-on-return outcomes for borrow returns.
--
-- Previously every return routed units back to available_units. Staff can
-- now record the physical condition at the counter, and the unit count is
-- routed accordingly:
--   GOOD            -> available_units (existing behavior)
--   DAMAGED         -> maintenance_units (flagged for repair)
--   LOST_ON_RETURN  -> lost_units      (student admits it at return time;
--                                       distinct from the existing LOST
--                                       status which is "lost while still
--                                       on active borrow").
--
-- The BEFORE UPDATE trigger gains a defensive default so legacy code paths
-- that don't pass return_condition keep working as GOOD returns.

-- ============================================================================
-- 1. Enum
-- ============================================================================

create type public.return_condition as enum (
  'GOOD',
  'DAMAGED',
  'LOST_ON_RETURN'
);

-- ============================================================================
-- 2. Column — nullable so the backfill below can run before the constraint.
-- ============================================================================

alter table public.borrow_transaction
  add column return_condition public.return_condition;

-- ============================================================================
-- 3. Backfill — every historical closed return was effectively GOOD because
--    no other outcome was selectable.
-- ============================================================================

update public.borrow_transaction
  set return_condition = 'GOOD'
  where status in ('RETURNED', 'RETURNED_LATE')
    and return_condition is null;

-- ============================================================================
-- 4. Consistency constraint — return_condition is set iff the transaction is
--    in a terminal-return status. Active rows (BORROWED, OVERDUE, LOST) keep
--    it null.
-- ============================================================================

alter table public.borrow_transaction
  add constraint borrow_transaction_return_condition_consistency check (
    (status in ('RETURNED', 'RETURNED_LATE') and return_condition is not null)
    or (status not in ('RETURNED', 'RETURNED_LATE') and return_condition is null)
  );

-- ============================================================================
-- 5. Partial index for audit / reporting queries on damaged + lost returns.
-- ============================================================================

create index borrow_transaction_return_condition_idx
  on public.borrow_transaction (return_condition)
  where return_condition is not null;

-- ============================================================================
-- 6. BEFORE UPDATE — keep existing transition rules, add a defensive default
--    so updates that set status to RETURNED|RETURNED_LATE without specifying
--    return_condition behave as GOOD (legacy code, plus the LOST→RETURNED_LATE
--    "we found it" recovery path).
-- ============================================================================

create or replace function public.tr_borrow_transaction_before_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.status = new.status then
    return new;
  end if;

  -- Allowed transitions (unchanged):
  --   BORROWED      -> RETURNED | OVERDUE | LOST
  --   OVERDUE       -> RETURNED_LATE | LOST
  --   LOST          -> RETURNED_LATE  (manual revert)
  --   RETURNED, RETURNED_LATE -> (terminal)
  if old.status in ('RETURNED', 'RETURNED_LATE') then
    raise exception 'borrow_transaction.status is terminal: % cannot change', old.status;
  end if;

  if not (
       (old.status = 'BORROWED' and new.status in ('RETURNED', 'OVERDUE', 'LOST'))
    or (old.status = 'OVERDUE'  and new.status in ('RETURNED_LATE', 'LOST'))
    or (old.status = 'LOST'     and new.status = 'RETURNED_LATE')
  ) then
    raise exception 'borrow_transaction: invalid transition % -> %', old.status, new.status;
  end if;

  -- Stamp returned_at / returned_to defaults if the client didn't.
  if new.status in ('RETURNED', 'RETURNED_LATE') and new.returned_at is null then
    new.returned_at := now();
  end if;
  if new.status in ('RETURNED', 'RETURNED_LATE') and new.returned_to is null then
    new.returned_to := auth.uid();
  end if;

  -- Default return_condition to GOOD when transitioning into a terminal
  -- return state without one set. Required so the consistency constraint
  -- passes for legacy callers and the LOST -> RETURNED_LATE recovery path.
  if new.status in ('RETURNED', 'RETURNED_LATE') and new.return_condition is null then
    new.return_condition := 'GOOD';
  end if;

  return new;
end;
$$;

-- ============================================================================
-- 7. AFTER UPDATE — route the unit count by return_condition on terminal
--    returns. Audit + notification text branch on condition too.
-- ============================================================================

create or replace function public.tr_borrow_transaction_after_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.status = new.status then
    return new;
  end if;

  if old.status in ('BORROWED', 'OVERDUE') and new.status in ('RETURNED', 'RETURNED_LATE') then
    -- Route the units off borrowed_units to whichever shelf matches the
    -- recorded physical condition.
    if new.return_condition = 'DAMAGED' then
      update public.equipment_sku
        set borrowed_units    = borrowed_units    - old.quantity,
            maintenance_units = maintenance_units + old.quantity
        where id = new.equipment_sku_id;
    elsif new.return_condition = 'LOST_ON_RETURN' then
      update public.equipment_sku
        set borrowed_units = borrowed_units - old.quantity,
            lost_units     = lost_units     + old.quantity
        where id = new.equipment_sku_id;
    else
      -- GOOD (or null, defensively) — back to available shelf.
      update public.equipment_sku
        set borrowed_units  = borrowed_units  - old.quantity,
            available_units = available_units + old.quantity
        where id = new.equipment_sku_id;
    end if;

    perform public.write_audit_log(
      'return_logged_' || lower(coalesce(new.return_condition::text, 'good')),
      'borrow_transaction', new.id, to_jsonb(old), to_jsonb(new)
    );

    -- Student-facing notification + email vary by outcome.
    if new.return_condition = 'DAMAGED' then
      perform public.enqueue_notification(
        new.student_id, 'return_damaged', 'Return logged (flagged for maintenance)',
        'Your item was returned and flagged for maintenance.', '/student/history'
      );
      perform public.enqueue_email(new.student_id, 'return_damaged',
        jsonb_build_object('transaction_id', new.id));
    elsif new.return_condition = 'LOST_ON_RETURN' then
      perform public.enqueue_notification(
        new.student_id, 'return_lost', 'Item reported lost',
        'You reported this item as lost at return. Please contact the lab if recovered.',
        '/student/history'
      );
      perform public.enqueue_email(new.student_id, 'return_lost',
        jsonb_build_object('transaction_id', new.id));
    else
      perform public.enqueue_notification(
        new.student_id, 'return_confirm', 'Return logged',
        'Thanks — your item has been logged as returned.', '/student/history'
      );
      perform public.enqueue_email(new.student_id, 'return_confirm',
        jsonb_build_object('transaction_id', new.id));
    end if;

  elsif old.status = 'LOST' and new.status = 'RETURNED_LATE' then
    -- "We found it" recovery — pull from lost_units back to available_units.
    update public.equipment_sku
      set lost_units      = lost_units      - old.quantity,
          available_units = available_units + old.quantity
      where id = new.equipment_sku_id;

    perform public.write_audit_log(
      'lost_item_returned', 'borrow_transaction', new.id, to_jsonb(old), to_jsonb(new)
    );

  elsif old.status = 'BORROWED' and new.status = 'OVERDUE' then
    perform public.write_audit_log(
      'marked_overdue', 'borrow_transaction', new.id, to_jsonb(old), to_jsonb(new)
    );
    perform public.enqueue_notification(
      new.student_id, 'overdue_reminder', 'Item overdue',
      'Please return your borrowed item as soon as possible.', '/student/history'
    );
    perform public.enqueue_email(new.student_id, 'overdue_reminder',
      jsonb_build_object('transaction_id', new.id, 'expected_return_date', new.expected_return_date));

  elsif old.status in ('BORROWED', 'OVERDUE') and new.status = 'LOST' then
    update public.equipment_sku
      set borrowed_units = borrowed_units - old.quantity,
          lost_units     = lost_units     + old.quantity
      where id = new.equipment_sku_id;

    perform public.write_audit_log(
      'marked_lost', 'borrow_transaction', new.id, to_jsonb(old), to_jsonb(new)
    );
    perform public.enqueue_notification(
      new.student_id, 'marked_lost', 'Item marked lost',
      'Your borrowed item has been marked as lost. Please contact the lab.', '/student/history'
    );
    perform public.enqueue_email(new.student_id, 'marked_lost',
      jsonb_build_object('transaction_id', new.id));
  end if;

  return new;
end;
$$;
