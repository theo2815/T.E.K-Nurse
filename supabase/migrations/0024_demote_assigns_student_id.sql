-- T.E.K Nurse — 0024_demote_assigns_student_id.sql
-- Bug fix: invited-as-staff accounts cannot be demoted to student.
--
-- Background:
--   0017 added the users_student_must_have_id CHECK:
--     (role = 'student' AND student_id IS NOT NULL) OR role <> 'student'
--
--   0021's demote_to_student sets role='student' and staff_id=null but never
--   touches student_id. That worked while every staff row had been promoted
--   from a real student account (their original student_id survived the
--   promotion). 0023 broke the invariant by introducing the staff-invite
--   path: invited staff rows are created with student_id=null, so demoting
--   one violates the CHECK and the RPC raises 23514.
--
-- Fix:
--   demote_to_student now assigns a 00-0000-NNN placeholder when the target
--   has no student_id — same pattern handle_new_user uses for student rows
--   missing a real ID. Targets that already have a student_id (promoted from
--   student earlier) keep their original ID so demotion is a true round-trip.
--
-- Placeholder format: 00-0000-NNN (matching 0017 and 0023). Operators edit
-- these post-demote via the admin users page or the SQL Editor.
--
-- Race note: max(...)+1 is the same non-locking pattern used by
-- handle_new_user and promote_to_staff. Two concurrent demotes could compute
-- the same placeholder; the partial unique index users_student_id_unique
-- will reject the second one, which surfaces as a 23505 the admin retries.
-- Acceptable for v1 admin-frequency workload.

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
  v_new_student_id text;
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

  select id, role, staff_id, student_id into v_target
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
  v_new_student_id := v_target.student_id;

  -- Assign next 00-0000-NNN placeholder only when missing. Preserving an
  -- existing student_id makes promote → demote a clean round-trip.
  if v_new_student_id is null then
    select '00-0000-' || lpad(
      (coalesce(
        (select max(substring(student_id from 9)::int)
           from public.users
          where student_id ~ '^00-0000-\d{3}$'),
        0) + 1)::text,
      3, '0')
      into v_new_student_id;
  end if;

  update public.users
    set role = 'student',
        staff_id = null,
        student_id = v_new_student_id
    where id = p_user_id;

  perform public.write_audit_log(
    'user_demoted_to_student',
    'users',
    p_user_id,
    jsonb_build_object(
      'role', 'staff',
      'staff_id', v_old_staff_id,
      'student_id', v_target.student_id
    ),
    jsonb_build_object(
      'role', 'student',
      'staff_id', null,
      'student_id', v_new_student_id
    ),
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
