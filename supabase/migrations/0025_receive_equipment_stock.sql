-- T.E.K Nurse — 0025_receive_equipment_stock.sql
--
-- Phase 7 shipped `staff_adjust_equipment_count` which moves units BETWEEN
-- buckets (available ↔ maintenance ↔ lost). That left a real gap: there was
-- no path to grow total stock when a new shipment arrived. The Edit-SKU form
-- correctly locks `total_units` because direct edits would break the
-- `equipment_units_invariant` CHECK constraint
-- (total = available + borrowed + reserved + maintenance + lost), but the
-- "use count moves" copy on that field was pointing at a flow that couldn't
-- actually do the job.
--
-- This migration adds `staff_receive_equipment_stock(sku_id, quantity, notes)`
-- — a SECURITY DEFINER RPC that atomically increments BOTH `total_units` AND
-- `available_units` by the same amount, preserving the invariant in a single
-- UPDATE. The accompanying audit row uses `action_type = 'stock_received'`.
--
-- Notes are REQUIRED (≥ 3 chars trimmed) because this is the only path that
-- grows total stock — forensic record-keeping matters more here than for
-- routine bucket shuffles.

create or replace function public.staff_receive_equipment_stock(
  p_sku_id   uuid,
  p_quantity int,
  p_notes    text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_old public.equipment_sku%rowtype;
  v_new public.equipment_sku%rowtype;
  v_notes text;
begin
  if not public.is_staff() then
    raise exception 'Staff only.' using errcode = 'insufficient_privilege';
  end if;

  if p_quantity is null or p_quantity < 1 then
    raise exception 'Quantity must be at least 1.' using errcode = 'check_violation';
  end if;

  v_notes := btrim(coalesce(p_notes, ''));
  if length(v_notes) < 3 then
    raise exception 'A note of at least 3 characters is required.'
      using errcode = 'check_violation';
  end if;

  select * into v_old from public.equipment_sku where id = p_sku_id for update;
  if v_old.id is null then
    raise exception 'Equipment SKU not found.' using errcode = 'no_data_found';
  end if;

  update public.equipment_sku
    set total_units     = total_units     + p_quantity,
        available_units = available_units + p_quantity
    where id = p_sku_id
    returning * into v_new;

  perform public.write_audit_log(
    'stock_received',
    'equipment_sku',
    p_sku_id,
    to_jsonb(v_old),
    to_jsonb(v_new),
    v_notes || ' [+' || p_quantity || ' to total & available]'
  );
end;
$$;

revoke all on function public.staff_receive_equipment_stock(uuid, int, text) from public;
grant execute on function public.staff_receive_equipment_stock(uuid, int, text) to authenticated;
