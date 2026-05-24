-- T.E.K Nurse — 0021_admin_rpcs.sql
-- Phase 11.5d. Admin role helpers and promote/demote RPCs.
--
-- Apply AFTER 0020_admin_role.sql (the enum value 'admin' must already exist
-- in the same database before any statement here can reference it).
--
-- Four pieces:
--   1. is_staff() — expanded to include admin (admin can do everything staff can)
--   2. is_admin() — new helper, used by the user-management page's server gate
--   3. promote_to_staff(p_user_id, p_note, p_notify_email)
--        - student → staff
--        - assigns the next available TEK-NNN
--        - writes audit row, fires in-app notification, optionally enqueues email
--   4. demote_to_student(p_user_id, p_note, p_notify_email)
--        - staff → student (NOT admin → student; admins are locked)
--        - NULLs the staff_id (TEK-NNN is freed, not reused)
--        - writes audit row, fires in-app notification, optionally enqueues email
--
-- Both RPCs:
--   - require auth.uid() to be an admin (is_admin())
--   - block self-modification (cannot promote/demote yourself)
--   - emit snake_case lowercase audit action_types per the post-0016 convention
--   - GRANT EXECUTE to authenticated only — the is_admin() check inside the
--     function body is the actual gate; the grant just lets PostgREST call it.

-- ============================================================================
-- 1. is_staff() — admin is a strict superset, so it returns true for both.
-- ============================================================================

create or replace function public.is_staff()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.users
    where id = auth.uid()
      and role in ('staff', 'admin')
      and is_active = true
  );
$$;

-- ============================================================================
-- 2. is_admin() — used by /staff/admin/users server gate + RPC self-gate.
-- ============================================================================

create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.users
    where id = auth.uid()
      and role = 'admin'
      and is_active = true
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

-- ============================================================================
-- 3. promote_to_staff
--    Student → staff. Assigns the next available TEK-NNN by taking the
--    monotonically-next integer past max(TEK-NNN). Gaps from prior demotions
--    do NOT get refilled — this keeps the model "TEK-NNN counts forward,
--    nobody inherits a former staff's ID."
-- ============================================================================

create or replace function public.promote_to_staff(
  p_user_id      uuid,
  p_note         text default null,
  p_notify_email boolean default true
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
  v_next_id text;
begin
  if v_actor is null then
    raise exception 'promote_to_staff: no auth context' using errcode = '42501';
  end if;

  if not public.is_admin() then
    raise exception 'Only admins can promote users' using errcode = '42501';
  end if;

  if v_actor = p_user_id then
    raise exception 'You cannot change your own role'
      using errcode = 'check_violation';
  end if;

  select id, role, staff_id, is_active into v_target
  from public.users
  where id = p_user_id;

  if not found then
    raise exception 'User not found' using errcode = 'no_data_found';
  end if;

  if v_target.role <> 'student' then
    raise exception 'promote_to_staff only applies to students (role=%)', v_target.role
      using errcode = 'check_violation';
  end if;

  if not coalesce(v_target.is_active, false) then
    raise exception 'Cannot promote a suspended account — reinstate first'
      using errcode = 'check_violation';
  end if;

  -- Compute next TEK-NNN.
  select 'TEK-' || lpad(
    (coalesce(
      (select max(substring(staff_id from 5)::int)
         from public.users
        where staff_id ~ '^TEK-\d{3}$'),
      0) + 1)::text,
    3, '0')
    into v_next_id;

  update public.users
    set role = 'staff',
        staff_id = v_next_id
    where id = p_user_id;

  perform public.write_audit_log(
    'user_promoted_to_staff',
    'users',
    p_user_id,
    jsonb_build_object('role', 'student', 'staff_id', null),
    jsonb_build_object('role', 'staff',   'staff_id', v_next_id),
    v_note
  );

  perform public.enqueue_notification(
    p_user_id,
    'staff_promoted',
    'You are now staff',
    'An admin promoted your account to staff. You can now approve requests, scan equipment, and manage inventory.',
    '/staff/home'
  );

  if p_notify_email then
    perform public.enqueue_email(
      p_user_id,
      'staff_promoted',
      jsonb_build_object('note', coalesce(v_note, ''), 'staff_id', v_next_id)
    );
  end if;
end;
$$;

revoke all on function public.promote_to_staff(uuid, text, boolean) from public;
grant execute on function public.promote_to_staff(uuid, text, boolean) to authenticated;

-- ============================================================================
-- 4. demote_to_student
--    Staff → student. NULLs the staff_id (per Phase 11.5d decision: TEK-NNN
--    is freed, not preserved; re-promotion gets a fresh next-in-sequence ID).
--    Admins are explicitly NOT demotable through this RPC — they're locked.
-- ============================================================================

create or replace function public.demote_to_student(
  p_user_id      uuid,
  p_note         text default null,
  p_notify_email boolean default true
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
  v_old_staff_id text;
begin
  if v_actor is null then
    raise exception 'demote_to_student: no auth context' using errcode = '42501';
  end if;

  if not public.is_admin() then
    raise exception 'Only admins can demote users' using errcode = '42501';
  end if;

  if v_actor = p_user_id then
    raise exception 'You cannot change your own role'
      using errcode = 'check_violation';
  end if;

  select id, role, staff_id into v_target
  from public.users
  where id = p_user_id;

  if not found then
    raise exception 'User not found' using errcode = 'no_data_found';
  end if;

  if v_target.role = 'admin' then
    raise exception 'Admin accounts cannot be demoted'
      using errcode = 'check_violation';
  end if;

  if v_target.role <> 'staff' then
    raise exception 'demote_to_student only applies to staff (role=%)', v_target.role
      using errcode = 'check_violation';
  end if;

  v_old_staff_id := v_target.staff_id;

  update public.users
    set role = 'student',
        staff_id = null
    where id = p_user_id;

  perform public.write_audit_log(
    'user_demoted_to_student',
    'users',
    p_user_id,
    jsonb_build_object('role', 'staff',   'staff_id', v_old_staff_id),
    jsonb_build_object('role', 'student', 'staff_id', null),
    v_note
  );

  perform public.enqueue_notification(
    p_user_id,
    'staff_demoted',
    'Your account is now a student account',
    'An admin moved your account back to the student role. You can still borrow equipment and request consumables.',
    '/student/home'
  );

  if p_notify_email then
    perform public.enqueue_email(
      p_user_id,
      'staff_demoted',
      jsonb_build_object('note', coalesce(v_note, ''))
    );
  end if;
end;
$$;

revoke all on function public.demote_to_student(uuid, text, boolean) from public;
grant execute on function public.demote_to_student(uuid, text, boolean) to authenticated;
