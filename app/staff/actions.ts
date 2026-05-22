"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  searchStudents,
  type StudentSearchRow,
} from "@/lib/supabase/queries/staff-requests";

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
  if (!profile || profile.role !== "staff") {
    return { ok: false, error: "Staff only." };
  }
  return { ok: true, userId: user.id };
}

function friendlyError(message: string): string {
  if (/overdue items/i.test(message)) {
    return "Student has overdue items and cannot borrow or use consumables until returned.";
  }
  if (/Insufficient stock/i.test(message)) {
    return "Not enough stock on hand. Reduce the quantity.";
  }
  if (/invalid transition/i.test(message)) {
    return "Request is no longer pending. It may have just been approved, expired, or cancelled.";
  }
  if (/no longer pending/i.test(message)) {
    return "Request is no longer pending.";
  }
  if (/decline_reason_required/i.test(message)) {
    return "A reason of at least 3 characters is required to decline.";
  }
  return message;
}

const MIN_DECLINE_REASON = 3;
const MAX_DECLINE_REASON = 280;

function validateDeclineReason(reason: string): string | null {
  const trimmed = reason.trim();
  if (trimmed.length < MIN_DECLINE_REASON) {
    return `Please give a reason (at least ${MIN_DECLINE_REASON} characters).`;
  }
  if (trimmed.length > MAX_DECLINE_REASON) {
    return `Reason is too long (${trimmed.length}/${MAX_DECLINE_REASON} chars).`;
  }
  return null;
}

export async function searchStudentsAction(
  q: string,
): Promise<Result<StudentSearchRow[]>> {
  const gate = await assertStaff();
  if (!gate.ok) return { ok: false, error: gate.error };
  try {
    const data = await searchStudents(q);
    return { ok: true, data };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Search failed.";
    return { ok: false, error: msg };
  }
}

// ─── Walk-in equipment borrow ──────────────────────────────────────────────
export async function walkInBorrow(input: {
  equipment_sku_id: string;
  student_id: string;
  quantity: number;
  expected_return_date: string;
  notes?: string | null;
}): Promise<Result<{ transaction_id: string }>> {
  const gate = await assertStaff();
  if (!gate.ok) return { ok: false, error: gate.error };
  if (input.quantity < 1) return { ok: false, error: "Quantity must be ≥ 1." };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("borrow_transaction")
    .insert({
      equipment_sku_id: input.equipment_sku_id,
      student_id: input.student_id,
      quantity: input.quantity,
      expected_return_date: input.expected_return_date,
      approved_by: gate.userId,
      notes: input.notes ?? null,
      status: "BORROWED",
    })
    .select("id")
    .single();

  if (error) return { ok: false, error: friendlyError(error.message) };

  revalidatePath("/staff/inventory");
  revalidatePath("/staff/requests");
  revalidatePath("/staff/home");
  return { ok: true, data: { transaction_id: data.id } };
}

// ─── Approve an existing equipment pre-request ─────────────────────────────
export async function approveBorrowRequest(input: {
  request_id: string;
}): Promise<Result> {
  const gate = await assertStaff();
  if (!gate.ok) return { ok: false, error: gate.error };

  const supabase = await createClient();
  const { error, data } = await supabase
    .from("borrow_request")
    .update({ status: "APPROVED" })
    .eq("id", input.request_id)
    .eq("status", "PENDING_PICKUP")
    .select("id")
    .maybeSingle();

  if (error) return { ok: false, error: friendlyError(error.message) };
  if (!data) {
    return {
      ok: false,
      error: friendlyError("Request is no longer pending."),
    };
  }

  revalidatePath("/staff/requests");
  revalidatePath("/staff/inventory");
  revalidatePath("/staff/home");
  return { ok: true };
}

// ─── Walk-in consumable usage ──────────────────────────────────────────────
export async function walkInConsumableUsage(input: {
  consumable_sku_id: string;
  student_id: string;
  quantity_used: number;
  notes?: string | null;
}): Promise<Result<{ usage_id: string }>> {
  const gate = await assertStaff();
  if (!gate.ok) return { ok: false, error: gate.error };
  if (input.quantity_used < 1)
    return { ok: false, error: "Quantity must be ≥ 1." };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("consumable_usage")
    .insert({
      consumable_sku_id: input.consumable_sku_id,
      student_id: input.student_id,
      quantity_used: input.quantity_used,
      approved_by: gate.userId,
      notes: input.notes ?? null,
    })
    .select("id")
    .single();

  if (error) return { ok: false, error: friendlyError(error.message) };

  revalidatePath("/staff/inventory");
  revalidatePath("/staff/requests");
  revalidatePath("/staff/home");
  return { ok: true, data: { usage_id: data.id } };
}

// ─── Approve an existing consumable pre-request ────────────────────────────
export async function approveConsumableRequest(input: {
  request_id: string;
}): Promise<Result> {
  const gate = await assertStaff();
  if (!gate.ok) return { ok: false, error: gate.error };

  const supabase = await createClient();
  const { error, data } = await supabase
    .from("consumable_request")
    .update({ status: "APPROVED" })
    .eq("id", input.request_id)
    .eq("status", "PENDING_PICKUP")
    .select("id")
    .maybeSingle();

  if (error) return { ok: false, error: friendlyError(error.message) };
  if (!data) {
    return {
      ok: false,
      error: friendlyError("Request is no longer pending."),
    };
  }

  revalidatePath("/staff/requests");
  revalidatePath("/staff/inventory");
  revalidatePath("/staff/home");
  return { ok: true };
}

// ─── Return an equipment item ──────────────────────────────────────────────
export async function logReturn(input: {
  transaction_id: string;
}): Promise<Result> {
  const gate = await assertStaff();
  if (!gate.ok) return { ok: false, error: gate.error };

  const supabase = await createClient();
  const { data: tx, error: fetchErr } = await supabase
    .from("borrow_transaction")
    .select("status")
    .eq("id", input.transaction_id)
    .maybeSingle();

  if (fetchErr) return { ok: false, error: friendlyError(fetchErr.message) };
  if (!tx) return { ok: false, error: "Transaction not found." };

  // OVERDUE → RETURNED_LATE; LOST → RETURNED_LATE; BORROWED → RETURNED.
  const next =
    tx.status === "BORROWED"
      ? "RETURNED"
      : tx.status === "OVERDUE" || tx.status === "LOST"
      ? "RETURNED_LATE"
      : null;
  if (!next) {
    return {
      ok: false,
      error: friendlyError(`Cannot return: transaction is ${tx.status}.`),
    };
  }

  const { error } = await supabase
    .from("borrow_transaction")
    .update({ status: next })
    .eq("id", input.transaction_id);
  if (error) return { ok: false, error: friendlyError(error.message) };

  revalidatePath("/staff/inventory");
  revalidatePath("/staff/home");
  return { ok: true };
}

// ─── Decline a pending equipment request ─────────────────────────────────
export async function declineBorrowRequest(input: {
  request_id: string;
  reason: string;
}): Promise<Result> {
  const gate = await assertStaff();
  if (!gate.ok) return { ok: false, error: gate.error };

  const reasonError = validateDeclineReason(input.reason);
  if (reasonError) return { ok: false, error: reasonError };

  const supabase = await createClient();
  const { error, data } = await supabase
    .from("borrow_request")
    .update({
      status: "DECLINED",
      decline_reason: input.reason.trim(),
    })
    .eq("id", input.request_id)
    .eq("status", "PENDING_PICKUP")
    .select("id")
    .maybeSingle();

  if (error) return { ok: false, error: friendlyError(error.message) };
  if (!data) {
    return { ok: false, error: friendlyError("Request is no longer pending.") };
  }

  revalidatePath("/staff/requests");
  revalidatePath("/staff/inventory");
  revalidatePath("/staff/home");
  return { ok: true };
}

// ─── Decline a pending consumable request ────────────────────────────────
export async function declineConsumableRequest(input: {
  request_id: string;
  reason: string;
}): Promise<Result> {
  const gate = await assertStaff();
  if (!gate.ok) return { ok: false, error: gate.error };

  const reasonError = validateDeclineReason(input.reason);
  if (reasonError) return { ok: false, error: reasonError };

  const supabase = await createClient();
  const { error, data } = await supabase
    .from("consumable_request")
    .update({
      status: "DECLINED",
      decline_reason: input.reason.trim(),
    })
    .eq("id", input.request_id)
    .eq("status", "PENDING_PICKUP")
    .select("id")
    .maybeSingle();

  if (error) return { ok: false, error: friendlyError(error.message) };
  if (!data) {
    return { ok: false, error: friendlyError("Request is no longer pending.") };
  }

  revalidatePath("/staff/requests");
  revalidatePath("/staff/inventory");
  revalidatePath("/staff/home");
  return { ok: true };
}

// ─── Override (skip) a pending request — for Flow 6 walk-in override ──────
export async function skipBorrowRequest(input: {
  request_id: string;
}): Promise<Result> {
  const gate = await assertStaff();
  if (!gate.ok) return { ok: false, error: gate.error };

  const supabase = await createClient();
  const { error, data } = await supabase
    .from("borrow_request")
    .update({ status: "SKIPPED" })
    .eq("id", input.request_id)
    .eq("status", "PENDING_PICKUP")
    .select("id")
    .maybeSingle();

  if (error) return { ok: false, error: friendlyError(error.message) };
  if (!data) return { ok: false, error: "Request is no longer pending." };

  revalidatePath("/staff/requests");
  revalidatePath("/staff/inventory");
  return { ok: true };
}

/**
 * Override flow (Flow 6): SKIP a pending request, then immediately lend to a
 * walk-in student. The skip releases the reservation; the insert claims the
 * unit. Not transactional across the two calls — acceptable for v1 single-lab
 * scale where the only race would be another simultaneous walk-in.
 */
export async function overrideBorrow(input: {
  skip_request_id: string;
  equipment_sku_id: string;
  student_id: string;
  quantity: number;
  expected_return_date: string;
}): Promise<Result<{ transaction_id: string }>> {
  const gate = await assertStaff();
  if (!gate.ok) return { ok: false, error: gate.error };

  const supabase = await createClient();

  const { error: skipErr, data: skipData } = await supabase
    .from("borrow_request")
    .update({ status: "SKIPPED" })
    .eq("id", input.skip_request_id)
    .eq("status", "PENDING_PICKUP")
    .select("id")
    .maybeSingle();

  if (skipErr) return { ok: false, error: friendlyError(skipErr.message) };
  if (!skipData) {
    return {
      ok: false,
      error: "That reservation is no longer pending — it may have just been claimed.",
    };
  }

  const { data, error } = await supabase
    .from("borrow_transaction")
    .insert({
      equipment_sku_id: input.equipment_sku_id,
      student_id: input.student_id,
      quantity: input.quantity,
      expected_return_date: input.expected_return_date,
      approved_by: gate.userId,
      status: "BORROWED",
    })
    .select("id")
    .single();

  if (error) return { ok: false, error: friendlyError(error.message) };

  revalidatePath("/staff/inventory");
  revalidatePath("/staff/requests");
  revalidatePath("/staff/home");
  return { ok: true, data: { transaction_id: data.id } };
}
