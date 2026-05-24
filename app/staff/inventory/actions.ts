"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// ─── Shared plumbing ─────────────────────────────────────────────────────────

type Result<T = void> = T extends void
  ? { ok: true } | { ok: false; error: string }
  : { ok: true; data: T } | { ok: false; error: string };

async function assertStaff(): Promise<
  { ok: true; userId: string } | { ok: false; error: string }
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };
  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile || (profile.role !== "staff" && profile.role !== "admin")) {
    return { ok: false, error: "Staff only." };
  }
  return { ok: true, userId: user.id };
}

function friendlyError(message: string): string {
  // Friendly translations for Phase 7 — additive to the staff/actions.ts set.
  if (/duplicate key value violates unique constraint.*qr_code/i.test(message)) {
    return "That QR code is already in use by another SKU.";
  }
  if (/Cannot delete SKU/i.test(message)) return message;
  if (/Cannot delete lot/i.test(message)) return message;
  if (/violates check constraint .*equipment_units_invariant/i.test(message)) {
    return "Bucket move would break the unit invariant. Recount and retry.";
  }
  if (/violates check constraint .*equipment_units_nonneg/i.test(message)) {
    return "Counts cannot go negative.";
  }
  if (/violates check constraint .*consumable_lot_quantities_nonneg/i.test(message)) {
    return "Quantities cannot go negative.";
  }
  if (/violates check constraint .*consumable_lot_remaining_le_received/i.test(message)) {
    return "Remaining cannot exceed received.";
  }
  if (/violates check constraint .*consumable_lot_dates_sane/i.test(message)) {
    return "Expiration date must be on or after received date.";
  }
  if (/A reason of at least 3 characters is required/i.test(message)) {
    return message;
  }
  if (/A note of at least 3 characters is required/i.test(message)) {
    return message;
  }
  if (/Not enough units in/i.test(message)) return message;
  if (/already depleted/i.test(message)) return message;
  if (/foreign key constraint/i.test(message)) {
    return "This SKU is referenced by history that cannot be removed. It can only be deleted once no requests, borrows, or usage records reference it.";
  }
  return message;
}

function trimOrNull(s: FormDataEntryValue | null): string | null {
  if (typeof s !== "string") return null;
  const trimmed = s.trim();
  return trimmed.length === 0 ? null : trimmed;
}

function requireString(s: FormDataEntryValue | null, field: string): string {
  if (typeof s !== "string" || s.trim().length === 0) {
    throw new Error(`${field} is required.`);
  }
  return s.trim();
}

function requireInt(s: FormDataEntryValue | null, field: string): number {
  const str = typeof s === "string" ? s.trim() : "";
  const n = Number.parseInt(str, 10);
  if (!Number.isFinite(n) || str === "") {
    throw new Error(`${field} must be a whole number.`);
  }
  return n;
}


// ─── Equipment SKU CRUD ──────────────────────────────────────────────────────

export async function createEquipmentSku(
  _prev: { error?: string } | null,
  formData: FormData,
): Promise<{ error?: string }> {
  const gate = await assertStaff();
  if (!gate.ok) return { error: gate.error };

  let name: string, qr_code: string, total_units: number, low_stock_threshold: number;
  let description: string | null, photo_url: string | null, location: string | null;
  try {
    name = requireString(formData.get("name"), "Name");
    qr_code = requireString(formData.get("qr_code"), "QR code");
    total_units = requireInt(formData.get("total_units"), "Total units");
    low_stock_threshold = requireInt(
      formData.get("low_stock_threshold"),
      "Low-stock threshold",
    );
    description = trimOrNull(formData.get("description"));
    photo_url = trimOrNull(formData.get("photo_url"));
    location = trimOrNull(formData.get("location"));
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Invalid form." };
  }

  if (total_units < 0) return { error: "Total units cannot be negative." };
  if (low_stock_threshold < 0) {
    return { error: "Low-stock threshold cannot be negative." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("equipment_sku").insert({
    name,
    description,
    photo_url,
    qr_code,
    total_units,
    available_units: total_units,
    borrowed_units: 0,
    reserved_units: 0,
    maintenance_units: 0,
    lost_units: 0,
    low_stock_threshold,
    location,
  });

  if (error) return { error: friendlyError(error.message) };

  revalidatePath("/staff/inventory");
  redirect(`/staff/inventory/equipment/${encodeURIComponent(qr_code)}`);
}

export async function updateEquipmentSku(
  skuId: string,
  _prev: { error?: string } | null,
  formData: FormData,
): Promise<{ error?: string }> {
  const gate = await assertStaff();
  if (!gate.ok) return { error: gate.error };

  let name: string, low_stock_threshold: number;
  let description: string | null, photo_url: string | null, location: string | null;
  try {
    name = requireString(formData.get("name"), "Name");
    low_stock_threshold = requireInt(
      formData.get("low_stock_threshold"),
      "Low-stock threshold",
    );
    description = trimOrNull(formData.get("description"));
    photo_url = trimOrNull(formData.get("photo_url"));
    location = trimOrNull(formData.get("location"));
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Invalid form." };
  }

  if (low_stock_threshold < 0) {
    return { error: "Low-stock threshold cannot be negative." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("equipment_sku")
    .update({ name, description, photo_url, location, low_stock_threshold })
    .eq("id", skuId)
    .select("qr_code")
    .maybeSingle();

  if (error) return { error: friendlyError(error.message) };
  if (!data) return { error: "SKU not found." };

  revalidatePath("/staff/inventory");
  revalidatePath(`/staff/inventory/equipment/${encodeURIComponent(data.qr_code)}`);
  redirect(`/staff/inventory/equipment/${encodeURIComponent(data.qr_code)}`);
}

export async function deleteEquipmentSku(skuId: string): Promise<Result> {
  const gate = await assertStaff();
  if (!gate.ok) return { ok: false, error: gate.error };

  const supabase = await createClient();
  const { error } = await supabase.from("equipment_sku").delete().eq("id", skuId);
  if (error) return { ok: false, error: friendlyError(error.message) };

  revalidatePath("/staff/inventory");
  return { ok: true };
}

// ─── Count bucket adjustments (equipment) ─────────────────────────────────────

export type EquipmentBucket = "available" | "maintenance" | "lost";

export async function adjustEquipmentCount(input: {
  sku_id: string;
  from_bucket: EquipmentBucket;
  to_bucket: EquipmentBucket;
  quantity: number;
  notes?: string | null;
}): Promise<Result> {
  const gate = await assertStaff();
  if (!gate.ok) return { ok: false, error: gate.error };

  const supabase = await createClient();
  const { error } = await supabase.rpc("staff_adjust_equipment_count", {
    p_sku_id: input.sku_id,
    p_from_bucket: input.from_bucket,
    p_to_bucket: input.to_bucket,
    p_quantity: input.quantity,
    p_notes: input.notes ?? null,
  });

  if (error) return { ok: false, error: friendlyError(error.message) };

  revalidatePath("/staff/inventory");
  return { ok: true };
}

// Incoming shipment: grows total_units + available_units atomically. The only
// path that increases total stock — the bucket-shuffle RPC above can't do it
// without breaking the equipment_units_invariant CHECK. See migration 0025.
export async function receiveEquipmentStock(input: {
  sku_id: string;
  quantity: number;
  notes: string;
}): Promise<Result> {
  const gate = await assertStaff();
  if (!gate.ok) return { ok: false, error: gate.error };

  if (!Number.isInteger(input.quantity) || input.quantity < 1) {
    return { ok: false, error: "Quantity must be a whole number ≥ 1." };
  }
  const notes = input.notes.trim();
  if (notes.length < 3) {
    return { ok: false, error: "A note of at least 3 characters is required." };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("staff_receive_equipment_stock", {
    p_sku_id: input.sku_id,
    p_quantity: input.quantity,
    p_notes: notes,
  });

  if (error) return { ok: false, error: friendlyError(error.message) };

  revalidatePath("/staff/inventory");
  return { ok: true };
}

// ─── Consumable SKU CRUD ──────────────────────────────────────────────────────

export async function createConsumableSku(
  _prev: { error?: string } | null,
  formData: FormData,
): Promise<{ error?: string }> {
  const gate = await assertStaff();
  if (!gate.ok) return { error: gate.error };

  let name: string, qr_code: string, unit: string;
  let low_stock_threshold: number, expiration_warning_days: number, per_request_max_quantity: number;
  let description: string | null, photo_url: string | null;
  try {
    name = requireString(formData.get("name"), "Name");
    qr_code = requireString(formData.get("qr_code"), "QR code");
    unit = requireString(formData.get("unit"), "Unit");
    low_stock_threshold = requireInt(formData.get("low_stock_threshold"), "Low-stock threshold");
    expiration_warning_days = requireInt(
      formData.get("expiration_warning_days"),
      "Expiration warning days",
    );
    per_request_max_quantity = requireInt(
      formData.get("per_request_max_quantity"),
      "Per-request max quantity",
    );
    description = trimOrNull(formData.get("description"));
    photo_url = trimOrNull(formData.get("photo_url"));
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Invalid form." };
  }

  if (low_stock_threshold < 0) return { error: "Low-stock threshold cannot be negative." };
  if (expiration_warning_days < 0) return { error: "Expiration warning days cannot be negative." };
  if (per_request_max_quantity < 1) return { error: "Per-request max quantity must be at least 1." };

  const supabase = await createClient();
  const { error } = await supabase.from("consumable_sku").insert({
    name,
    description,
    photo_url,
    qr_code,
    unit,
    low_stock_threshold,
    expiration_warning_days,
    per_request_max_quantity,
  });

  if (error) return { error: friendlyError(error.message) };

  revalidatePath("/staff/inventory");
  redirect(
    `/staff/inventory/consumables/${encodeURIComponent(qr_code)}`,
  );
}

export async function updateConsumableSku(
  skuId: string,
  _prev: { error?: string } | null,
  formData: FormData,
): Promise<{ error?: string }> {
  const gate = await assertStaff();
  if (!gate.ok) return { error: gate.error };

  let name: string, unit: string;
  let low_stock_threshold: number, expiration_warning_days: number, per_request_max_quantity: number;
  let description: string | null, photo_url: string | null;
  try {
    name = requireString(formData.get("name"), "Name");
    unit = requireString(formData.get("unit"), "Unit");
    low_stock_threshold = requireInt(formData.get("low_stock_threshold"), "Low-stock threshold");
    expiration_warning_days = requireInt(
      formData.get("expiration_warning_days"),
      "Expiration warning days",
    );
    per_request_max_quantity = requireInt(
      formData.get("per_request_max_quantity"),
      "Per-request max quantity",
    );
    description = trimOrNull(formData.get("description"));
    photo_url = trimOrNull(formData.get("photo_url"));
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Invalid form." };
  }

  if (low_stock_threshold < 0) return { error: "Low-stock threshold cannot be negative." };
  if (expiration_warning_days < 0) return { error: "Expiration warning days cannot be negative." };
  if (per_request_max_quantity < 1) return { error: "Per-request max quantity must be at least 1." };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("consumable_sku")
    .update({
      name,
      description,
      photo_url,
      unit,
      low_stock_threshold,
      expiration_warning_days,
      per_request_max_quantity,
    })
    .eq("id", skuId)
    .select("qr_code")
    .maybeSingle();

  if (error) return { error: friendlyError(error.message) };
  if (!data) return { error: "SKU not found." };

  revalidatePath("/staff/inventory");
  revalidatePath(`/staff/inventory/consumables/${encodeURIComponent(data.qr_code)}`);
  redirect(`/staff/inventory/consumables/${encodeURIComponent(data.qr_code)}`);
}

export async function deleteConsumableSku(skuId: string): Promise<Result> {
  const gate = await assertStaff();
  if (!gate.ok) return { ok: false, error: gate.error };

  const supabase = await createClient();
  const { error } = await supabase.from("consumable_sku").delete().eq("id", skuId);
  if (error) return { ok: false, error: friendlyError(error.message) };

  revalidatePath("/staff/inventory");
  return { ok: true };
}

// ─── Consumable Lot CRUD ──────────────────────────────────────────────────────

export async function createConsumableLot(input: {
  consumable_sku_id: string;
  lot_number: string | null;
  received_date: string;
  expiration_date: string;
  quantity_received: number;
}): Promise<Result<{ lot_id: string }>> {
  const gate = await assertStaff();
  if (!gate.ok) return { ok: false, error: gate.error };

  if (!input.received_date || !input.expiration_date) {
    return { ok: false, error: "Received date and expiration date are required." };
  }
  if (input.quantity_received < 1) {
    return { ok: false, error: "Quantity received must be at least 1." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("consumable_lot")
    .insert({
      consumable_sku_id: input.consumable_sku_id,
      lot_number: input.lot_number?.trim() || null,
      received_date: input.received_date,
      expiration_date: input.expiration_date,
      quantity_received: input.quantity_received,
      quantity_remaining: input.quantity_received,
      is_depleted: false,
    })
    .select("id, consumable_sku_id")
    .single();

  if (error) return { ok: false, error: friendlyError(error.message) };

  revalidatePath("/staff/inventory");
  return { ok: true, data: { lot_id: data.id } };
}

export async function updateConsumableLot(input: {
  lot_id: string;
  lot_number: string | null;
  received_date: string;
  expiration_date: string;
}): Promise<Result> {
  const gate = await assertStaff();
  if (!gate.ok) return { ok: false, error: gate.error };

  if (!input.received_date || !input.expiration_date) {
    return { ok: false, error: "Received date and expiration date are required." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("consumable_lot")
    .update({
      lot_number: input.lot_number?.trim() || null,
      received_date: input.received_date,
      expiration_date: input.expiration_date,
    })
    .eq("id", input.lot_id)
    .select("id")
    .maybeSingle();

  if (error) return { ok: false, error: friendlyError(error.message) };
  if (!data) return { ok: false, error: "Lot not found." };

  revalidatePath("/staff/inventory");
  return { ok: true };
}

export async function markLotDepleted(input: {
  lot_id: string;
  reason: string;
}): Promise<Result> {
  const gate = await assertStaff();
  if (!gate.ok) return { ok: false, error: gate.error };

  const reason = input.reason.trim();
  if (reason.length < 3) {
    return { ok: false, error: "A reason of at least 3 characters is required." };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("staff_mark_lot_depleted", {
    p_lot_id: input.lot_id,
    p_reason: reason,
  });

  if (error) return { ok: false, error: friendlyError(error.message) };

  revalidatePath("/staff/inventory");
  return { ok: true };
}

export async function deleteConsumableLot(lotId: string): Promise<Result> {
  const gate = await assertStaff();
  if (!gate.ok) return { ok: false, error: gate.error };

  const supabase = await createClient();
  const { error } = await supabase.from("consumable_lot").delete().eq("id", lotId);
  if (error) return { ok: false, error: friendlyError(error.message) };

  revalidatePath("/staff/inventory");
  return { ok: true };
}

// ─── Bulk delete (equipment + consumable SKUs) ───────────────────────────────

export type BulkDeleteFailure = { id: string; name: string; reason: string };
export type BulkDeleteSummary = {
  deleted: { id: string; name: string }[];
  failed: BulkDeleteFailure[];
};

export async function bulkDeleteSkus(input: {
  type: "equipment" | "consumable";
  items: { id: string; name: string }[];
}): Promise<Result<BulkDeleteSummary>> {
  const gate = await assertStaff();
  if (!gate.ok) return { ok: false, error: gate.error };

  if (!Array.isArray(input.items) || input.items.length === 0) {
    return { ok: false, error: "Nothing selected." };
  }
  if (input.items.length > 100) {
    return { ok: false, error: "Too many SKUs in one batch (max 100)." };
  }

  const table = input.type === "equipment" ? "equipment_sku" : "consumable_sku";
  const supabase = await createClient();

  const deleted: { id: string; name: string }[] = [];
  const failed: BulkDeleteFailure[] = [];

  for (const item of input.items) {
    const { error } = await supabase.from(table).delete().eq("id", item.id);
    if (error) {
      failed.push({
        id: item.id,
        name: item.name,
        reason: friendlyError(error.message),
      });
    } else {
      deleted.push({ id: item.id, name: item.name });
    }
  }

  if (deleted.length > 0) {
    revalidatePath("/staff/inventory");
  }

  return { ok: true, data: { deleted, failed } };
}
