-- T.E.K Nurse — 0002_rls_policies.sql
-- Role-check helper + RLS policies on every table.
-- Tighter transition rules (e.g. "students can't self-approve a request") live
-- as BEFORE triggers in 0003, in addition to the WITH CHECK clauses below.

-- ============================================================================
-- Helper: is the current caller a staff user?
-- ============================================================================

create or replace function public.is_staff()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.users
    where id = auth.uid()
      and role = 'staff'
      and is_active = true
  );
$$;

revoke all on function public.is_staff() from public;
grant execute on function public.is_staff() to authenticated;

-- ============================================================================
-- Enable RLS on every public table
-- ============================================================================

alter table public.users                          enable row level security;
alter table public.equipment_sku                  enable row level security;
alter table public.consumable_sku                 enable row level security;
alter table public.consumable_lot                 enable row level security;
alter table public.borrow_request                 enable row level security;
alter table public.consumable_request             enable row level security;
alter table public.borrow_transaction             enable row level security;
alter table public.consumable_usage               enable row level security;
alter table public.consumable_usage_lot_deduction enable row level security;
alter table public.notification                   enable row level security;
alter table public.pending_email                  enable row level security;
alter table public.audit_log                      enable row level security;

-- Force RLS even for table owners (defense in depth — application connections
-- are not BYPASSRLS, but this also blocks accidental role changes).
alter table public.audit_log                      force row level security;
alter table public.pending_email                  force row level security;

-- ============================================================================
-- users
--   SELECT: own row, or staff sees all
--   UPDATE: own row (role/is_active changes blocked by trigger in 0003);
--           or staff can update anyone
--   INSERT: handled by handle_new_user trigger (SECURITY DEFINER), not clients
--   DELETE: nobody from client (CASCADE from auth.users handles real deletes)
-- ============================================================================

create policy users_select on public.users
  for select
  to authenticated
  using (id = auth.uid() or public.is_staff());

create policy users_update_self on public.users
  for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

create policy users_update_staff on public.users
  for update
  to authenticated
  using (public.is_staff())
  with check (public.is_staff());

-- ============================================================================
-- equipment_sku
--   SELECT: any authenticated user
--   INSERT/UPDATE/DELETE: staff only
-- ============================================================================

create policy equipment_sku_select on public.equipment_sku
  for select
  to authenticated
  using (true);

create policy equipment_sku_write_staff on public.equipment_sku
  for all
  to authenticated
  using (public.is_staff())
  with check (public.is_staff());

-- ============================================================================
-- consumable_sku
--   SELECT: any authenticated user
--   INSERT/UPDATE/DELETE: staff only
-- ============================================================================

create policy consumable_sku_select on public.consumable_sku
  for select
  to authenticated
  using (true);

create policy consumable_sku_write_staff on public.consumable_sku
  for all
  to authenticated
  using (public.is_staff())
  with check (public.is_staff());

-- ============================================================================
-- consumable_lot
--   Staff only — students never see lot identity, only aggregate stock.
-- ============================================================================

create policy consumable_lot_all_staff on public.consumable_lot
  for all
  to authenticated
  using (public.is_staff())
  with check (public.is_staff());

-- ============================================================================
-- borrow_request
--   SELECT: student sees own, staff sees all
--   INSERT: student creates own with status=PENDING_PICKUP
--   UPDATE: staff full; student can update own if status is still cancellable
--           (status transitions further restricted by trigger in 0003)
--   DELETE: nobody — terminal states use status, not row deletion
-- ============================================================================

create policy borrow_request_select on public.borrow_request
  for select
  to authenticated
  using (student_id = auth.uid() or public.is_staff());

create policy borrow_request_insert_student on public.borrow_request
  for insert
  to authenticated
  with check (
    student_id = auth.uid()
    and status = 'PENDING_PICKUP'
  );

create policy borrow_request_update_staff on public.borrow_request
  for update
  to authenticated
  using (public.is_staff())
  with check (public.is_staff());

create policy borrow_request_update_student on public.borrow_request
  for update
  to authenticated
  using (
    student_id = auth.uid()
    and status = 'PENDING_PICKUP'
  )
  with check (
    student_id = auth.uid()
    and status in ('PENDING_PICKUP', 'CANCELLED')
  );

-- ============================================================================
-- consumable_request
--   Same shape as borrow_request.
-- ============================================================================

create policy consumable_request_select on public.consumable_request
  for select
  to authenticated
  using (student_id = auth.uid() or public.is_staff());

create policy consumable_request_insert_student on public.consumable_request
  for insert
  to authenticated
  with check (
    student_id = auth.uid()
    and status = 'PENDING_PICKUP'
  );

create policy consumable_request_update_staff on public.consumable_request
  for update
  to authenticated
  using (public.is_staff())
  with check (public.is_staff());

create policy consumable_request_update_student on public.consumable_request
  for update
  to authenticated
  using (
    student_id = auth.uid()
    and status = 'PENDING_PICKUP'
  )
  with check (
    student_id = auth.uid()
    and status in ('PENDING_PICKUP', 'CANCELLED')
  );

-- ============================================================================
-- borrow_transaction
--   SELECT: student sees own, staff sees all
--   INSERT/UPDATE: staff only (walk-in or return logging)
--   DELETE: nobody
-- ============================================================================

create policy borrow_transaction_select on public.borrow_transaction
  for select
  to authenticated
  using (student_id = auth.uid() or public.is_staff());

create policy borrow_transaction_write_staff on public.borrow_transaction
  for all
  to authenticated
  using (public.is_staff())
  with check (public.is_staff());

-- ============================================================================
-- consumable_usage
--   Same shape as borrow_transaction.
-- ============================================================================

create policy consumable_usage_select on public.consumable_usage
  for select
  to authenticated
  using (student_id = auth.uid() or public.is_staff());

create policy consumable_usage_write_staff on public.consumable_usage
  for all
  to authenticated
  using (public.is_staff())
  with check (public.is_staff());

-- ============================================================================
-- consumable_usage_lot_deduction
--   SELECT: follows the parent consumable_usage visibility
--   Writes: only from FIFO trigger (SECURITY DEFINER) — no client policy
-- ============================================================================

create policy consumable_usage_lot_deduction_select on public.consumable_usage_lot_deduction
  for select
  to authenticated
  using (
    exists (
      select 1 from public.consumable_usage cu
      where cu.id = consumable_usage_lot_deduction.consumable_usage_id
        and (cu.student_id = auth.uid() or public.is_staff())
    )
  );

-- ============================================================================
-- notification
--   SELECT/UPDATE: own rows; staff has read-only full access for support
--   INSERT: from triggers (SECURITY DEFINER), not clients
-- ============================================================================

create policy notification_select_own on public.notification
  for select
  to authenticated
  using (user_id = auth.uid() or public.is_staff());

create policy notification_update_own on public.notification
  for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ============================================================================
-- pending_email
--   Server-only. Clients have no access; the Phase 8 worker uses the service
--   role key (which bypasses RLS by design).
--   No policies defined => RLS denies by default.
-- ============================================================================

-- (intentionally no client policies)

-- ============================================================================
-- audit_log
--   SELECT: staff only
--   INSERT/UPDATE/DELETE: nobody from client. SECURITY DEFINER triggers write.
-- ============================================================================

create policy audit_log_select_staff on public.audit_log
  for select
  to authenticated
  using (public.is_staff());
