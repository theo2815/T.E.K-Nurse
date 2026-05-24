-- T.E.K Nurse — 0017_student_id.sql
-- Phase 11.5a foundation.
-- Replaces public.users.year_section with student_id (canonical CIT identifier).
-- Format: YY-NNNN-NNN (e.g. 12-3456-789). Required for role = 'student', null
-- otherwise. Partial UNIQUE index. Also replaces handle_new_user so signup
-- metadata routes the new field, and adds the check_email_available RPC used
-- by the signup form to surface a friendly duplicate-email error.

-- ============================================================================
-- 1. Add the new column (nullable so backfill can run).
-- ============================================================================

alter table public.users
  add column if not exists student_id text;

-- ============================================================================
-- 2. Backfill existing students with valid-format placeholder IDs so the
--    CHECK constraints in step 3 don't fail. Operators edit these post-apply
--    via the SQL Editor (see supabase/README.md).
-- ============================================================================

do $$
declare
  r record;
  i int := 1;
begin
  for r in
    select id from public.users
     where role = 'student' and student_id is null
     order by created_at
  loop
    update public.users
       set student_id = '00-0000-' || lpad(i::text, 3, '0')
     where id = r.id;
    i := i + 1;
  end loop;
end $$;

-- ============================================================================
-- 3. Constraints.
--    - Format CHECK applies only when student_id is present (so staff/admin
--      null stays valid).
--    - users_student_must_have_id enforces that students always have one.
--    - Partial UNIQUE index — NULL is allowed for multiple staff rows.
-- ============================================================================

alter table public.users
  drop constraint if exists users_student_id_format;
alter table public.users
  add constraint users_student_id_format
  check (student_id is null or student_id ~ '^\d{2}-\d{4}-\d{3}$');

alter table public.users
  drop constraint if exists users_student_must_have_id;
alter table public.users
  add constraint users_student_must_have_id
  check (
    (role = 'student' and student_id is not null)
    or role <> 'student'
  );

drop index if exists public.users_student_id_unique;
create unique index users_student_id_unique
  on public.users (student_id)
  where student_id is not null;

-- ============================================================================
-- 4. Replace handle_new_user to write student_id from the signup metadata
--    instead of year_section. raw_user_meta_data.student_id is required for
--    new student signups (form validation), but the trigger uses nullif so an
--    empty string is treated as null and the row-level CHECK above is the
--    final fence.
-- ============================================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
begin
  insert into public.users (id, email, full_name, student_id)
  values (
    new.id,
    new.email,
    coalesce(nullif(meta ->> 'full_name', ''), split_part(new.email, '@', 1)),
    nullif(meta ->> 'student_id', '')
  );
  return new;
end;
$$;

-- ============================================================================
-- 5. Drop the old column LAST (after backfill + trigger swap).
-- ============================================================================

alter table public.users
  drop column if exists year_section;

-- ============================================================================
-- 6. check_email_available — signup duplicate-email pre-check.
--    Returns true when no public.users row exists for the given email.
--    SECURITY DEFINER so the unauthenticated signup form can call it via
--    the anon key. Email normalized to lowercase before lookup since the
--    users table stores @cit.edu addresses case-insensitively in practice.
-- ============================================================================

create or replace function public.check_email_available(p_email text)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select not exists (
    select 1 from public.users
    where lower(email) = lower(trim(p_email))
  );
$$;

grant execute on function public.check_email_available(text) to anon, authenticated;
