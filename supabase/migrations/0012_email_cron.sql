-- ============================================================================
-- 0012_email_cron.sql
--
-- Phase 8c: schedule a per-minute drain of public.pending_email by POSTing to
-- the deployed Next.js /api/email/drain endpoint. The route reads queued rows,
-- calls Brevo SMTP via nodemailer, and writes back status / sent_at / attempts.
--
-- Prerequisite: before pg_cron can authenticate against the drain route, you
-- must store the shared secret in Supabase Vault. See supabase/README.md
-- → "Email worker (cron + drain)" for the exact one-time command.
--
-- This migration is idempotent. It uses `create extension if not exists` and
-- `cron.unschedule` + `cron.schedule` to safely re-run.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Extensions
--
-- In Supabase, pg_cron installs into the `cron` schema and pg_net installs
-- into the `net` schema. We rely on those default locations below.
-- ----------------------------------------------------------------------------
create extension if not exists pg_cron;
create extension if not exists pg_net;

-- ----------------------------------------------------------------------------
-- 2. claimed_at lease column on pending_email
--
-- Adds a soft lease so two drainers (e.g. pg_cron firing while a developer
-- runs `npm run email:drain`) can never grab the same row. claimed rows are
-- excluded from the next claim for 5 minutes; after that the lease expires
-- and the row becomes claimable again (handles the "drain crashed mid-send"
-- recovery case automatically).
-- ----------------------------------------------------------------------------
alter table public.pending_email
  add column if not exists claimed_at timestamptz;

-- ----------------------------------------------------------------------------
-- 3. fetch_pending_emails — atomic claim
--
-- One SQL statement that:
--   a) Selects up to p_limit QUEUED rows whose lease is unexpired,
--   b) Holds the row lock for the duration of the UPDATE (SKIP LOCKED so
--      a second concurrent drain sees a disjoint set),
--   c) Stamps claimed_at = now() and bumps attempts in the same write,
--   d) Returns the updated rows to the caller.
--
-- The caller (POST /api/email/drain) then sends each email and writes the
-- terminal status (SENT / FAILED / re-QUEUED with last_error). The 5-minute
-- lease window gives the sender plenty of time even on slow SMTP.
-- ----------------------------------------------------------------------------
create or replace function public.fetch_pending_emails(p_limit int default 20)
returns setof public.pending_email
language sql security definer set search_path = public
as $$
  update public.pending_email
  set claimed_at = now(),
      attempts   = attempts + 1
  where id in (
    select id
    from public.pending_email
    where status = 'QUEUED'
      and attempts < 5
      and (claimed_at is null or claimed_at < now() - interval '5 minutes')
    order by created_at
    limit p_limit
    for update skip locked
  )
  returning *;
$$;

-- Restrict execution to the service role (and postgres). Anon / authenticated
-- users must never be able to claim rows out of the queue.
revoke all on function public.fetch_pending_emails(int) from public;
grant execute on function public.fetch_pending_emails(int) to service_role;

-- ----------------------------------------------------------------------------
-- 4. cron_drain_emails — pg_cron entry point
--
-- Invoked once per minute. Reads the shared secret from Supabase Vault
-- (vault.decrypted_secrets), then uses pg_net to POST it as a Bearer token
-- against the production drain route. pg_net is async: this returns
-- immediately; the actual HTTP exchange happens in the background pg_net
-- worker.
--
-- If the vault secret is not set, the function raises so the cron job logs
-- a visible failure in cron.job_run_details instead of silently sending
-- an unauthorised request.
-- ----------------------------------------------------------------------------
create or replace function public.cron_drain_emails()
returns void
language plpgsql security definer set search_path = public, vault, net
as $$
declare
  v_secret text;
  v_url    text := 'https://teknurse.vercel.app/api/email/drain';
begin
  select decrypted_secret
    into v_secret
    from vault.decrypted_secrets
   where name = 'tek_cron_secret'
   limit 1;

  if v_secret is null or v_secret = '' then
    raise exception 'cron_drain_emails: vault secret "tek_cron_secret" is not set. Run once in SQL editor: select vault.create_secret(''<your-CRON_SECRET-value>'', ''tek_cron_secret'');';
  end if;

  perform net.http_post(
    url     := v_url,
    headers := jsonb_build_object(
                 'Content-Type',  'application/json',
                 'Authorization', 'Bearer ' || v_secret
               ),
    body    := '{}'::jsonb
  );
end;
$$;

revoke all on function public.cron_drain_emails() from public;
grant execute on function public.cron_drain_emails() to service_role;

-- ----------------------------------------------------------------------------
-- 5. Schedule the cron job (every minute)
--
-- cron.unschedule is wrapped in a do-block so re-running this migration after
-- changing the job definition cleanly replaces it instead of erroring on the
-- existing job name.
-- ----------------------------------------------------------------------------
do $$
begin
  if exists (select 1 from cron.job where jobname = 'tek-nurse-drain-emails') then
    perform cron.unschedule('tek-nurse-drain-emails');
  end if;
end
$$;

select cron.schedule(
  'tek-nurse-drain-emails',
  '* * * * *',
  $$select public.cron_drain_emails();$$
);
