-- T.E.K Nurse — 0008_add_released_enum.sql
--
-- Part 1 of 2 for the pickup-code decouple (slice #4). Adds the new
-- 'RELEASED' enum value to both request status enums so that downstream
-- migration 0009 can reference it in CHECK constraints + triggers.
--
-- Postgres requires `ALTER TYPE ... ADD VALUE` to be COMMITTED before the
-- new value can be referenced in CHECK constraints, function bodies cast
-- against the type, etc. Supabase's SQL Editor wraps each script in a
-- single transaction, so this migration MUST be run as its own script,
-- separately from 0009_pickup_code.sql.
--
-- Semantics (new model after slice #4):
--   PENDING_PICKUP -> APPROVED  -- staff approved; pickup code generated;
--                                  units stay in reserved_units; student
--                                  receives notification with code.
--   APPROVED       -> RELEASED  -- student presented at counter; staff
--                                  verified code and clicked Release; unit
--                                  moves to borrowed_units; borrow_transaction
--                                  is created here (NOT on approval).
--   APPROVED       -> EXPIRED   -- pickup_expires_at passed without release.
--                                  Reservation released. (Cron in Phase 9.)
--
-- Apply: paste this file into the Supabase SQL Editor and click Run.
--        Then open 0009_pickup_code.sql in a NEW SQL Editor tab and run it.

alter type public.equipment_request_status  add value if not exists 'RELEASED';
alter type public.consumable_request_status add value if not exists 'RELEASED';
