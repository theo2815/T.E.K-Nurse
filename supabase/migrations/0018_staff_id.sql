-- T.E.K Nurse — 0018_staff_id.sql
-- Phase 11.5c-rev. Adds a canonical staff identifier mirroring student_id.
-- Format: TEK-NNN (e.g. TEK-001). Required for non-student rows (staff today;
-- admin once 11.5d's enum migration lands). Partial UNIQUE index keeps it
-- enforceable while still letting student rows hold NULL.
--
-- The constraint is written negatively against the student role so the
-- forthcoming `admin` enum value is covered automatically without a
-- follow-up ALTER — admins are staff with extra permissions and carry the
-- same TEK-NNN identity.

-- ============================================================================
-- 1. Add the column (nullable so the backfill can run).
-- ============================================================================

alter table public.users
  add column if not exists staff_id text;

-- ============================================================================
-- 2. Backfill: assign TEK-001, TEK-002, ... to every existing non-student row
--    in created_at order. With the seeded staff this is a single row
--    (TEK-001). tekadmin (created out-of-band during 11.5d bootstrap) gets
--    TEK-002 from this same loop the next time the migration is reapplied —
--    but operators can also assign it directly in the SQL Editor.
-- ============================================================================

do $$
declare
  r record;
  i int := 1;
begin
  for r in
    select id from public.users
     where role <> 'student' and staff_id is null
     order by created_at
  loop
    update public.users
       set staff_id = 'TEK-' || lpad(i::text, 3, '0')
     where id = r.id;
    i := i + 1;
  end loop;
end $$;

-- ============================================================================
-- 3. Constraints.
--    - Format CHECK applies only when staff_id is present (so student NULL
--      stays valid).
--    - users_staff_must_have_id reads as "either you're a student or you
--      carry a staff_id" — phrased this way so any future non-student role
--      (admin, etc.) is covered without a constraint rewrite.
--    - Partial UNIQUE index — NULL allowed for multiple student rows.
-- ============================================================================

alter table public.users
  drop constraint if exists users_staff_id_format;
alter table public.users
  add constraint users_staff_id_format
  check (staff_id is null or staff_id ~ '^TEK-\d{3}$');

alter table public.users
  drop constraint if exists users_staff_must_have_id;
alter table public.users
  add constraint users_staff_must_have_id
  check (
    role = 'student'
    or staff_id is not null
  );

drop index if exists public.users_staff_id_unique;
create unique index users_staff_id_unique
  on public.users (staff_id)
  where staff_id is not null;
