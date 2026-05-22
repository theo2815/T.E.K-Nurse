# Supabase migrations — T.E.K Nurse

Plain numbered SQL files. Apply them in order via the **Supabase SQL Editor**
(Project dashboard → SQL Editor → New query → paste → Run).

## Files

| File | Purpose |
|---|---|
| `migrations/0001_initial_schema.sql` | Extensions, enums, all 12 tables, CHECK constraints, indexes, `updated_at` triggers. |
| `migrations/0002_rls_policies.sql` | `public.is_staff()` helper + RLS enabled + per-table policies. |
| `migrations/0003_functions_and_triggers.sql` | Signup mirror, audit-log writer, all state-machine triggers, FIFO logic. |
| `seed.sql` | Sample users, SKUs, lots, transactions, usage events, audit-log entries. Optional but recommended for demos. |

## First-time apply (fresh Supabase project)

1. Create the Supabase project (Dashboard → New project).
2. Copy these values from **Project Settings → API** into `.env.local`:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (server-only, never expose to client)
3. Open **SQL Editor** in the Supabase dashboard. For each file in order:
   - Click **New query**.
   - Paste the full file contents.
   - Click **Run**.
   - Wait for "Success. No rows returned" (or the row counts shown).
4. Apply order:
   1. `migrations/0001_initial_schema.sql`
   2. `migrations/0002_rls_policies.sql`
   3. `migrations/0003_functions_and_triggers.sql`
   4. `seed.sql` *(optional — fresh DB only)*

If any step errors, fix the issue and re-run only that file. The files use
`create or replace` for functions and `on conflict do nothing` in seed inserts,
so re-running is safe in most cases. Schema files (0001) are **not** idempotent:
re-running them on an already-populated DB will fail on duplicate type/table
names — that's expected.

## Verifying the apply worked

After 0001 + 0002 + 0003, run this in the SQL Editor:

```sql
-- Should return 12 rows (the user-facing tables)
select table_name
from information_schema.tables
where table_schema = 'public'
order by table_name;

-- Should return true for every table
select c.relname as table_name, c.relrowsecurity as rls_enabled
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relkind = 'r'
order by c.relname;

-- Should list the state-machine triggers
select event_object_table, trigger_name
from information_schema.triggers
where trigger_schema = 'public'
order by event_object_table, trigger_name;
```

After running `seed.sql`, you should see:

```sql
select role, count(*) from public.users group by role;
-- staff: 1, student: 3

select count(*) from public.equipment_sku;     -- 8
select count(*) from public.consumable_sku;    -- 4
select count(*) from public.consumable_lot;    -- 8
select count(*) from public.borrow_transaction; -- 6  (4 BORROWED + 2 RETURNED)
select count(*) from public.consumable_usage;   -- 5
select count(*) from public.audit_log;          -- 13
```

## Seed account credentials (demo only)

All four seeded accounts use the same password: **`TekNurse123!`**

| Email | Role | Profile |
|---|---|---|
| `staff.nurse@cit.edu` | staff   | Mara Lim, RN |
| `maria.cruz@cit.edu`  | student | BSN 3-A |
| `jose.santos@cit.edu` | student | BSN 2-B |
| `ana.reyes@cit.edu`   | student | BSN 3-A |

Change these before sharing the project with anyone outside the team.

## Resetting the database

Two options:

**A. Reset just the seeded data** — useful when you want to keep your own
test users but wipe the demo data:

```sql
delete from public.audit_log where id::text like '70000000-%';
delete from public.consumable_usage_lot_deduction where id::text like '60000000-%';
delete from public.consumable_usage where id::text like '50000000-%';
delete from public.borrow_transaction where id::text like '40000000-%';
delete from public.consumable_lot where id::text like '30000000-%';
delete from public.consumable_sku where id::text like '20000000-%';
delete from public.equipment_sku where id::text like '10000000-%';
delete from auth.users where id in (
  '11111111-1111-1111-1111-111111111111',
  '22222222-2222-2222-2222-222222222222',
  '33333333-3333-3333-3333-333333333333',
  '44444444-4444-4444-4444-444444444444'
);
-- public.users cascades from auth.users.
```

**B. Nuke everything** (Dashboard → Database → Tables → Drop, or):

```sql
drop schema public cascade;
create schema public;
grant all on schema public to postgres;
grant all on schema public to public;
```

Then re-apply 0001 / 0002 / 0003 / seed.sql.

## Promoting a new staff account

Self-signup always creates a `student` row. To promote someone to staff (run
this as the `postgres` role in the SQL Editor — RLS allows staff to update any
user, but you can't be the first staff yourself):

```sql
update public.users
   set role = 'staff'
 where email = 'new.staff@cit.edu';
```

## Notes for future phases

- **Phase 2 (Auth)**: the signup form must enforce `@cit.edu` client-side, send
  `full_name` and `year_section` in `options.data` so `handle_new_user` picks
  them up from `raw_user_meta_data`, and trigger email verification.
- **Phase 8 (Email)**: build a worker that polls `public.pending_email WHERE
  status = 'QUEUED'`, sends via your chosen provider, and updates
  `status / attempts / sent_at / last_error`. Provider can be Gmail SMTP (via
  Nodemailer), Resend, SendGrid, etc. — the schema is provider-agnostic.
- **Phase 9 (Cron)**: scheduled jobs need to write `audit_log` rows for actions
  they perform (`mark_overdue`, `auto_expire_request`, `auto_mark_lost`). Pass
  an explicit `p_actor_id` to `public.write_audit_log()` — a dedicated "system"
  user row can be added then.
