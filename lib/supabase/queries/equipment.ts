import { createClient } from "@/lib/supabase/server";

export type EquipmentSku = {
  id: string;
  name: string;
  description: string | null;
  photo_url: string | null;
  qr_code: string;
  total_units: number;
  available_units: number;
  borrowed_units: number;
  reserved_units: number;
  maintenance_units: number;
  lost_units: number;
  low_stock_threshold: number;
  location: string | null;
};

export type EquipmentFilter =
  | "ALL"
  | "AVAILABLE"
  | "OUT"
  | "MAINTENANCE";

const COLUMNS =
  "id, name, description, photo_url, qr_code, total_units, available_units, borrowed_units, reserved_units, maintenance_units, lost_units, low_stock_threshold, location";

export async function listEquipmentSkus(opts: {
  filter?: EquipmentFilter;
  search?: string;
} = {}): Promise<EquipmentSku[]> {
  const supabase = await createClient();
  let query = supabase.from("equipment_sku").select(COLUMNS).order("qr_code");

  const search = opts.search?.trim();
  if (search) {
    const escaped = search.replace(/[%_,]/g, (m) => `\\${m}`);
    const pattern = `%${escaped}%`;
    query = query.or(`name.ilike.${pattern},qr_code.ilike.${pattern}`);
  }

  switch (opts.filter ?? "ALL") {
    case "AVAILABLE":
      query = query.gt("available_units", 0);
      break;
    case "OUT":
      query = query.eq("available_units", 0).gt("borrowed_units", 0);
      break;
    case "MAINTENANCE":
      query = query.gt("maintenance_units", 0);
      break;
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as EquipmentSku[];
}

export async function getEquipmentSkuByQr(
  qr: string,
): Promise<EquipmentSku | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("equipment_sku")
    .select(COLUMNS)
    .eq("qr_code", qr)
    .maybeSingle();
  if (error) throw error;
  return data as EquipmentSku | null;
}

export type EquipmentCountSummary = {
  total: number;
  available: number;
  borrowed: number;
};

export async function getEquipmentSummary(): Promise<EquipmentCountSummary> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("equipment_sku")
    .select("total_units, available_units, borrowed_units");
  if (error) throw error;
  const rows = (data ?? []) as Array<
    Pick<EquipmentSku, "total_units" | "available_units" | "borrowed_units">
  >;
  return {
    total: rows.reduce((n, r) => n + r.total_units, 0),
    available: rows.reduce((n, r) => n + r.available_units, 0),
    borrowed: rows.reduce((n, r) => n + r.borrowed_units, 0),
  };
}

export type EquipmentActivity = {
  status: "BORROWED" | "RETURNED" | "OVERDUE" | "LOST" | "RETURNED_LATE";
  when: string;
  student_name: string;
  quantity: number;
};

/** Most recent borrow_transaction for the SKU, or null. Used by staff right-column. */
export async function getLastEquipmentActivity(
  skuId: string,
): Promise<EquipmentActivity | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("borrow_transaction")
    .select(
      "status, borrowed_at, returned_at, quantity, student:student_id ( full_name )",
    )
    .eq("equipment_sku_id", skuId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;

  const row = data as unknown as {
    status: EquipmentActivity["status"];
    borrowed_at: string;
    returned_at: string | null;
    quantity: number;
    student: { full_name: string } | { full_name: string }[] | null;
  };
  const student = Array.isArray(row.student) ? row.student[0] : row.student;
  return {
    status: row.status,
    when:
      row.status === "RETURNED" || row.status === "RETURNED_LATE"
        ? row.returned_at ?? row.borrowed_at
        : row.borrowed_at,
    student_name: student?.full_name ?? "Unknown",
    quantity: row.quantity,
  };
}

export { equipmentRowStatus } from "@/lib/inventory/row-status";
