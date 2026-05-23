import { createClient } from "@/lib/supabase/server";

export type SkuSearchRow = {
  type: "equipment" | "consumable";
  qr_code: string;
  name: string;
  photo_url: string | null;
  /** Equipment: location · Consumable: per_request_max_quantity caption */
  caption: string | null;
};

const EQ_LIMIT = 8;
const CN_LIMIT = 8;

/**
 * Unified SKU search across equipment_sku + consumable_sku for the /staff/scan
 * fallback picker. ilike on (qr_code, name) for both tables, returns merged
 * rows. Exact qr_code match (case-insensitive) is hoisted to the top.
 */
export async function searchSkus(rawQuery: string): Promise<SkuSearchRow[]> {
  const q = rawQuery.trim();
  if (q.length < 2) return [];

  const escaped = q.replace(/[%_,]/g, (m) => `\\${m}`);
  const pattern = `%${escaped}%`;
  const qLower = q.toLowerCase();

  const supabase = await createClient();

  const [eqRes, cnRes] = await Promise.all([
    supabase
      .from("equipment_sku")
      .select("qr_code, name, photo_url, location")
      .or(`name.ilike.${pattern},qr_code.ilike.${pattern}`)
      .order("qr_code")
      .limit(EQ_LIMIT),
    supabase
      .from("consumable_sku")
      .select("qr_code, name, photo_url, per_request_max_quantity, unit")
      .or(`name.ilike.${pattern},qr_code.ilike.${pattern}`)
      .order("qr_code")
      .limit(CN_LIMIT),
  ]);

  if (eqRes.error) throw eqRes.error;
  if (cnRes.error) throw cnRes.error;

  const eq: SkuSearchRow[] = (eqRes.data ?? []).map((r) => ({
    type: "equipment",
    qr_code: r.qr_code as string,
    name: r.name as string,
    photo_url: (r.photo_url as string | null) ?? null,
    caption: (r.location as string | null) ?? null,
  }));

  const cn: SkuSearchRow[] = (cnRes.data ?? []).map((r) => ({
    type: "consumable",
    qr_code: r.qr_code as string,
    name: r.name as string,
    photo_url: (r.photo_url as string | null) ?? null,
    caption: `Max ${r.per_request_max_quantity} ${r.unit} per request`,
  }));

  const merged = [...eq, ...cn];

  // Hoist any exact qr_code match (case-insensitive) to position 0 so a
  // typed-in ID like "STH-001" lands at the top of the dropdown and is also
  // the default Enter-key target.
  const exactIdx = merged.findIndex(
    (r) => r.qr_code.toLowerCase() === qLower,
  );
  if (exactIdx > 0) {
    const [exact] = merged.splice(exactIdx, 1);
    merged.unshift(exact);
  }

  return merged;
}
