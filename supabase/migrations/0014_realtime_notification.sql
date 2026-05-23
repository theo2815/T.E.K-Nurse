-- T.E.K Nurse — 0014_realtime_notification.sql
--
-- Adds `public.notification` to the `supabase_realtime` publication so the
-- bell + popover + notifications page receive INSERT / UPDATE events in real
-- time. Without this, the client subscribes happily but the Realtime server
-- never broadcasts row changes from this table, and new notifications only
-- surface when the next server-side `router.refresh()` re-fetches the list.
--
-- The other Realtime-subscribed tables (`borrow_transaction`,
-- `borrow_request`, `consumable_request`) were added to the publication via
-- the Supabase Dashboard during Phase 6 / 8 — `notification` was missed when
-- Phase 8a shipped the bell.
--
-- Idempotent: skips the alter when the table is already in the publication.

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'notification'
  ) then
    alter publication supabase_realtime add table public.notification;
  end if;
end $$;
