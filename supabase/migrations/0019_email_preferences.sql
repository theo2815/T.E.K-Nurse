-- T.E.K Nurse — 0019_email_preferences.sql
-- Phase 11.5c-rev3. Adds a per-user email-notifications preference so users
-- can opt out of routine emails (loan reminders, request updates, etc.)
-- without losing account-state messages (suspension, role change) that they
-- need to receive for accountability.
--
-- Default is ON: existing users continue receiving every email until they
-- explicitly opt out. The toggle surface lives at /staff/settings and
-- /student/settings under a "Notifications" section.

-- ============================================================================
-- 1. Preference column.
-- ============================================================================

alter table public.users
  add column if not exists email_notifications_enabled boolean not null default true;

-- ============================================================================
-- 2. Replace enqueue_email to honor the preference for non-critical templates.
--    The critical_templates array is hardcoded — extend it whenever a new
--    account-state / security template lands. Anything not in the list
--    respects the user's `email_notifications_enabled` flag.
--
--    `coalesce(prefers_email, true)` defends against a missing row (the
--    select returns NULL) — in that case we behave as opted-in, matching
--    the column's default.
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
    'staff_demoted'
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
