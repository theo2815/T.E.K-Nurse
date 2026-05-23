-- T.E.K Nurse — 0010_inventory_management.sql
-- Phase 7 — staff inventory CRUD.
--
-- Adds:
--   1. sku-photos Storage bucket + RLS (public read, staff-only writes)
--   2. created_by BEFORE INSERT triggers on equipment_sku / consumable_sku /
--      consumable_lot — stamps auth.uid() so the form doesn't have to.
--   3. staff_adjust_equipment_count() SECURITY DEFINER RPC — atomic bucket
--      move, audit-log entry with semantic action_type (count_adjusted /
--      item_marked_lost / item_marked_maintenance).
--   4. mark_lot_depleted() SECURITY DEFINER RPC — sets quantity_remaining=0 +
--      is_depleted=true with required reason; writes lot_depleted audit.
--   5. AFTER INSERT/UPDATE/DELETE audit triggers on equipment_sku /
--      consumable_sku / consumable_lot. Trigger skips audits when only count
--      buckets / quantity_remaining / is_depleted changed — those paths
--      (existing borrow/return triggers in 0003 + this file's RPCs) write
--      their own semantic audit entries.
--   6. BEFORE DELETE triggers that RAISE with friendly text when the row is
--      still referenced (per Edge Case 10 — block, do not soft-delete).

-- ============================================================================
-- 1. sku-photos Storage bucket
--    Public read so plain <img>/next/image can render without signed URLs.
--    Writes gated by is_staff(). RLS on storage.objects.
-- ============================================================================

insert into storage.buckets (id, name, public)
values ('sku-photos', 'sku-photos', true)
on conflict (id) do nothing;

drop policy if exists sku_photos_public_select on storage.objects;
create policy sku_photos_public_select on storage.objects
  for select
  to public
  using (bucket_id = 'sku-photos');

drop policy if exists sku_photos_staff_insert on storage.objects;
create policy sku_photos_staff_insert on storage.objects
  for insert
  to authenticated
  with check (bucket_id = 'sku-photos' and public.is_staff());

drop policy if exists sku_photos_staff_update on storage.objects;
create policy sku_photos_staff_update on storage.objects
  for update
  to authenticated
  using (bucket_id = 'sku-photos' and public.is_staff())
  with check (bucket_id = 'sku-photos' and public.is_staff());

drop policy if exists sku_photos_staff_delete on storage.objects;
create policy sku_photos_staff_delete on storage.objects
  for delete
  to authenticated
  using (bucket_id = 'sku-photos' and public.is_staff());

-- ============================================================================
-- 2. created_by stampers — BEFORE INSERT on each table.
--    Lets server actions / RLS-allowed inserts skip writing created_by.
-- ============================================================================

create or replace function public.tr_stamp_created_by()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.created_by is null then
    new.created_by := auth.uid();
  end if;
  return new;
end;
$$;

drop trigger if exists equipment_sku_stamp_created_by on public.equipment_sku;
create trigger equipment_sku_stamp_created_by
  before insert on public.equipment_sku
  for each row execute function public.tr_stamp_created_by();

drop trigger if exists consumable_sku_stamp_created_by on public.consumable_sku;
create trigger consumable_sku_stamp_created_by
  before insert on public.consumable_sku
  for each row execute function public.tr_stamp_created_by();

drop trigger if exists consumable_lot_stamp_created_by on public.consumable_lot;
create trigger consumable_lot_stamp_created_by
  before insert on public.consumable_lot
  for each row execute function public.tr_stamp_created_by();

-- ============================================================================
-- 3. staff_adjust_equipment_count()
--    Atomic bucket move. Validates source bucket has enough stock, applies the
--    move in a single UPDATE (preserves equipment_units_invariant), writes the
--    semantic audit log entry.
--
--    Buckets accepted: 'available' | 'maintenance' | 'lost'
--    NOT accepted: 'borrowed' / 'reserved' — those are driven by the borrow
--    flow's triggers, never by direct staff edits.
-- ============================================================================

create or replace function public.staff_adjust_equipment_count(
  p_sku_id      uuid,
  p_from_bucket text,
  p_to_bucket   text,
  p_quantity    int,
  p_notes       text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_old public.equipment_sku%rowtype;
  v_new public.equipment_sku%rowtype;
  v_action text;
  v_available int;
  v_maintenance int;
  v_lost int;
begin
  if not public.is_staff() then
    raise exception 'Staff only.' using errcode = 'insufficient_privilege';
  end if;

  if p_quantity is null or p_quantity < 1 then
    raise exception 'Quantity must be at least 1.' using errcode = 'check_violation';
  end if;

  if p_from_bucket = p_to_bucket then
    raise exception 'From-bucket and to-bucket must differ.' using errcode = 'check_violation';
  end if;

  if p_from_bucket not in ('available', 'maintenance', 'lost')
     or p_to_bucket not in ('available', 'maintenance', 'lost') then
    raise exception 'Buckets must be one of: available, maintenance, lost.'
      using errcode = 'check_violation';
  end if;

  select * into v_old from public.equipment_sku where id = p_sku_id for update;
  if v_old.id is null then
    raise exception 'Equipment SKU not found.' using errcode = 'no_data_found';
  end if;

  v_available   := v_old.available_units;
  v_maintenance := v_old.maintenance_units;
  v_lost        := v_old.lost_units;

  if p_from_bucket = 'available'   and v_available   < p_quantity then
    raise exception 'Not enough units in Available (% < %).', v_available, p_quantity
      using errcode = 'check_violation';
  elsif p_from_bucket = 'maintenance' and v_maintenance < p_quantity then
    raise exception 'Not enough units in Maintenance (% < %).', v_maintenance, p_quantity
      using errcode = 'check_violation';
  elsif p_from_bucket = 'lost'        and v_lost        < p_quantity then
    raise exception 'Not enough units in Lost (% < %).', v_lost, p_quantity
      using errcode = 'check_violation';
  end if;

  update public.equipment_sku
    set
      available_units   = available_units
                        - case when p_from_bucket = 'available'   then p_quantity else 0 end
                        + case when p_to_bucket   = 'available'   then p_quantity else 0 end,
      maintenance_units = maintenance_units
                        - case when p_from_bucket = 'maintenance' then p_quantity else 0 end
                        + case when p_to_bucket   = 'maintenance' then p_quantity else 0 end,
      lost_units        = lost_units
                        - case when p_from_bucket = 'lost'        then p_quantity else 0 end
                        + case when p_to_bucket   = 'lost'        then p_quantity else 0 end
    where id = p_sku_id
    returning * into v_new;

  v_action :=
    case
      when p_to_bucket   = 'maintenance' then 'item_marked_maintenance'
      when p_to_bucket   = 'lost'        then 'item_marked_lost'
      when p_from_bucket = 'maintenance' then 'count_adjusted'  -- recovery
      when p_from_bucket = 'lost'        then 'count_adjusted'  -- recovery
      else 'count_adjusted'
    end;

  perform public.write_audit_log(
    v_action,
    'equipment_sku',
    p_sku_id,
    to_jsonb(v_old),
    to_jsonb(v_new),
    coalesce(p_notes, '') || ' [' || p_from_bucket || ' → ' || p_to_bucket
      || ', qty=' || p_quantity || ']'
  );
end;
$$;

revoke all on function public.staff_adjust_equipment_count(uuid, text, text, int, text) from public;
grant execute on function public.staff_adjust_equipment_count(uuid, text, text, int, text) to authenticated;

-- ============================================================================
-- 4. mark_lot_depleted()
--    Manual override: flushes quantity_remaining → 0 and is_depleted → true.
--    Reason is required (≥ 3 chars trimmed) — written into audit_log.notes.
-- ============================================================================

create or replace function public.staff_mark_lot_depleted(
  p_lot_id uuid,
  p_reason text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_old public.consumable_lot%rowtype;
  v_new public.consumable_lot%rowtype;
begin
  if not public.is_staff() then
    raise exception 'Staff only.' using errcode = 'insufficient_privilege';
  end if;

  if p_reason is null or length(btrim(p_reason)) < 3 then
    raise exception 'A reason of at least 3 characters is required.'
      using errcode = 'check_violation';
  end if;

  select * into v_old from public.consumable_lot where id = p_lot_id for update;
  if v_old.id is null then
    raise exception 'Lot not found.' using errcode = 'no_data_found';
  end if;

  if v_old.is_depleted then
    raise exception 'Lot is already depleted.' using errcode = 'check_violation';
  end if;

  update public.consumable_lot
    set quantity_remaining = 0,
        is_depleted        = true
    where id = p_lot_id
    returning * into v_new;

  perform public.write_audit_log(
    'lot_depleted',
    'consumable_lot',
    p_lot_id,
    to_jsonb(v_old),
    to_jsonb(v_new),
    btrim(p_reason)
  );
end;
$$;

revoke all on function public.staff_mark_lot_depleted(uuid, text) from public;
grant execute on function public.staff_mark_lot_depleted(uuid, text) to authenticated;

-- ============================================================================
-- 5. CRUD audit triggers on equipment_sku
--    INSERT → sku_created
--    UPDATE → sku_edited (only when non-count fields changed; count moves are
--             owned by borrow flow triggers + staff_adjust_equipment_count)
--    DELETE → sku_deleted
-- ============================================================================

create or replace function public.tr_equipment_sku_after_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.write_audit_log(
    'sku_created', 'equipment_sku', new.id, null, to_jsonb(new)
  );
  return new;
end;
$$;

drop trigger if exists equipment_sku_after_insert on public.equipment_sku;
create trigger equipment_sku_after_insert
  after insert on public.equipment_sku
  for each row execute function public.tr_equipment_sku_after_insert();

create or replace function public.tr_equipment_sku_after_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (
    new.name                is distinct from old.name
    or new.description      is distinct from old.description
    or new.photo_url        is distinct from old.photo_url
    or new.qr_code          is distinct from old.qr_code
    or new.low_stock_threshold is distinct from old.low_stock_threshold
    or new.location         is distinct from old.location
    or new.total_units      is distinct from old.total_units
  ) then
    perform public.write_audit_log(
      'sku_edited', 'equipment_sku', new.id, to_jsonb(old), to_jsonb(new)
    );
  end if;
  return new;
end;
$$;

drop trigger if exists equipment_sku_after_update on public.equipment_sku;
create trigger equipment_sku_after_update
  after update on public.equipment_sku
  for each row execute function public.tr_equipment_sku_after_update();

create or replace function public.tr_equipment_sku_after_delete()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.write_audit_log(
    'sku_deleted', 'equipment_sku', old.id, to_jsonb(old), null
  );
  return old;
end;
$$;

drop trigger if exists equipment_sku_after_delete on public.equipment_sku;
create trigger equipment_sku_after_delete
  after delete on public.equipment_sku
  for each row execute function public.tr_equipment_sku_after_delete();

-- ============================================================================
-- 6. CRUD audit triggers on consumable_sku
--    consumable_sku has no count buckets, so every UPDATE is staff-driven
--    metadata.
-- ============================================================================

create or replace function public.tr_consumable_sku_after_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.write_audit_log(
    'sku_created', 'consumable_sku', new.id, null, to_jsonb(new)
  );
  return new;
end;
$$;

drop trigger if exists consumable_sku_after_insert on public.consumable_sku;
create trigger consumable_sku_after_insert
  after insert on public.consumable_sku
  for each row execute function public.tr_consumable_sku_after_insert();

create or replace function public.tr_consumable_sku_after_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (
    new.name                     is distinct from old.name
    or new.description           is distinct from old.description
    or new.photo_url             is distinct from old.photo_url
    or new.qr_code               is distinct from old.qr_code
    or new.unit                  is distinct from old.unit
    or new.low_stock_threshold   is distinct from old.low_stock_threshold
    or new.expiration_warning_days is distinct from old.expiration_warning_days
    or new.per_request_max_quantity is distinct from old.per_request_max_quantity
  ) then
    perform public.write_audit_log(
      'sku_edited', 'consumable_sku', new.id, to_jsonb(old), to_jsonb(new)
    );
  end if;
  return new;
end;
$$;

drop trigger if exists consumable_sku_after_update on public.consumable_sku;
create trigger consumable_sku_after_update
  after update on public.consumable_sku
  for each row execute function public.tr_consumable_sku_after_update();

create or replace function public.tr_consumable_sku_after_delete()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.write_audit_log(
    'sku_deleted', 'consumable_sku', old.id, to_jsonb(old), null
  );
  return old;
end;
$$;

drop trigger if exists consumable_sku_after_delete on public.consumable_sku;
create trigger consumable_sku_after_delete
  after delete on public.consumable_sku
  for each row execute function public.tr_consumable_sku_after_delete();

-- ============================================================================
-- 7. CRUD audit triggers on consumable_lot
--    INSERT → lot_created
--    UPDATE → lot_edited ONLY when metadata (lot_number/received_date/
--             expiration_date) changed. Quantity changes are driven by the
--             FIFO trigger (audits as 'consumable_used') or by
--             staff_mark_lot_depleted (audits as 'lot_depleted'). Avoid
--             double-logging by skipping those cases here.
--    DELETE → lot_deleted
-- ============================================================================

create or replace function public.tr_consumable_lot_after_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.write_audit_log(
    'lot_created', 'consumable_lot', new.id, null, to_jsonb(new)
  );
  return new;
end;
$$;

drop trigger if exists consumable_lot_after_insert on public.consumable_lot;
create trigger consumable_lot_after_insert
  after insert on public.consumable_lot
  for each row execute function public.tr_consumable_lot_after_insert();

create or replace function public.tr_consumable_lot_after_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (
    new.lot_number      is distinct from old.lot_number
    or new.received_date   is distinct from old.received_date
    or new.expiration_date is distinct from old.expiration_date
  ) then
    perform public.write_audit_log(
      'lot_edited', 'consumable_lot', new.id, to_jsonb(old), to_jsonb(new)
    );
  end if;
  return new;
end;
$$;

drop trigger if exists consumable_lot_after_update on public.consumable_lot;
create trigger consumable_lot_after_update
  after update on public.consumable_lot
  for each row execute function public.tr_consumable_lot_after_update();

create or replace function public.tr_consumable_lot_after_delete()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.write_audit_log(
    'lot_deleted', 'consumable_lot', old.id, to_jsonb(old), null
  );
  return old;
end;
$$;

drop trigger if exists consumable_lot_after_delete on public.consumable_lot;
create trigger consumable_lot_after_delete
  after delete on public.consumable_lot
  for each row execute function public.tr_consumable_lot_after_delete();

-- ============================================================================
-- 8. BEFORE DELETE referential-block triggers.
--    Per Edge Case 10 — hard-delete only when truly unreferenced. The FK
--    `on delete restrict` already blocks deletion when history rows exist,
--    but its error message ("update or delete on table … violates foreign key
--    constraint …") is opaque; these triggers surface the real reason.
-- ============================================================================

create or replace function public.tr_equipment_sku_before_delete()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_active_requests int;
  v_open_borrows    int;
  v_total int;
begin
  v_total := old.borrowed_units + old.reserved_units
           + old.maintenance_units + old.lost_units;
  if v_total > 0 then
    raise exception
      'Cannot delete SKU "%": units are still on the books (borrowed=%, reserved=%, maintenance=%, lost=%). Recover or write them off first.',
      old.name, old.borrowed_units, old.reserved_units, old.maintenance_units, old.lost_units
      using errcode = 'foreign_key_violation';
  end if;

  select count(*) into v_active_requests
    from public.borrow_request
    where equipment_sku_id = old.id
      and status in ('PENDING_PICKUP', 'APPROVED');
  if v_active_requests > 0 then
    raise exception
      'Cannot delete SKU "%": % active request(s) still reference it.',
      old.name, v_active_requests
      using errcode = 'foreign_key_violation';
  end if;

  select count(*) into v_open_borrows
    from public.borrow_transaction
    where equipment_sku_id = old.id
      and status in ('BORROWED', 'OVERDUE');
  if v_open_borrows > 0 then
    raise exception
      'Cannot delete SKU "%": % open borrow(s) still reference it.',
      old.name, v_open_borrows
      using errcode = 'foreign_key_violation';
  end if;

  return old;
end;
$$;

drop trigger if exists equipment_sku_before_delete on public.equipment_sku;
create trigger equipment_sku_before_delete
  before delete on public.equipment_sku
  for each row execute function public.tr_equipment_sku_before_delete();

create or replace function public.tr_consumable_sku_before_delete()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_active_requests int;
  v_active_lots     int;
begin
  select count(*) into v_active_requests
    from public.consumable_request
    where consumable_sku_id = old.id
      and status in ('PENDING_PICKUP', 'APPROVED');
  if v_active_requests > 0 then
    raise exception
      'Cannot delete SKU "%": % active request(s) still reference it.',
      old.name, v_active_requests
      using errcode = 'foreign_key_violation';
  end if;

  select count(*) into v_active_lots
    from public.consumable_lot
    where consumable_sku_id = old.id
      and is_depleted = false
      and quantity_remaining > 0;
  if v_active_lots > 0 then
    raise exception
      'Cannot delete SKU "%": % active lot(s) still have stock. Mark them depleted first.',
      old.name, v_active_lots
      using errcode = 'foreign_key_violation';
  end if;

  return old;
end;
$$;

drop trigger if exists consumable_sku_before_delete on public.consumable_sku;
create trigger consumable_sku_before_delete
  before delete on public.consumable_sku
  for each row execute function public.tr_consumable_sku_before_delete();

create or replace function public.tr_consumable_lot_before_delete()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_deductions int;
begin
  select count(*) into v_deductions
    from public.consumable_usage_lot_deduction
    where lot_id = old.id;
  if v_deductions > 0 then
    raise exception
      'Cannot delete lot "%": % usage record(s) still reference it. Mark it depleted instead.',
      coalesce(old.lot_number, old.id::text), v_deductions
      using errcode = 'foreign_key_violation';
  end if;

  return old;
end;
$$;

drop trigger if exists consumable_lot_before_delete on public.consumable_lot;
create trigger consumable_lot_before_delete
  before delete on public.consumable_lot
  for each row execute function public.tr_consumable_lot_before_delete();
