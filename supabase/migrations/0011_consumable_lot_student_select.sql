-- T.E.K Nurse — 0011_consumable_lot_student_select.sql
--
-- Fixes a UX bug surfaced in Phase 7: students saw every consumable as OUT,
-- even when staff could see active lots with stock remaining.
--
-- Root cause: `consumable_lot_all_staff` in 0002 used `for all` (which
-- includes SELECT) gated to staff. Students could not read any lot rows, so
-- the aggregator in lib/supabase/queries/consumables.ts summed zero lots and
-- produced `total_remaining = 0` regardless of actual stock.
--
-- The original intent (comment in 0002: "students never see lot identity,
-- only aggregate stock") didn't match the shipped UI — the student-side
-- consumable detail page renders a read-only FIFO lot table (lot number,
-- expires, remaining) for transparency, so students do need read access.
--
-- This migration adds a SELECT-only policy for authenticated users.
-- Postgres RLS combines policies for the same operation with OR, so the
-- existing staff-only `for all` policy keeps INSERT / UPDATE / DELETE
-- gated to staff while SELECT becomes open to any signed-in user.
--
-- Writes are still staff-only. Audit log is unaffected.

create policy consumable_lot_select on public.consumable_lot
  for select
  to authenticated
  using (true);
