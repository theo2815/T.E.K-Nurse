-- T.E.K Nurse — 0027_guard_users_privileged_columns.sql
--
-- CRITICAL access-control fix. The 0002 RLS policy `users_update_self` allows a
-- user to UPDATE their own row (USING + WITH CHECK are both `id = auth.uid()`),
-- and its inline comment claims "role/is_active changes blocked by trigger in
-- 0003." That trigger was never written — the only BEFORE UPDATE trigger on
-- public.users is `users_set_updated_at` (0001), which merely stamps updated_at.
--
-- Consequences (both verified against the live policy set):
--   1. Any authenticated STUDENT can self-escalate to staff/admin with a direct
--      PostgREST call using the public anon key + their own session JWT:
--         PATCH /rest/v1/users?id=eq.<their-uuid>   {"role":"admin"}
--      RLS permits it (id matches), no trigger/CHECK blocks the column change,
--      and is_admin()/is_staff() read `role` from this very table — instant
--      privilege escalation / full compromise.
--   2. The `users_update_staff` policy lets ANY staff UPDATE ANY user row, so a
--      regular staff member can set role='admin' on themselves or anyone,
--      bypassing the is_admin() gate the promote/demote RPCs enforce.
--
-- RLS alone cannot fix this: a policy's USING/WITH CHECK only see the NEW row,
-- never the OLD→NEW delta, so they can't express "role didn't change." A
-- BEFORE UPDATE trigger (which has both OLD and NEW) is the right tool.
--
-- Fix: lock the privileged columns (role, is_active, staff_id, student_id) to
-- their legitimate writers:
--   * role / staff_id / student_id → admin only (promote_to_staff /
--     demote_to_student gate on is_admin() and run with the admin's JWT).
--   * is_active                    → staff/admin (suspend_student /
--     reinstate_student gate on is_staff()).
--   * Trusted server contexts (service-role key, SQL editor, pg_cron) carry no
--     end-user JWT — auth.uid() IS NULL — and pass through. This is the path
--     the admin bootstrap/swap SQL and any service-role maintenance use.
-- Non-privileged self-service edits (full_name, year_section, email) are
-- unaffected: the guard only fires when a locked column actually changes.

create or replace function public.guard_users_privileged_columns()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  -- No end-user JWT → trusted context (service role / SQL editor / cron). Allow.
  if auth.uid() is null then
    return new;
  end if;

  -- role, staff_id, student_id are admin-only. Legitimate changes flow through
  -- promote_to_staff / demote_to_student, which gate on is_admin().
  if (new.role       is distinct from old.role
   or new.staff_id   is distinct from old.staff_id
   or new.student_id is distinct from old.student_id)
   and not public.is_admin() then
    raise exception 'Not authorized to change role, staff_id, or student_id'
      using errcode = '42501';
  end if;

  -- is_active (suspend / reinstate) is staff-gated.
  if new.is_active is distinct from old.is_active
   and not public.is_staff() then
    raise exception 'Not authorized to change account active state'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

drop trigger if exists users_guard_privileged_columns on public.users;
create trigger users_guard_privileged_columns
  before update on public.users
  for each row
  execute function public.guard_users_privileged_columns();
