# Supabase migrations — T.E.K Nurse

Plain numbered SQL files. Apply them in order via the **Supabase SQL Editor**
(Project dashboard → SQL Editor → New query → paste → Run).

## Files

| File | Purpose |
|---|---|
| `migrations/0001_initial_schema.sql` | Extensions, enums, all 12 tables, CHECK constraints, indexes, `updated_at` triggers. |
| `migrations/0002_rls_policies.sql` | `public.is_staff()` helper + RLS enabled + per-table policies. |
| `migrations/0003_functions_and_triggers.sql` | Signup mirror, audit-log writer, all state-machine triggers, FIFO logic. |
| `migrations/0004_add_declined_enum.sql` … `migrations/0011_consumable_lot_student_select.sql` | Incremental schema/trigger evolutions. Apply in order. |
| `migrations/0012_email_cron.sql` | Phase 8c: `pg_cron` + `pg_net`, `claimed_at` lease on `pending_email`, `fetch_pending_emails()` claim function, per-minute drain schedule. **Requires the `app.cron_secret` setup below before the cron job will work.** |
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

## Email worker (cron + drain)

Phase 8c wires `pending_email` rows to a real SMTP delivery via Brevo. The
flow is:

```
Trigger → public.enqueue_email(...) → INSERT pending_email (QUEUED)
                                         ⋮
                              every minute, pg_cron
                                         ⋮
public.cron_drain_emails()
  → net.http_post(VERCEL_URL/api/email/drain,
                  Authorization: Bearer ${app.cron_secret})
  → POST /api/email/drain
       fetch_pending_emails(20)  -- atomic claim with 5-min lease
       → for each row: nodemailer.sendMail(...)
       → UPDATE status='SENT'/'FAILED' + last_error/attempts
```

### One-time setup after applying `0012_email_cron.sql`

The migration is committed without secrets. Before pg_cron can authenticate
against the drain route, store the shared secret in **Supabase Vault** (the
SQL editor cannot `alter database` — Vault is the supported way to hand a
secret to a database function on Supabase).

1. Generate the secret:

   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```

2. Put the value in **all three** places (same value everywhere):

   - `.env.local` → `CRON_SECRET=...`
   - Vercel → Project Settings → Environment Variables → `CRON_SECRET`
   - Supabase Vault, via the SQL editor:

     ```sql
     select vault.create_secret(
       'paste-the-64-hex-CRON_SECRET-here',
       'tek_cron_secret',
       'Bearer token used by pg_cron to POST /api/email/drain'
     );
     ```

   Verify:

   ```sql
   select name, description, created_at
   from vault.decrypted_secrets
   where name = 'tek_cron_secret';
   ```

   If you ever rotate the secret, **update** instead of create:

   ```sql
   select vault.update_secret(
     (select id from vault.secrets where name = 'tek_cron_secret'),
     'new-64-hex-value-here'
   );
   ```

If the three values don't match, pg_cron's POST will 401 against the drain
route. You'll see this in `cron.job_run_details` (status `succeeded` — the
function ran without error) and `net._http_response` (the actual HTTP reply,
where `status_code` will be 401). The route also returns the body
`"Unauthorized"`.

### SMTP credentials (Brevo)

The drain route reads SMTP settings from env vars (`.env.local` for dev,
Vercel project settings for production). To find them in Brevo:

1. Top-right profile menu → **SMTP & API** → **SMTP** tab
2. **SMTP Server / Port / Login** → maps to `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER`
3. **Your SMTP Keys** (lower table) — click the active row to reveal the full
   value → that's `SMTP_PASS`
4. `EMAIL_FROM` must be a sender verified under **Senders, Domains & Dedicated
   IPs → Senders**.

See `.env.local.example` for the full var block and inline comments.

> **Deliverability caveat (tech debt)**: sending `From: t.e.k.nurse.support@gmail.com`
> via Brevo's IPs causes a DMARC fail at Gmail/Yahoo/Outlook (their DMARC says
> "only Google may send as `@gmail.com`"). Expect spam-folder placement for
> recipients outside Gmail and some rejection from strict mail servers. For a
> capstone demo this is survivable; for real production buy a domain (e.g.
> `teknurse.app` for ~$12/yr) and verify it in Brevo so sends come from
> `noreply@teknurse.app` with proper DKIM/DMARC.

### Verifying the cron job is running

```sql
-- Should show the scheduled job, schedule '* * * * *', and active = true
select jobid, jobname, schedule, command, active
from cron.job
where jobname = 'tek-nurse-drain-emails';

-- Recent run history (last 20 invocations). status = 'succeeded' means the
-- function returned; HTTP delivery status is in net._http_response.
select start_time, end_time, status, return_message
from cron.job_run_details
where jobname = 'tek-nurse-drain-emails'
order by start_time desc
limit 20;

-- pg_net's HTTP response log (per outbound POST)
select id, status_code, content_type, created
from net._http_response
order by created desc
limit 10;
```

### Local dev (pg_cron cannot reach localhost)

Cron runs inside Supabase and can only POST to publicly reachable URLs, so
in local development the per-minute drain does not fire against
`http://localhost:3000`. Drain manually instead:

```bash
npm run email:drain
```

The `scripts/drain.mjs` helper loads `CRON_SECRET` from `.env.local` and
POSTs to the local dev server. It prints the JSON response (`drained / sent /
retried / failed_terminal` counts).

### Dev guardrail

When `NODE_ENV !== "production"` the worker rewrites every outbound `To:`
address to the first entry in `EMAIL_DEV_ALLOWLIST`, prefixes the subject
with `[DEV → original@addr]`, and stamps an `X-Original-To` header so you
can see the true recipient. This prevents real students/staff from receiving
test emails during local development.

If a target address is already in the allowlist, the rewrite is skipped (the
email goes to that address as-is, just with an `X-Tek-Nurse-Env: development`
marker header).

## Scheduled jobs (Phase 9)

`0013_scheduled_jobs.sql` adds three pg_cron jobs on top of the per-minute
email drainer. All three call SQL functions only — no HTTP routes, no Vault
secrets, no application server involvement. The existing AFTER UPDATE
triggers do the count-bucket moves, audit log writes, in-app notifications,
and `enqueue_email` rows; the drainer ships those rows to Brevo.

| Job | Schedule (UTC) | PHT | Function |
|---|---|---|---|
| `tek-nurse-expire-requests` | `*/15 * * * *` | every 15 min | `public.run_request_expiry()` |
| `tek-nurse-overdue-cadence` | `0 1 * * *` | 09:00 daily | `public.run_overdue_cadence()` |
| `tek-nurse-inventory-alerts` | `0 1 * * *` | 09:00 daily | `public.run_inventory_alerts()` |

### What each job does

- **Expire requests** — flips `borrow_request` and `consumable_request` rows
  whose `expires_at` (pre-approval) or `pickup_expires_at` (post-approval) is
  in the past to `EXPIRED`. Triggers free the reservation, audit, notify, and
  send the appropriate `borrow_expired` / `borrow_pickup_expired` /
  `consumable_request_expired` / `consumable_pickup_expired` email.

- **Overdue cadence** — daily T+0 / T+1 / T+3 / T+7 walk on
  `borrow_transaction`:
  - **T+0** (due today, BORROWED) — courtesy reminder; status unchanged.
  - **T+1** (1 day past, BORROWED → OVERDUE) — status flip; trigger emits.
  - **T+3** (3 days past, OVERDUE) — escalation reminder; status unchanged.
  - **T+7** (≥7 days past, OVERDUE → LOST) — status flip; trigger does the
    count move and emits the `marked_lost` email.
  - T+0 and T+3 are deduped per row via `borrow_transaction.last_reminder_at`
    so manual + scheduled runs on the same day never double-send.

- **Inventory alerts** — daily scan:
  - Equipment SKUs where `available_units < low_stock_threshold`.
  - Consumable SKUs whose total active-lot remaining is below threshold.
  - Consumable lots within `expiration_warning_days` of expiry.
  - Each (scope, entity) is rate-limited via `public.cron_alert_state` so the
    same alert pings staff at most once per 7 days.

### System actor (audit_log)

Cron-driven UPDATEs have no `auth.uid()` context, so the existing triggers
that call `write_audit_log` would fail the original actor-not-null check.
`0013` drops the NOT NULL on `audit_log.actor_id` and replaces
`write_audit_log` to insert `actor_id = NULL` when neither `p_actor_id` nor
`auth.uid()` resolve to a user. `NULL = system` is the canonical encoding;
no synthetic users row is provisioned (avoids `public.users` → `auth.users`
FK contamination and keeps `is_staff()` / student-search / activity feed
naturally clean).

Phase 10 reports that want to hide system actions can filter
`actor_id IS NOT NULL`; reports that want to surface them can render
`coalesce(actor.full_name, '(system)')`.

### Verifying the jobs are scheduled

```sql
select jobid, jobname, schedule, active
from cron.job
where jobname like 'tek-nurse-%'
order by jobname;

select jobname, start_time, status, return_message
from cron.job_run_details
where jobname like 'tek-nurse-%'
order by start_time desc
limit 20;
```

### Local dev — poking the jobs manually

`pg_cron` runs inside Supabase. Until the staging/prod deploy lands, dev runs
the jobs on demand:

```bash
npm run cron:poke
```

`scripts/cron-poke.mjs` invokes the three RPCs via the service-role key from
`.env.local`, prints each function's JSON return value, and then triggers a
`POST /api/email/drain` so any emails the jobs enqueued land in your inbox
in the same call. Use this in conjunction with manual SQL to seed an overdue
or low-stock state:

```sql
-- Make one borrow_transaction look 3 days overdue
update public.borrow_transaction
set expected_return_date = (now() at time zone 'Asia/Manila')::date - 3,
    status               = 'OVERDUE',
    last_reminder_at     = null   -- reset dedupe so the cron will re-send
where id = '<some-borrow-transaction-id>';

-- Make a consumable lot look like it's expiring this week
update public.consumable_lot
set expiration_date = current_date + 5
where id = '<some-lot-id>';
```

Then `npm run cron:poke` and check the inbox / `select * from notification`
for the system reminder.

### Realtime publication

The bell, popover, and notifications page rely on Supabase Realtime
broadcasting `INSERT` / `UPDATE` events from `public.notification`.
`0014_realtime_notification.sql` adds the table to `supabase_realtime`;
if you're working on a fresh project that hasn't run that migration yet,
the symptom is "new notifications only appear when the next action
triggers `router.refresh()`."

Inspect which tables are broadcasting:

```sql
select schemaname, tablename
from pg_publication_tables
where pubname = 'supabase_realtime'
order by schemaname, tablename;
```

Expect `notification`, `borrow_transaction`, `borrow_request`,
`consumable_request` at minimum. The first comes from 0014; the others
were added via the Supabase Dashboard during Phase 6 / 8 and are not
encoded in any migration — if you're cloning the project, you'll need
to add them manually via Dashboard → Database → Publications → supabase_realtime.

### Inventory alert dedupe (cron_alert_state)

```sql
-- See what's currently rate-limited
select scope, entity_id, last_alerted_at
from public.cron_alert_state
order by last_alerted_at desc;

-- Reset for a specific SKU so the next run alerts again
delete from public.cron_alert_state
where scope = 'equipment_low_stock'
  and entity_id = '<sku-id>';
```

## Notes for future phases

- **Phase 2 (Auth)**: the signup form must enforce `@cit.edu` client-side, send
  `full_name` and `year_section` in `options.data` so `handle_new_user` picks
  them up from `raw_user_meta_data`, and trigger email verification.
- **Phase 10 (Reports)**: when listing audit_log activity, filter
  `actor_id IS NOT NULL` if the staff view should only show human-driven
  actions; or `coalesce(actor.full_name, '(system)')` to render cron rows.
