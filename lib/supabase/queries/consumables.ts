import { createClient } from "@/lib/supabase/server";

export type ConsumableSku = {
  id: string;
  name: string;
  description: string | null;
  photo_url: string | null;
  qr_code: string;
  unit: string;
  low_stock_threshold: number;
  expiration_warning_days: number;
  per_request_max_quantity: number;
};

export type ConsumableLot = {
  id: string;
  consumable_sku_id: string;
  lot_number: string | null;
  received_date: string;
  expiration_date: string;
  quantity_received: number;
  quantity_remaining: number;
  is_depleted: boolean;
};

export type ConsumableSkuWithStock = ConsumableSku & {
  /** Sum of quantity_remaining across non-depleted lots. */
  total_remaining: number;
  /** Earliest expiration_date across non-depleted lots with remaining > 0. */
  earliest_expiration: string | null;
  /** Days until earliest_expiration. Negative if already expired. Null if no active lots. */
  days_until_expiry: number | null;
  /** True if any non-depleted lot's expiration is within expiration_warning_days. */
  expiring_soon: boolean;
};

export type ConsumableFilter =
  | "ALL"
  | "IN_STOCK"
  | "LOW_STOCK"
  | "EXPIRING";

const SKU_COLUMNS =
  "id, name, description, photo_url, qr_code, unit, low_stock_threshold, expiration_warning_days, per_request_max_quantity";

const LOT_COLUMNS =
  "id, consumable_sku_id, lot_number, received_date, expiration_date, quantity_received, quantity_remaining, is_depleted";

function startOfTodayUtc(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

function daysBetween(fromIsoDate: string): number {
  const start = startOfTodayUtc();
  const target = new Date(`${fromIsoDate}T00:00:00Z`);
  return Math.round((target.getTime() - start.getTime()) / 86_400_000);
}

function aggregate(
  sku: ConsumableSku,
  lots: ConsumableLot[],
): ConsumableSkuWithStock {
  const active = lots.filter((l) => !l.is_depleted && l.quantity_remaining > 0);
  const total_remaining = active.reduce((n, l) => n + l.quantity_remaining, 0);
  const earliest = active
    .map((l) => l.expiration_date)
    .sort()[0] ?? null;
  const days_until_expiry = earliest ? daysBetween(earliest) : null;
  const expiring_soon =
    days_until_expiry !== null &&
    days_until_expiry <= sku.expiration_warning_days;
  return {
    ...sku,
    total_remaining,
    earliest_expiration: earliest,
    days_until_expiry,
    expiring_soon,
  };
}

export async function listConsumableSkus(opts: {
  filter?: ConsumableFilter;
  search?: string;
} = {}): Promise<ConsumableSkuWithStock[]> {
  const supabase = await createClient();

  let skuQuery = supabase
    .from("consumable_sku")
    .select(SKU_COLUMNS)
    .order("qr_code");

  const search = opts.search?.trim();
  if (search) {
    const escaped = search.replace(/[%_,]/g, (m) => `\\${m}`);
    const pattern = `%${escaped}%`;
    skuQuery = skuQuery.or(`name.ilike.${pattern},qr_code.ilike.${pattern}`);
  }

  const { data: skuRows, error: skuErr } = await skuQuery;
  if (skuErr) throw skuErr;
  const skus = (skuRows ?? []) as ConsumableSku[];
  if (skus.length === 0) return [];

  const { data: lotRows, error: lotErr } = await supabase
    .from("consumable_lot")
    .select(LOT_COLUMNS)
    .in(
      "consumable_sku_id",
      skus.map((s) => s.id),
    )
    .eq("is_depleted", false);
  if (lotErr) throw lotErr;
  const lots = (lotRows ?? []) as ConsumableLot[];

  const byId = new Map<string, ConsumableLot[]>();
  for (const lot of lots) {
    const arr = byId.get(lot.consumable_sku_id) ?? [];
    arr.push(lot);
    byId.set(lot.consumable_sku_id, arr);
  }

  const enriched = skus.map((sku) => aggregate(sku, byId.get(sku.id) ?? []));

  switch (opts.filter ?? "ALL") {
    case "IN_STOCK":
      return enriched.filter((s) => s.total_remaining > 0);
    case "LOW_STOCK":
      return enriched.filter((s) => s.total_remaining < s.low_stock_threshold);
    case "EXPIRING":
      return enriched.filter((s) => s.expiring_soon);
    default:
      return enriched;
  }
}

export async function getConsumableSkuByQr(
  qr: string,
): Promise<{ sku: ConsumableSkuWithStock; lots: ConsumableLot[] } | null> {
  const supabase = await createClient();

  const { data: skuRow, error: skuErr } = await supabase
    .from("consumable_sku")
    .select(SKU_COLUMNS)
    .eq("qr_code", qr)
    .maybeSingle();
  if (skuErr) throw skuErr;
  if (!skuRow) return null;
  const sku = skuRow as ConsumableSku;

  const { data: lotRows, error: lotErr } = await supabase
    .from("consumable_lot")
    .select(LOT_COLUMNS)
    .eq("consumable_sku_id", sku.id)
    .order("expiration_date", { ascending: true });
  if (lotErr) throw lotErr;
  const lots = (lotRows ?? []) as ConsumableLot[];

  return {
    sku: aggregate(sku, lots),
    lots,
  };
}

export type ConsumableSummary = {
  sku_count: number;
  in_stock_count: number;
  low_stock_count: number;
};

export async function getConsumableSummary(): Promise<ConsumableSummary> {
  const all = await listConsumableSkus({ filter: "ALL" });
  return {
    sku_count: all.length,
    in_stock_count: all.filter((s) => s.total_remaining > 0).length,
    low_stock_count: all.filter((s) => s.total_remaining < s.low_stock_threshold)
      .length,
  };
}

export type ConsumableActivity = {
  when: string;
  student_name: string;
  quantity_used: number;
};

/** Most recent consumable_usage for the SKU, or null. Used by staff right-column. */
export async function getLastConsumableUsage(
  skuId: string,
): Promise<ConsumableActivity | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("consumable_usage")
    .select("used_at, quantity_used, student:student_id ( full_name )")
    .eq("consumable_sku_id", skuId)
    .order("used_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;

  const row = data as unknown as {
    used_at: string;
    quantity_used: number;
    student: { full_name: string } | { full_name: string }[] | null;
  };
  const student = Array.isArray(row.student) ? row.student[0] : row.student;
  return {
    when: row.used_at,
    student_name: student?.full_name ?? "Unknown",
    quantity_used: row.quantity_used,
  };
}

export function consumableRowStatus(
  sku: Pick<
    ConsumableSkuWithStock,
    "total_remaining" | "low_stock_threshold" | "expiring_soon"
  >,
):
  | "AVAILABLE"
  | "LOW STOCK"
  | "OUT" {
  if (sku.total_remaining === 0) return "OUT";
  if (sku.total_remaining < sku.low_stock_threshold) return "LOW STOCK";
  return "AVAILABLE";
}
