-- T.E.K Nurse — 0016_normalize_suspension_audit_casing.sql
-- Pre-Phase-11 cleanup. The 4 trigger-side action_type values in 0015
-- (STUDENT_SUSPENDED, STUDENT_REINSTATED) are uppercase; every other
-- audit row written by 0003 / 0005 / 0009 / 0010 / 0013 uses lowercase
-- snake_case. Phase 11's audit-log UI needs a single normalized label
-- set, so fix the casing at the source rather than papering over it in
-- the query layer.
--
-- This migration:
--   1. backfills existing rows                       (UPDATE audit_log)
--   2. replaces suspend_student  to write lowercase  (CREATE OR REPLACE)
--   3. replaces reinstate_student to write lowercase (CREATE OR REPLACE)
--   4. replaces get_latest_suspension to read lowercase
--   5. replaces get_student_suspension_history to read lowercase
--
-- Idempotent: re-running is a no-op (the UPDATE matches zero rows on
-- the second pass; CREATE OR REPLACE re-installs identical function
-- bodies). Safe to apply on a fresh project or on top of existing
-- production data.

-- ============================================================================
-- 1) Backfill existing audit rows
-- ============================================================================

update public.audit_log
   set action_type = lower(action_type)
 where action_type in ('STUDENT_SUSPENDED', 'STUDENT_REINSTATED');

-- ============================================================================
-- 2) suspend_student — write lowercase 'student_suspended'
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
    'student_suspended',
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
-- 3) reinstate_student — write lowercase 'student_reinstated'
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
    'student_reinstated',
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
-- 4) get_student_suspension_history — read lowercase action_types
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
    and al.action_type in ('student_suspended', 'student_reinstated')
    and public.is_staff()
  order by al.timestamp desc;
$$;

revoke all on function public.get_student_suspension_history(uuid) from public;
grant execute on function public.get_student_suspension_history(uuid) to authenticated;

-- ============================================================================
-- 5) get_latest_suspension — read lowercase action_types
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
      and al.action_type in ('student_suspended', 'student_reinstated')
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
  where l.action_type = 'student_suspended'
    -- Staff can read any student's latest suspension; a student can read
    -- their own (so the paused-account interstitial can show the reason).
    and (public.is_staff() or auth.uid() = p_student_id);
$$;

revoke all on function public.get_latest_suspension(uuid) from public;
grant execute on function public.get_latest_suspension(uuid) to authenticated;
