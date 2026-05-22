-- T.E.K Nurse — 0004_add_declined_enum.sql
--
-- Part 1 of 2 for the DECLINED status feature. This script adds the new
-- 'DECLINED' enum value to both request status enums.
--
-- Postgres requires `ALTER TYPE ... ADD VALUE` to be COMMITTED before the
-- new value can be referenced in CHECK constraints, function bodies cast
-- against the type, etc. Supabase's SQL Editor wraps each script in a
-- single transaction, so this migration MUST be run as its own script,
-- separately from 0005_request_declined.sql.
--
-- Apply: paste this file into the Supabase SQL Editor and click Run.
--        Then open 0005_request_declined.sql in a NEW SQL Editor tab
--        and run that one.

alter type public.equipment_request_status  add value if not exists 'DECLINED';
alter type public.consumable_request_status add value if not exists 'DECLINED';
