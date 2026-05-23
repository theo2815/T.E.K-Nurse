-- T.E.K Nurse — 0013_scheduled_jobs.sql
--
-- Phase 9: scheduled jobs.
--
-- Wires three new pg_cron jobs on top of the per-minute email drainer that
-- shipped in 0012. All work is database-side; no HTTP routes are involved.
-- Each cron entry point just performs UPDATEs / INSERTs, and the existing
-- AFTER UPDATE triggers (from 0003, 0006, 0009) handle the rest:
-- count-bucket moves, audit log writes, in-app notifications, and
-- enqueue_email rows that the per-minute drainer ships through Brevo.
--
-- Jobs:
--   tek-nurse-expire-requests    */15 * * * *   run_request_expiry()
--   tek-nurse-overdue-cadence    0 1   * * *    run_overdue_cadence()   (09:00 PHT)
--   tek-nurse-inventory-alerts   0 1   * * *    run_inventory_alerts()  (09:00 PHT)
--
-- Prerequisites:
--   • 0012_email_cron.sql applied (pg_cron + pg_net + Vault setup).
--   • audit_log.actor_id is made nullable below so cron-driven writes (which
--     have no auth.uid()) can record actor_id = NULL — the canonical
--     encoding of "no human did this; the system did". write_audit_log is
--     replaced to insert NULL instead of raising 'actor_id is required'.
--
-- This migration is idempotent: create-or-replace, add-if-not-exists,
-- on-conflict-do-nothing, and the do$$/cron.unschedule pattern for the
-- three jobs.

-- ============================================================================
-- 1. audit_log.actor_id — make nullable
--
-- Originally NOT NULL with FK to public.users(id). pg_cron runs as
-- `postgres` with no JWT context, so auth.uid() returns null and any
-- write_audit_log call from a cron-driven trigger would otherwise fail.
--
-- An earlier draft of Phase 9 tried to provision a synthetic "system" users
-- row to satisfy the FK, but public.users.id has its own FK to auth.users(id),
-- and inserting a junk auth.users row to back it would mean touching the
-- Supabase-managed auth schema. NULL = system is cleaner: no fake user row
-- can accidentally surface in staff pickers, is_staff() edge cases, or
-- searchStudents, and the audit log query just renders actor_id IS NULL as
-- "(system)".
--
-- The FK to public.users(id) is kept; it just permits NULL.
-- ============================================================================

alter table public.audit_log
  alter column actor_id drop not null;

-- ============================================================================
-- 2. write_audit_log — insert NULL actor when none can be resolved
--
-- Replaces the function defined in 0003. Same signature and behaviour except
-- the actor fallback: cron-driven calls now succeed and record actor_id =
-- NULL instead of raising 'actor_id is required'. Explicit p_actor_id from
-- callers still wins; auth.uid() is the second choice; NULL is the floor.
-- ============================================================================

create or replace function public.write_audit_log(
  p_action_type text,
  p_entity_type text,
  p_entity_id   uuid,
  p_before      jsonb default null,
  p_after       jsonb default null,
  p_notes       text  default null,
  p_actor_id    uuid  default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := coalesce(p_actor_id, auth.uid());
begin
  insert into public.audit_log
    (actor_id, action_type, entity_type, entity_id, before_value, after_value, notes)
  values
    (v_actor, p_action_type, p_entity_type, p_entity_id, p_before, p_after, p_notes);
end;
$$;

-- ============================================================================
-- 3. borrow_transaction.last_reminder_at
--
-- Per-row dedupe for T+0 and T+3 reminders (T+1 and T+7 are status flips
-- and so are naturally idempotent via the existing conditional WHERE).
-- The cron sets it after each successful enqueue; the cron skips rows that
-- have already been stamped today (Asia/Manila).
-- ============================================================================

alter table public.borrow_transaction
  add column if not exists last_reminder_at timestamptz;

-- ============================================================================
-- 4. cron_alert_state — inventory-alert rate limit
--
-- Daily inventory scans would spam staff if a SKU sat below threshold for a
-- week. We re-alert at most once per 7 days per (scope, entity_id) pair.
--
-- scopes:
--   • 'equipment_low_stock'    entity_id = equipment_sku.id
--   • 'consumable_low_stock'   entity_id = consumable_sku.id
--   • 'consumable_expiring'    entity_id = consumable_lot.id
-- ============================================================================

create table if not exists public.cron_alert_state (
  scope            text        not null,
  entity_id        uuid        not null,
  last_alerted_at  timestamptz not null default now(),
  primary key (scope, entity_id)
);

alter table public.cron_alert_state enable row level security;
alter table public.cron_alert_state force row level security;

-- No RLS policies are added — this table is written/read only by cron
-- functions running as SECURITY DEFINER (owner = postgres), which bypass
-- RLS. Nothing in the app needs to read it directly.

-- ============================================================================
-- 5. tr_borrow_transaction_after_update — pass days_overdue: 1 on T+1 flip
--
-- The trigger from 0006 enqueues `overdue_reminder` with payload
-- {transaction_id, expected_return_date}. With Phase 9 the email template
-- now branches on a days_overdue field. The T+1 status flip (BORROWED ->
-- OVERDUE) is always exactly one day late by definition, so we hard-code 1.
-- T+0 and T+3 cron enqueues set their own values.
-- ============================================================================

create or replace function public.tr_borrow_transaction_after_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.status = new.status then
    return new;
  end if;

  if old.status in ('BORROWED', 'OVERDUE') and new.status in ('RETURNED', 'RETURNED_LATE') then
    if new.return_condition = 'DAMAGED' then
      update public.equipment_sku
        set borrowed_units    = borrowed_units    - old.quantity,
            maintenance_units = maintenance_units + old.quantity
        where id = new.equipment_sku_id;
    elsif new.return_condition = 'LOST_ON_RETURN' then
      update public.equipment_sku
        set borrowed_units = borrowed_units - old.quantity,
            lost_units     = lost_units     + old.quantity
        where id = new.equipment_sku_id;
    else
      update public.equipment_sku
        set borrowed_units  = borrowed_units  - old.quantity,
            available_units = available_units + old.quantity
        where id = new.equipment_sku_id;
    end if;

    perform public.write_audit_log(
      'return_logged_' || lower(coalesce(new.return_condition::text, 'good')),
      'borrow_transaction', new.id, to_jsonb(old), to_jsonb(new)
    );

    if new.return_condition = 'DAMAGED' then
      perform public.enqueue_notification(
        new.student_id, 'return_damaged', 'Return logged (flagged for maintenance)',
        'Your item was returned and flagged for maintenance.', '/student/history'
      );
      perform public.enqueue_email(new.student_id, 'return_damaged',
        jsonb_build_object('transaction_id', new.id));
    elsif new.return_condition = 'LOST_ON_RETURN' then
      perform public.enqueue_notification(
        new.student_id, 'return_lost', 'Item reported lost',
        'You reported this item as lost at return. Please contact the lab if recovered.',
        '/student/history'
      );
      perform public.enqueue_email(new.student_id, 'return_lost',
        jsonb_build_object('transaction_id', new.id));
    else
      perform public.enqueue_notification(
        new.student_id, 'return_confirm', 'Return logged',
        'Thanks — your item has been logged as returned.', '/student/history'
      );
      perform public.enqueue_email(new.student_id, 'return_confirm',
        jsonb_build_object('transaction_id', new.id));
    end if;

  elsif old.status = 'LOST' and new.status = 'RETURNED_LATE' then
    update public.equipment_sku
      set lost_units      = lost_units      - old.quantity,
          available_units = available_units + old.quantity
      where id = new.equipment_sku_id;

    perform public.write_audit_log(
      'lost_item_returned', 'borrow_transaction', new.id, to_jsonb(old), to_jsonb(new)
    );

  elsif old.status = 'BORROWED' and new.status = 'OVERDUE' then
    perform public.write_audit_log(
      'marked_overdue', 'borrow_transaction', new.id, to_jsonb(old), to_jsonb(new)
    );
    perform public.enqueue_notification(
      new.student_id, 'overdue_reminder', 'Item overdue',
      'Please return your borrowed item as soon as possible.', '/student/history'
    );
    perform public.enqueue_email(new.student_id, 'overdue_reminder',
      jsonb_build_object(
        'transaction_id',       new.id,
        'expected_return_date', new.expected_return_date,
        'days_overdue',         1
      ));

  elsif old.status in ('BORROWED', 'OVERDUE') and new.status = 'LOST' then
    update public.equipment_sku
      set borrowed_units = borrowed_units - old.quantity,
          lost_units     = lost_units     + old.quantity
      where id = new.equipment_sku_id;

    perform public.write_audit_log(
      'marked_lost', 'borrow_transaction', new.id, to_jsonb(old), to_jsonb(new)
    );
    perform public.enqueue_notification(
      new.student_id, 'marked_lost', 'Item marked lost',
      'Your borrowed item has been marked as lost. Please contact the lab.', '/student/history'
    );
    perform public.enqueue_email(new.student_id, 'marked_lost',
      jsonb_build_object('transaction_id', new.id));
  end if;

  return new;
end;
$$;

-- ============================================================================
-- 6. run_request_expiry()
--
-- Two flavours of expiry, both UPDATE-only — the BEFORE/AFTER UPDATE triggers
-- on the request tables (defined in 0003 / 0009) handle reservation release,
-- audit log, notification, and email enqueue.
--
--   Pre-approval expiry: PENDING_PICKUP rows past their expires_at
--                        (the end-of-day deadline set at insert time).
--   Pickup-window expiry: APPROVED rows past pickup_expires_at
--                         (approved_at + 24h).
--
-- Returns the total count of rows touched so the dev poke script can show
-- something useful.
-- ============================================================================

create or replace function public.run_request_expiry()
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_total int := 0;
  v_n     int;
begin
  -- borrow_request: PENDING_PICKUP past expires_at
  update public.borrow_request
    set status = 'EXPIRED'
    where status = 'PENDING_PICKUP'
      and expires_at < now();
  get diagnostics v_n = row_count;
  v_total := v_total + v_n;

  -- borrow_request: APPROVED past pickup_expires_at
  update public.borrow_request
    set status = 'EXPIRED'
    where status = 'APPROVED'
      and pickup_expires_at < now();
  get diagnostics v_n = row_count;
  v_total := v_total + v_n;

  -- consumable_request: PENDING_PICKUP past expires_at
  update public.consumable_request
    set status = 'EXPIRED'
    where status = 'PENDING_PICKUP'
      and expires_at < now();
  get diagnostics v_n = row_count;
  v_total := v_total + v_n;

  -- consumable_request: APPROVED past pickup_expires_at
  update public.consumable_request
    set status = 'EXPIRED'
    where status = 'APPROVED'
      and pickup_expires_at < now();
  get diagnostics v_n = row_count;
  v_total := v_total + v_n;

  return v_total;
end;
$$;

revoke all on function public.run_request_expiry() from public;
grant execute on function public.run_request_expiry() to service_role;

-- ============================================================================
-- 7. run_overdue_cadence()
--
-- Runs daily at 09:00 Asia/Manila (01:00 UTC). Cadence per Workflows/Overdue
-- Policy:
--   T+0   due today, status=BORROWED   → reminder (no status change)
--   T+1   1 day past, status=BORROWED  → flip to OVERDUE (trigger emails)
--   T+3   3 days past, status=OVERDUE  → reminder (no status change)
--   T+7+  ≥7 days past, status=OVERDUE → flip to LOST (trigger emails)
--
-- T+0 and T+3 are direct enqueues because there is no status flip to ride.
-- last_reminder_at::date<today is the dedupe so manual + scheduled runs on
-- the same day never double-send.
--
-- Returns a jsonb summary so the dev poke script can show counts.
-- ============================================================================

create or replace function public.run_overdue_cadence()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_today     date := (now() at time zone 'Asia/Manila')::date;
  v_t0        int  := 0;
  v_t1        int  := 0;
  v_t3        int  := 0;
  v_t7        int  := 0;
  r           record;
begin
  -- T+0: due today, still BORROWED. Send courtesy reminder.
  for r in
    select id, student_id, expected_return_date
      from public.borrow_transaction
     where status = 'BORROWED'
       and expected_return_date = v_today
       and (last_reminder_at is null
            or (last_reminder_at at time zone 'Asia/Manila')::date < v_today)
  loop
    perform public.enqueue_notification(
      r.student_id, 'overdue_reminder', 'Due today',
      'Please return your borrowed item to the lab today.',
      '/student/history'
    );
    perform public.enqueue_email(
      r.student_id, 'overdue_reminder',
      jsonb_build_object(
        'transaction_id',       r.id,
        'expected_return_date', r.expected_return_date,
        'days_overdue',         0
      )
    );
    update public.borrow_transaction
      set last_reminder_at = now()
      where id = r.id;
    v_t0 := v_t0 + 1;
  end loop;

  -- T+1: 1 day past, BORROWED. Flip to OVERDUE — trigger handles notif+email.
  update public.borrow_transaction
    set status           = 'OVERDUE',
        last_reminder_at = now()
    where status = 'BORROWED'
      and expected_return_date = v_today - 1;
  get diagnostics v_t1 = row_count;

  -- T+3: 3 days past, OVERDUE. Send reminder if not already stamped today.
  for r in
    select id, student_id, expected_return_date
      from public.borrow_transaction
     where status = 'OVERDUE'
       and expected_return_date = v_today - 3
       and (last_reminder_at is null
            or (last_reminder_at at time zone 'Asia/Manila')::date < v_today)
  loop
    perform public.enqueue_notification(
      r.student_id, 'overdue_reminder', 'Item overdue · 3 days',
      'Your borrowed item is now 3 days overdue. Please return it as soon as possible.',
      '/student/history'
    );
    perform public.enqueue_email(
      r.student_id, 'overdue_reminder',
      jsonb_build_object(
        'transaction_id',       r.id,
        'expected_return_date', r.expected_return_date,
        'days_overdue',         3
      )
    );
    update public.borrow_transaction
      set last_reminder_at = now()
      where id = r.id;
    v_t3 := v_t3 + 1;
  end loop;

  -- T+7+: ≥7 days past, OVERDUE. Flip to LOST — trigger handles count move,
  -- notification, and marked_lost email.
  update public.borrow_transaction
    set status = 'LOST'
    where status = 'OVERDUE'
      and expected_return_date <= v_today - 7;
  get diagnostics v_t7 = row_count;

  return jsonb_build_object(
    't0_reminders', v_t0,
    't1_marked_overdue', v_t1,
    't3_reminders', v_t3,
    't7_marked_lost', v_t7,
    'run_at', now()
  );
end;
$$;

revoke all on function public.run_overdue_cadence() from public;
grant execute on function public.run_overdue_cadence() to service_role;

-- ============================================================================
-- 8. run_inventory_alerts()
--
-- Daily scan for:
--   • Equipment SKUs with available_units < low_stock_threshold
--   • Consumable SKUs whose sum(active-lot quantity_remaining) is
--     < low_stock_threshold
--   • Consumable lots expiring within sku.expiration_warning_days
--
-- Each alert is gated by cron_alert_state: at most once every 7 days per
-- (scope, entity_id). The 7-day window keeps the inbox quiet even if a SKU
-- sits below threshold for weeks while still re-pinging if it lingers.
--
-- Returns a jsonb summary.
-- ============================================================================

create or replace function public.run_inventory_alerts()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_today date := (now() at time zone 'Asia/Manila')::date;
  v_eq    int  := 0;
  v_cs    int  := 0;
  v_exp   int  := 0;
  r       record;
begin
  -- ---- Equipment low-stock ------------------------------------------------
  for r in
    select s.id, s.name, s.qr_code, s.available_units, s.low_stock_threshold
      from public.equipment_sku s
      left join public.cron_alert_state st
        on st.scope = 'equipment_low_stock' and st.entity_id = s.id
     where s.available_units < s.low_stock_threshold
       and (st.last_alerted_at is null
            or st.last_alerted_at < now() - interval '7 days')
  loop
    perform public.notify_all_staff(
      'equipment_low_stock',
      'Low stock: ' || r.name,
      r.name || ' is below threshold (' || r.available_units
        || ' / ' || r.low_stock_threshold || ' available).',
      '/staff/inventory/equipment/' || r.qr_code
    );
    insert into public.cron_alert_state (scope, entity_id, last_alerted_at)
      values ('equipment_low_stock', r.id, now())
      on conflict (scope, entity_id) do update
        set last_alerted_at = excluded.last_alerted_at;
    v_eq := v_eq + 1;
  end loop;

  -- ---- Consumable low-stock ----------------------------------------------
  for r in
    with totals as (
      select s.id,
             s.name,
             s.qr_code,
             s.low_stock_threshold,
             coalesce(sum(l.quantity_remaining) filter (where l.is_depleted = false), 0)::int as total_remaining
        from public.consumable_sku s
        left join public.consumable_lot l on l.consumable_sku_id = s.id
       group by s.id, s.name, s.qr_code, s.low_stock_threshold
    )
    select t.id, t.name, t.qr_code, t.total_remaining, t.low_stock_threshold
      from totals t
      left join public.cron_alert_state st
        on st.scope = 'consumable_low_stock' and st.entity_id = t.id
     where t.total_remaining < t.low_stock_threshold
       and (st.last_alerted_at is null
            or st.last_alerted_at < now() - interval '7 days')
  loop
    perform public.notify_all_staff(
      'consumable_low_stock',
      'Low stock: ' || r.name,
      r.name || ' is below threshold (' || r.total_remaining
        || ' / ' || r.low_stock_threshold || ').',
      '/staff/inventory/consumables/' || r.qr_code
    );
    insert into public.cron_alert_state (scope, entity_id, last_alerted_at)
      values ('consumable_low_stock', r.id, now())
      on conflict (scope, entity_id) do update
        set last_alerted_at = excluded.last_alerted_at;
    v_cs := v_cs + 1;
  end loop;

  -- ---- Consumable expiring lots ------------------------------------------
  for r in
    select l.id           as lot_id,
           l.expiration_date,
           l.lot_number,
           l.quantity_remaining,
           s.name         as sku_name,
           s.qr_code      as sku_qr
      from public.consumable_lot l
      join public.consumable_sku s on s.id = l.consumable_sku_id
      left join public.cron_alert_state st
        on st.scope = 'consumable_expiring' and st.entity_id = l.id
     where l.is_depleted = false
       and l.quantity_remaining > 0
       and l.expiration_date <= v_today + s.expiration_warning_days
       and (st.last_alerted_at is null
            or st.last_alerted_at < now() - interval '7 days')
  loop
    perform public.notify_all_staff(
      'consumable_expiring',
      'Expiring: ' || r.sku_name,
      coalesce('Lot ' || r.lot_number || ' ', '')
        || 'expires ' || r.expiration_date::text
        || ' (' || r.quantity_remaining || ' remaining).',
      '/staff/inventory/consumables/' || r.sku_qr
    );
    insert into public.cron_alert_state (scope, entity_id, last_alerted_at)
      values ('consumable_expiring', r.lot_id, now())
      on conflict (scope, entity_id) do update
        set last_alerted_at = excluded.last_alerted_at;
    v_exp := v_exp + 1;
  end loop;

  return jsonb_build_object(
    'equipment_low_stock', v_eq,
    'consumable_low_stock', v_cs,
    'consumable_expiring', v_exp,
    'run_at', now()
  );
end;
$$;

revoke all on function public.run_inventory_alerts() from public;
grant execute on function public.run_inventory_alerts() to service_role;

-- ============================================================================
-- 9. Cron schedules
--
-- Same idempotent pattern as 0012: drop the named job if it exists, then
-- (re)create it. Times are UTC; pg_cron does not honour TimeZone settings,
-- so 09:00 PHT is encoded as 01:00 UTC.
-- ============================================================================

do $$
begin
  if exists (select 1 from cron.job where jobname = 'tek-nurse-expire-requests') then
    perform cron.unschedule('tek-nurse-expire-requests');
  end if;
end
$$;

select cron.schedule(
  'tek-nurse-expire-requests',
  '*/15 * * * *',
  $$select public.run_request_expiry();$$
);

do $$
begin
  if exists (select 1 from cron.job where jobname = 'tek-nurse-overdue-cadence') then
    perform cron.unschedule('tek-nurse-overdue-cadence');
  end if;
end
$$;

select cron.schedule(
  'tek-nurse-overdue-cadence',
  '0 1 * * *',
  $$select public.run_overdue_cadence();$$
);

do $$
begin
  if exists (select 1 from cron.job where jobname = 'tek-nurse-inventory-alerts') then
    perform cron.unschedule('tek-nurse-inventory-alerts');
  end if;
end
$$;

select cron.schedule(
  'tek-nurse-inventory-alerts',
  '0 1 * * *',
  $$select public.run_inventory_alerts();$$
);
