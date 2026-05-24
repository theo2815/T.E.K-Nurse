-- T.E.K Nurse — 0023_staff_invites.sql
-- Phase 11.5d-inv. Adds the staff-invite flow.
--
-- Architecture:
-- Admin clicks "Invite staff" in /staff/admin/users → a server action calls
-- Supabase's admin API (auth.admin.generateLink({type:'invite', ...})) which
-- creates an auth.users row with no password and raw_user_meta_data
-- containing {full_name, pending_role:'staff'}. That insert fires the
-- on_auth_user_created → handle_new_user trigger redefined here, which now:
--   - if pending_role = 'staff'  → land them as staff with auto-assigned
--                                  TEK-NNN and invited_at = now()
--   - otherwise                  → same as 0022 (student + placeholder ID)
--
-- The invitee shows up in the admin users table immediately with a "Pending"
-- chip until they accept. On accept, /accept-invite calls
-- mark_invite_accepted() which stamps invite_accepted_at = now().
--
-- TEK-NNN is assigned at invite time. If the invitee never accepts, the
-- staff_id is "burned" — gaps don't refill (same policy as demotions). Admin
-- can cancel a pending invite via /staff/admin/users which deletes the
-- auth.users row; the ON DELETE CASCADE on public.users.id removes the row.

-- ============================================================================
-- 1. Pending-invite columns.
-- ============================================================================

alter table public.users
  add column if not exists invited_at timestamptz;

alter table public.users
  add column if not exists invite_accepted_at timestamptz;

-- Partial index for the "show me all pending invites" filter on the admin
-- users page. Tiny table for now, but right shape for v2 scale.
create index if not exists users_pending_invite_idx
  on public.users (invited_at)
  where invite_accepted_at is null and invited_at is not null;

-- ============================================================================
-- 2. handle_new_user trigger: extend for pending_role='staff'.
--    Keeps 0022's student-placeholder branch for Dashboard creates and the
--    /signup form path.
-- ============================================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  v_student_id text := nullif(meta ->> 'student_id', '');
  v_pending_role text := nullif(meta ->> 'pending_role', '');
  v_full_name text := coalesce(
    nullif(meta ->> 'full_name', ''),
    split_part(new.email, '@', 1)
  );
  v_next_staff_id text;
begin
  -- Staff invite branch: skip the student placeholder, assign TEK-NNN, stamp
  -- invited_at. The admin server action verified the email is unique and
  -- @cit.edu before calling generateLink.
  if v_pending_role = 'staff' then
    select 'TEK-' || lpad(
      (coalesce(
        (select max(substring(staff_id from 5)::int)
           from public.users
          where staff_id ~ '^TEK-\d{3}$'),
        0) + 1)::text,
      3, '0')
      into v_next_staff_id;

    insert into public.users (
      id, email, full_name, role, staff_id, student_id, invited_at
    )
    values (
      new.id,
      new.email,
      v_full_name,
      'staff',
      v_next_staff_id,
      null,
      now()
    );
    return new;
  end if;

  -- Default branch: student with provided ID or auto-assigned placeholder.
  if v_student_id is null then
    select '00-0000-' || lpad(
      (coalesce(
        (select max(substring(student_id from 9)::int)
           from public.users
          where student_id ~ '^00-0000-\d{3}$'),
        0) + 1)::text,
      3, '0')
      into v_student_id;
  end if;

  insert into public.users (id, email, full_name, student_id)
  values (new.id, new.email, v_full_name, v_student_id);
  return new;
end;
$$;

-- ============================================================================
-- 3. enqueue_email: add staff_invite to critical_templates.
--    Invitees haven't set a preference yet, but even later, the invite is an
--    account-state message they must receive to use the system.
-- ============================================================================

create or replace function public.enqueue_email(
  p_user_id  uuid,
  p_template text,
  p_payload  jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  critical_templates text[] := array[
    'student_suspended',
    'student_reinstated',
    'staff_promoted',
    'staff_demoted',
    'staff_invite'
  ];
  prefers_email boolean;
begin
  if p_template = any (critical_templates) then
    insert into public.pending_email (to_email, to_user_id, template, payload)
    select u.email, u.id, p_template, coalesce(p_payload, '{}'::jsonb)
      from public.users u
     where u.id = p_user_id;
    return;
  end if;

  select email_notifications_enabled
    into prefers_email
    from public.users
   where id = p_user_id;

  if coalesce(prefers_email, true) then
    insert into public.pending_email (to_email, to_user_id, template, payload)
    select u.email, u.id, p_template, coalesce(p_payload, '{}'::jsonb)
      from public.users u
     where u.id = p_user_id;
  end if;
end;
$$;

-- ============================================================================
-- 4. mark_invite_accepted RPC.
--    Called by /auth/accept-invite after the invitee sets their password.
--    Only flips the flag for the currently authenticated user — there's no
--    parameter to prevent admin acceptance on behalf of someone else.
-- ============================================================================

create or replace function public.mark_invite_accepted()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := auth.uid();
begin
  if v_actor is null then
    raise exception 'mark_invite_accepted: no auth context'
      using errcode = '42501';
  end if;

  update public.users
     set invite_accepted_at = now()
   where id = v_actor
     and invited_at is not null
     and invite_accepted_at is null;
  -- Silent no-op if the user wasn't invited or already accepted; the page
  -- gates separately and we don't want to surface a confusing error if the
  -- invitee refreshes after acceptance.
end;
$$;

revoke all on function public.mark_invite_accepted() from public;
grant execute on function public.mark_invite_accepted() to authenticated;
