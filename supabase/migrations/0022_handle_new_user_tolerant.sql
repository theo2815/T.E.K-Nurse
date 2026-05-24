-- T.E.K Nurse — 0022_handle_new_user_tolerant.sql
-- Phase 11.5d hotfix. Makes the auth → public.users trigger tolerant of
-- accounts created via the Supabase Dashboard's "Add user" form, which
-- does not pass a student_id in raw_user_meta_data.
--
-- Why this exists:
-- The signup form (/signup) always sets raw_user_meta_data.student_id
-- (regex-validated YY-NNNN-NNN). The pre-0022 handle_new_user trigger
-- inserted public.users with student_id = NULL whenever the metadata key
-- was missing. The default role is 'student', so the row immediately
-- violated the users_student_must_have_id CHECK constraint added in 0017
-- ((role = 'student' AND student_id IS NOT NULL) OR role <> 'student').
-- Postgres aborted the trigger, Supabase rolled back the auth.users
-- insert, and the Dashboard surfaced "Database error creating new user."
--
-- This blocked the admin bootstrap documented in supabase/README.md
-- (step 1: Dashboard add tekadmin@cit.edu) before step 2 (SQL Editor
-- promote to admin) could run.
--
-- The fix: when no student_id is supplied, auto-generate the next
-- "00-0000-NNN" placeholder — the same format 0017's backfill used for
-- pre-existing seed students. Dashboard-created rows land as a student
-- with a placeholder ID; the admin bootstrap UPDATE in the README then
-- atomically swaps role='admin', sets staff_id, and NULLs student_id in
-- a single statement, which satisfies all CHECK constraints.
--
-- Concurrency: two simultaneous Dashboard creates could compute the
-- same next placeholder. The partial UNIQUE index users_student_id_unique
-- catches it — one trigger succeeds, the other errors, the operator
-- retries. Acceptable for a procedure that runs once per admin lifetime.
--
-- This migration only redefines the function. The trigger binding on
-- auth.users from 0003 stays as-is.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  v_student_id text := nullif(meta ->> 'student_id', '');
begin
  if v_student_id is null then
    -- Format must satisfy users_student_id_format (^\d{2}-\d{4}-\d{3}$),
    -- so the placeholder reuses 0017's "00-0000-NNN" convention.
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
  values (
    new.id,
    new.email,
    coalesce(nullif(meta ->> 'full_name', ''), split_part(new.email, '@', 1)),
    v_student_id
  );
  return new;
end;
$$;
