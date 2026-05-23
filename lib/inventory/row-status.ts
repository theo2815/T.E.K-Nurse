// Pure status-derivation helpers. Server/client-safe — no Supabase imports.
// Mirrors the originals in `lib/supabase/queries/{equipment,consumables}.ts`,
// which now re-export from here so existing consumers keep working.

export type EquipmentRowStatusInput = {
  available_units: number;
  borrowed_units: number;
  maintenance_units: number;
  lost_units: number;
  low_stock_threshold: number;
};

export type EquipmentRowStatus =
  | "AVAILABLE"
  | "LOW STOCK"
  | "OUT"
  | "MAINTENANCE"
  | "LOST";

export function equipmentRowStatus(
  sku: EquipmentRowStatusInput,
): EquipmentRowStatus {
  if (sku.available_units === 0 && sku.borrowed_units === 0) {
    if (sku.maintenance_units > 0) return "MAINTENANCE";
    if (sku.lost_units > 0) return "LOST";
    return "OUT";
  }
  if (sku.available_units === 0) return "OUT";
  if (sku.available_units <= sku.low_stock_threshold) return "LOW STOCK";
  return "AVAILABLE";
}

export type ConsumableRowStatusInput = {
  total_remaining: number;
  low_stock_threshold: number;
  expiring_soon: boolean;
};

export type ConsumableRowStatus = "AVAILABLE" | "LOW STOCK" | "OUT";

export function consumableRowStatus(
  sku: ConsumableRowStatusInput,
): ConsumableRowStatus {
  if (sku.total_remaining === 0) return "OUT";
  if (sku.total_remaining < sku.low_stock_threshold) return "LOW STOCK";
  return "AVAILABLE";
}
