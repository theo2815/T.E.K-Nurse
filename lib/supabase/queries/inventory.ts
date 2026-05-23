import { createClient } from "@/lib/supabase/server";
import type {
  ConsumableLot,
  ConsumableSku,
} from "@/lib/supabase/queries/consumables";
import type { EquipmentSku } from "@/lib/supabase/queries/equipment";

const EQUIPMENT_COLUMNS =
  "id, name, description, photo_url, qr_code, total_units, available_units, borrowed_units, reserved_units, maintenance_units, lost_units, low_stock_threshold, location";

const CONSUMABLE_COLUMNS =
  "id, name, description, photo_url, qr_code, unit, low_stock_threshold, expiration_warning_days, per_request_max_quantity";

const LOT_COLUMNS =
  "id, consumable_sku_id, lot_number, received_date, expiration_date, quantity_received, quantity_remaining, is_depleted";

export async function getEquipmentSkuById(
  id: string,
): Promise<EquipmentSku | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("equipment_sku")
    .select(EQUIPMENT_COLUMNS)
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data as EquipmentSku | null;
}

export async function getConsumableSkuById(
  id: string,
): Promise<ConsumableSku | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("consumable_sku")
    .select(CONSUMABLE_COLUMNS)
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data as ConsumableSku | null;
}

export async function getConsumableLotById(
  id: string,
): Promise<ConsumableLot | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("consumable_lot")
    .select(LOT_COLUMNS)
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data as ConsumableLot | null;
}

/** All lots for a SKU, ordered by expiration ASC (FIFO), depleted last. */
export async function listConsumableLotsForSku(
  skuId: string,
): Promise<ConsumableLot[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("consumable_lot")
    .select(LOT_COLUMNS)
    .eq("consumable_sku_id", skuId)
    .order("is_depleted", { ascending: true })
    .order("expiration_date", { ascending: true });
  if (error) throw error;
  return (data ?? []) as ConsumableLot[];
}

/** True if a lot has any usage deductions — i.e. cannot be hard-deleted. */
export async function lotHasUsage(lotId: string): Promise<boolean> {
  const supabase = await createClient();
  const { count, error } = await supabase
    .from("consumable_usage_lot_deduction")
    .select("id", { count: "exact", head: true })
    .eq("lot_id", lotId);
  if (error) throw error;
  return (count ?? 0) > 0;
}
