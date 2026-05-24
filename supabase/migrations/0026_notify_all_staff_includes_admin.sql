-- T.E.K Nurse — 0026_notify_all_staff_includes_admin.sql
--
-- Admin-parity straggler from the Phase 11.5 admin retrofit. Migration 0021
-- redefined the per-user gate `is_staff()` to `role in ('staff', 'admin')` so
-- admin became a strict superset of staff for every permission check. But the
-- SET-based fan-out helper `notify_all_staff()` (defined back in 0003) was left
-- pointing at `where u.role = 'staff'` — so admin accounts silently never
-- received ANY staff notification: new pending requests, suspension events,
-- the overdue cadence, and the daily inventory alerts all skipped them. The
-- symptom is an admin's notification inbox sitting permanently empty even while
-- staff inboxes fill up.
--
-- This migration re-aligns the fan-out with `is_staff()` so admin receives the
-- same notifications as staff. `create or replace` — non-destructive, no schema
-- change. Every caller (0003 request triggers, 0013 scheduled jobs, 0015
-- suspension RPCs) routes through this one function, so this is the single
-- chokepoint fix.

create or replace function public.notify_all_staff(
  p_type     text,
  p_title    text,
  p_body     text default null,
  p_link_url text default null
)
returns void
language sql
security definer
set search_path = public
as $$
  insert into public.notification (user_id, type, title, body, link_url)
  select u.id, p_type, p_title, p_body, p_link_url
  from public.users u
  where u.role in ('staff', 'admin') and u.is_active = true;
$$;
