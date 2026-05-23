-- T.E.K Nurse — 0015_student_suspension.sql
-- Staff "Suspend student" capability.
--
-- 1. assert_student_can_borrow(uuid)
--      Single funnel that raises the right error for either case:
--      account suspended (is_active=false) OR has overdue items.
--      Replaces the bare student_has_overdue() checks in three triggers
--      so a suspended student is blocked at the DB layer, not just the UI.
--
-- 2. suspend_student / reinstate_student RPCs
--      SECURITY DEFINER, staff-only, single-transaction:
--        flip users.is_active → write audit_log → enqueue email + notification.
--
-- 3. get_student_suspension_history(uuid)
--      SECURITY DEFINER reader so the staff-side query layer doesn't need
--      direct SELECT on audit_log (audit_log has FORCE RLS).
--
-- Audit shape:
--   action_type = 'STUDENT_SUSPENDED' | 'STUDENT_REINSTATED'
--   entity_type = 'users'
--   entity_id   = the student's user id
--   notes       = staff-written reason (suspend) or note (reinstate)
--   before/after = { "is_active": bool }
--
-- No new `student_suspensions` table — audit_log already records
-- who/when/why and persists across reinstates.

-- ============================================================================
-- assert_student_can_borrow
--   PROCEDURE-LIKE: raises on the first failing condition. Combines the
--   existing overdue gate with the new account-active gate.
-- ============================================================================

create or replace function public.assert_student_can_borrow(p_student_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_is_active boolean;
begin
  select is_active into v_is_active
  from public.users
  where id = p_student_id;

  if not coalesce(v_is_active, false) then
    raise exception 'Student account is suspended and cannot borrow or use consumables'
      using errcode = 'check_violation';
  end if;

  if public.student_has_overdue(p_student_id) then
    raise exception 'Student has overdue items and cannot borrow new ones'
      using errcode = 'check_violation';
  end if;
end;
$$;

-- ============================================================================
-- assert_student_active
--   Narrower gate: only checks suspension. Used for pre-approved pickups
--   where staff already cleared the request; we still want to block pickup
--   if the student was suspended in the meantime, but we DON'T want to
--   re-litigate overdue status (that's a different conversation).
-- ============================================================================

create or replace function public.assert_student_active(p_student_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_is_active boolean;
begin
  select is_active into v_is_active
  from public.users
  where id = p_student_id;

  if not coalesce(v_is_active, false) then
    raise exception 'Student account is suspended and cannot pick up reserved items'
      using errcode = 'check_violation';
  end if;
end;
$$;

-- ============================================================================
-- Trigger updates: swap student_has_overdue() → assert_student_can_borrow()
--   at the four call sites in 0003. Full function bodies are re-stated below
--   so the migration is self-contained (CREATE OR REPLACE on top of 0003).
-- ============================================================================

-- borrow_request — INSERT
create or replace function public.tr_borrow_request_after_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.assert_student_can_borrow(new.student_id);

  update public.equipment_sku
    set available_units = available_units - new.quantity,
        reserved_units  = reserved_units  + new.quantity
    where id = new.equipment_sku_id;

  perform public.write_audit_log(
    'borrow_request_submitted',
    'borrow_request',
    new.id,
    null,
    to_jsonb(new)
  );

  perform public.notify_all_staff(
    'borrow_request_new',
    'New borrow request',
    'A student submitted a new borrow request.',
    '/staff/requests/' || new.id::text
  );

  return new;
end;
$$;

-- borrow_transaction — AFTER INSERT (walk-in branch only)
create or replace function public.tr_borrow_transaction_after_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.source_request_id is null then
    perform public.assert_student_can_borrow(new.student_id);

    update public.equipment_sku
      set available_units = available_units - new.quantity,
          borrowed_units  = borrowed_units  + new.quantity
      where id = new.equipment_sku_id;

    perform public.write_audit_log(
      'walk_in_borrow', 'borrow_transaction', new.id, null, to_jsonb(new)
    );
    perform public.enqueue_notification(
      new.student_id, 'borrow_confirm', 'Equipment borrowed',
      'You borrowed ' || new.quantity || ' unit(s). Expected return: ' || new.expected_return_date,
      '/student/history'
    );
    perform public.enqueue_email(new.student_id, 'borrow_confirm',
      jsonb_build_object('transaction_id', new.id, 'quantity', new.quantity,
                         'expected_return_date', new.expected_return_date));
  else
    -- Pre-approved pickup: counts already moved by request trigger. Still
    -- block if the student was suspended between approval and pickup; the
    -- overdue gate is intentionally NOT re-checked here.
    perform public.assert_student_active(new.student_id);
    perform public.write_audit_log(
      'borrow_pickup', 'borrow_transaction', new.id, null, to_jsonb(new)
    );
  end if;

  return new;
end;
$$;

-- consumable_request — AFTER INSERT
create or replace function public.tr_consumable_request_after_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.assert_student_can_borrow(new.student_id);

  perform public.write_audit_log(
    'consumable_request_submitted', 'consumable_request', new.id, null, to_jsonb(new)
  );
  perform public.notify_all_staff(
    'consumable_request_new', 'New consumable request',
    'A student requested consumables.',
    '/staff/requests/c/' || new.id::text
  );
  return new;
end;
$$;

-- consumable_usage — AFTER INSERT (walk-in branch only) — also restates the
-- existing FIFO body because CREATE OR REPLACE needs the full function.
create or replace function public.tr_consumable_usage_after_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  remaining int := new.quantity_used;
  v_take    int;
  v_lot     record;
  v_total   int;
  v_thresh  int;
  v_sku     public.consumable_sku%rowtype;
begin
  if new.source_request_id is null then
    perform public.assert_student_can_borrow(new.student_id);
  else
    -- Pre-approved consumable pickup: block if suspended, allow if just overdue.
    perform public.assert_student_active(new.student_id);
  end if;

  for v_lot in
    select id, quantity_remaining
    from public.consumable_lot
    where consumable_sku_id = new.consumable_sku_id
      and is_depleted = false
      and quantity_remaining > 0
    order by expiration_date asc, received_date asc
    for update
  loop
    exit when remaining <= 0;
    v_take := least(remaining, v_lot.quantity_remaining);

    insert into public.consumable_usage_lot_deduction
      (consumable_usage_id, lot_id, quantity_deducted)
    values (new.id, v_lot.id, v_take);

    update public.consumable_lot
      set quantity_remaining = quantity_remaining - v_take,
          is_depleted = (quantity_remaining - v_take = 0)
      where id = v_lot.id;

    remaining := remaining - v_take;
  end loop;

  if remaining > 0 then
    raise exception 'Insufficient consumable stock for sku % (short by %)',
      new.consumable_sku_id, remaining
      using errcode = 'check_violation';
  end if;

  -- Low-stock alert
  select * into v_sku from public.consumable_sku where id = new.consumable_sku_id;
  v_thresh := v_sku.low_stock_threshold;
  select coalesce(sum(quantity_remaining), 0) into v_total
  from public.consumable_lot
  where consumable_sku_id = new.consumable_sku_id and is_depleted = false;

  if v_total <= v_thresh then
    perform public.notify_all_staff(
      'consumable_low_stock',
      'Consumable running low',
      v_sku.name || ' has ' || v_total || ' ' || v_sku.unit || '(s) left.',
      '/staff/inventory/consumables/' || v_sku.qr_code
    );
  end if;

  if new.source_request_id is null then
    perform public.write_audit_log(
      'walk_in_usage', 'consumable_usage', new.id, null, to_jsonb(new)
    );
    perform public.enqueue_notification(
      new.student_id, 'consumable_confirm', 'Consumable used',
      'You used ' || new.quantity_used || ' ' || v_sku.unit || '(s) of ' || v_sku.name,
      '/student/history'
    );
    perform public.enqueue_email(new.student_id, 'consumable_confirm',
      jsonb_build_object(
        'usage_id', new.id,
        'sku', v_sku.name,
        'quantity', new.quantity_used
      ));
  end if;

  return new;
end;
$$;

-- ============================================================================
-- suspend_student
--   Staff-only. Flips is_active → false, writes audit row with the reason,
--   enqueues the student-facing email (optional) + in-app notification.
-- ============================================================================

create or replace function public.suspend_student(
  p_student_id uuid,
  p_reason     text,
  p_send_email boolean default true
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := auth.uid();
  v_target record;
  v_reason text := trim(coalesce(p_reason, ''));
begin
  if v_actor is null then
    raise exception 'suspend_student: no auth context' using errcode = '42501';
  end if;

  if not public.is_staff() then
    raise exception 'Only staff can suspend students' using errcode = '42501';
  end if;

  if v_actor = p_student_id then
    raise exception 'You cannot suspend your own account'
      using errcode = 'check_violation';
  end if;

  if length(v_reason) < 3 then
    raise exception 'A reason of at least 3 characters is required'
      using errcode = 'check_violation';
  end if;

  select id, role, is_active into v_target
  from public.users
  where id = p_student_id;

  if not found then
    raise exception 'Student not found' using errcode = 'no_data_found';
  end if;

  if v_target.role <> 'student' then
    raise exception 'suspend_student only applies to student accounts (role=%)', v_target.role
      using errcode = 'check_violation';
  end if;

  if v_target.is_active = false then
    raise exception 'Student is already suspended'
      using errcode = 'check_violation';
  end if;

  update public.users
    set is_active = false
    where id = p_student_id;

  perform public.write_audit_log(
    'STUDENT_SUSPENDED',
    'users',
    p_student_id,
    jsonb_build_object('is_active', true),
    jsonb_build_object('is_active', false),
    v_reason
  );

  perform public.enqueue_notification(
    p_student_id,
    'student_suspended',
    'Your borrowing access is paused',
    v_reason,
    null
  );

  if p_send_email then
    perform public.enqueue_email(
      p_student_id,
      'student_suspended',
      jsonb_build_object('reason', v_reason)
    );
  end if;
end;
$$;

revoke all on function public.suspend_student(uuid, text, boolean) from public;
grant execute on function public.suspend_student(uuid, text, boolean) to authenticated;

-- ============================================================================
-- reinstate_student
--   Staff-only. Flips is_active → true, writes audit, optional email + notif.
-- ============================================================================

create or replace function public.reinstate_student(
  p_student_id uuid,
  p_note       text,
  p_send_email boolean default true
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := auth.uid();
  v_target record;
  v_note text := nullif(trim(coalesce(p_note, '')), '');
begin
  if v_actor is null then
    raise exception 'reinstate_student: no auth context' using errcode = '42501';
  end if;

  if not public.is_staff() then
    raise exception 'Only staff can reinstate students' using errcode = '42501';
  end if;

  select id, role, is_active into v_target
  from public.users
  where id = p_student_id;

  if not found then
    raise exception 'Student not found' using errcode = 'no_data_found';
  end if;

  if v_target.role <> 'student' then
    raise exception 'reinstate_student only applies to student accounts (role=%)', v_target.role
      using errcode = 'check_violation';
  end if;

  if v_target.is_active = true then
    raise exception 'Student is already active'
      using errcode = 'check_violation';
  end if;

  update public.users
    set is_active = true
    where id = p_student_id;

  perform public.write_audit_log(
    'STUDENT_REINSTATED',
    'users',
    p_student_id,
    jsonb_build_object('is_active', false),
    jsonb_build_object('is_active', true),
    v_note
  );

  perform public.enqueue_notification(
    p_student_id,
    'student_reinstated',
    'Your borrowing access is restored',
    coalesce(v_note, 'You can borrow equipment and request consumables again.'),
    null
  );

  if p_send_email then
    perform public.enqueue_email(
      p_student_id,
      'student_reinstated',
      jsonb_build_object('note', coalesce(v_note, ''))
    );
  end if;
end;
$$;

revoke all on function public.reinstate_student(uuid, text, boolean) from public;
grant execute on function public.reinstate_student(uuid, text, boolean) to authenticated;

-- ============================================================================
-- get_student_suspension_history
--   SECURITY DEFINER reader. Returns chronological suspension/reinstate events
--   for a student, joined with the actor's full_name. Staff-only.
-- ============================================================================

create or replace function public.get_student_suspension_history(p_student_id uuid)
returns table (
  id          uuid,
  occurred_at timestamptz,
  action_type text,
  reason      text,
  actor_id    uuid,
  actor_name  text
)
language sql
security definer
set search_path = public
stable
as $$
  select
    al.id,
    al.timestamp     as occurred_at,
    al.action_type,
    al.notes         as reason,
    al.actor_id,
    u.full_name      as actor_name
  from public.audit_log al
  left join public.users u on u.id = al.actor_id
  where al.entity_type = 'users'
    and al.entity_id = p_student_id
    and al.action_type in ('STUDENT_SUSPENDED', 'STUDENT_REINSTATED')
    and public.is_staff()
  order by al.timestamp desc;
$$;

revoke all on function public.get_student_suspension_history(uuid) from public;
grant execute on function public.get_student_suspension_history(uuid) to authenticated;

-- ============================================================================
-- get_latest_suspension
--   Helper for the profile header: returns the most recent SUSPENDED event
--   for a student that has NOT yet been paired with a REINSTATED event.
--   Returns no rows if the student is currently active.
-- ============================================================================

create or replace function public.get_latest_suspension(p_student_id uuid)
returns table (
  reason            text,
  suspended_at      timestamptz,
  suspended_by_id   uuid,
  suspended_by_name text
)
language sql
security definer
set search_path = public
stable
as $$
  with latest as (
    select
      al.id,
      al.timestamp,
      al.action_type,
      al.notes,
      al.actor_id
    from public.audit_log al
    where al.entity_type = 'users'
      and al.entity_id = p_student_id
      and al.action_type in ('STUDENT_SUSPENDED', 'STUDENT_REINSTATED')
    order by al.timestamp desc
    limit 1
  )
  select
    l.notes        as reason,
    l.timestamp    as suspended_at,
    l.actor_id     as suspended_by_id,
    u.full_name    as suspended_by_name
  from latest l
  left join public.users u on u.id = l.actor_id
  where l.action_type = 'STUDENT_SUSPENDED'
    -- Staff can read any student's latest suspension; a student can read
    -- their own (so the paused-account interstitial can show the reason).
    and (public.is_staff() or auth.uid() = p_student_id);
$$;

revoke all on function public.get_latest_suspension(uuid) from public;
grant execute on function public.get_latest_suspension(uuid) to authenticated;
