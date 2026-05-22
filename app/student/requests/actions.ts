"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type ActionResult =
  | { ok: true; id: string }
  | { ok: false; error: string };

type PgError = { code?: string; message?: string };

function isPgError(e: unknown): e is PgError {
  return !!e && typeof e === "object" && ("code" in e || "message" in e);
}

function translateError(e: unknown): string {
  if (!isPgError(e)) return "Something went wrong. Try again.";
  const msg = (e.message ?? "").toLowerCase();
  if (msg.includes("overdue")) {
    return "You have overdue items. Return them before submitting a new request.";
  }
  if (msg.includes("available_units") && msg.includes("check")) {
    return "Stock has changed — not enough available. Please refresh and try again.";
  }
  if (e.code === "23514") {
    return "Invalid quantity or dates. Please check the form.";
  }
  return e.message ?? "Something went wrong. Try again.";
}

/**
 * Computes expires_at = end of (borrow_date + 1 day) in Asia/Manila (UTC+08:00),
 * serialized as an ISO 8601 string. Postgres will store as UTC timestamptz.
 */
function computeExpiresAt(borrowDate: string): string {
  const [y, m, d] = borrowDate.split("-").map(Number);
  const next = new Date(Date.UTC(y, m - 1, d + 1));
  const yy = next.getUTCFullYear();
  const mm = String(next.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(next.getUTCDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}T23:59:59.999+08:00`;
}

function isIsoDate(s: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(s);
}

export async function submitEquipmentRequest(input: {
  sku_qr: string;
  borrow_date: string;
  expected_return_date: string;
  quantity: number;
  notes?: string | null;
}): Promise<ActionResult> {
  if (!isIsoDate(input.borrow_date) || !isIsoDate(input.expected_return_date)) {
    return { ok: false, error: "Pick valid dates." };
  }
  if (input.expected_return_date < input.borrow_date) {
    return { ok: false, error: "Return date must be on or after pickup." };
  }
  if (!Number.isInteger(input.quantity) || input.quantity < 1) {
    return { ok: false, error: "Quantity must be a positive whole number." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sign in to submit a request." };

  const { data: sku, error: skuErr } = await supabase
    .from("equipment_sku")
    .select("id, available_units")
    .eq("qr_code", input.sku_qr)
    .maybeSingle();
  if (skuErr) return { ok: false, error: translateError(skuErr) };
  if (!sku) return { ok: false, error: "Item not found." };
  if (input.quantity > sku.available_units) {
    return {
      ok: false,
      error: `Only ${sku.available_units} available. Reduce quantity.`,
    };
  }

  const { data, error } = await supabase
    .from("borrow_request")
    .insert({
      student_id: user.id,
      equipment_sku_id: sku.id,
      quantity: input.quantity,
      borrow_date: input.borrow_date,
      expected_return_date: input.expected_return_date,
      expires_at: computeExpiresAt(input.borrow_date),
      notes: input.notes?.trim() || null,
    })
    .select("id")
    .single();

  if (error) return { ok: false, error: translateError(error) };
  revalidatePath("/student/requests");
  return { ok: true, id: data.id };
}

export async function submitConsumableRequest(input: {
  sku_qr: string;
  borrow_date: string;
  quantity: number;
  notes?: string | null;
}): Promise<ActionResult> {
  if (!isIsoDate(input.borrow_date)) {
    return { ok: false, error: "Pick a valid pickup date." };
  }
  if (!Number.isInteger(input.quantity) || input.quantity < 1) {
    return { ok: false, error: "Quantity must be a positive whole number." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sign in to submit a request." };

  const { data: sku, error: skuErr } = await supabase
    .from("consumable_sku")
    .select("id, per_request_max_quantity")
    .eq("qr_code", input.sku_qr)
    .maybeSingle();
  if (skuErr) return { ok: false, error: translateError(skuErr) };
  if (!sku) return { ok: false, error: "Item not found." };

  if (input.quantity > sku.per_request_max_quantity) {
    return {
      ok: false,
      error: `Max ${sku.per_request_max_quantity} per request.`,
    };
  }

  const { data: lots, error: lotErr } = await supabase
    .from("consumable_lot")
    .select("quantity_remaining")
    .eq("consumable_sku_id", sku.id)
    .eq("is_depleted", false);
  if (lotErr) return { ok: false, error: translateError(lotErr) };
  const stock = (lots ?? []).reduce(
    (n, l) => n + (l.quantity_remaining as number),
    0,
  );
  if (input.quantity > stock) {
    return { ok: false, error: `Only ${stock} in stock. Reduce quantity.` };
  }

  const { data, error } = await supabase
    .from("consumable_request")
    .insert({
      student_id: user.id,
      consumable_sku_id: sku.id,
      quantity: input.quantity,
      borrow_date: input.borrow_date,
      expires_at: computeExpiresAt(input.borrow_date),
      notes: input.notes?.trim() || null,
    })
    .select("id")
    .single();

  if (error) return { ok: false, error: translateError(error) };
  revalidatePath("/student/requests");
  return { ok: true, id: data.id };
}

export async function cancelRequest(input: {
  id: string;
  type: "equipment" | "consumable";
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sign in to cancel." };

  const table =
    input.type === "equipment" ? "borrow_request" : "consumable_request";

  const { data, error } = await supabase
    .from(table)
    .update({ status: "CANCELLED" })
    .eq("id", input.id)
    .eq("student_id", user.id)
    .eq("status", "PENDING_PICKUP")
    .select("id")
    .maybeSingle();

  if (error) return { ok: false, error: translateError(error) };
  if (!data) {
    return {
      ok: false,
      error: "This request can't be cancelled — staff may have already acted on it.",
    };
  }

  revalidatePath("/student/requests");
  revalidatePath(`/student/requests/${input.id}`);
  return { ok: true };
}

/** Server-action wrapper used by the catalog form's <form action={...}>. */
export async function cancelAndReturn(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const type = (formData.get("type") ?? "equipment") as
    | "equipment"
    | "consumable";
  await cancelRequest({ id, type });
  redirect("/student/requests");
}
