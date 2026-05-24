-- T.E.K Nurse — 0020_admin_role.sql
-- Phase 11.5d. Adds the `admin` enum value to public.user_role.
--
-- Why a standalone migration: Postgres won't let you add a new enum value and
-- then reference it from another statement in the same transaction. The RPCs
-- and helpers that USE the new value live in 0021_admin_rpcs.sql so they run
-- in a separate transaction. Apply order: 0020 first, then 0021.
--
-- Semantics: admin is a strict superset of staff. Anything staff can do, admin
-- can do, plus admin gets the user-management surface at /staff/admin/users.
-- All staff_id, audit, and is_active gates that already apply to staff apply
-- to admin too. There is no separate "admin" identity column.

alter type public.user_role add value if not exists 'admin';
