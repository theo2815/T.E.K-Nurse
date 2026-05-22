"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  searchStudents,
  type StudentSearchRow,
} from "@/lib/supabase/queries/staff-requests";
import {
  searchSkus,
  type SkuSearchRow,
} from "@/lib/supabase/queries/sku-search";

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

export async function searchSkusAction(
  q: string,
): Promise<Result<SkuSearchRow[]>> {
  const gate = await assertStaff();
  if (!gate.ok) return { ok: false, error: gate.error };
  try {
    const data = await searchSkus(q);
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

// ─── Release an approved equipment pre-request at counter pickup ──────────
//
// Transitions APPROVED → RELEASED. The DB trigger (0009) creates the
// borrow_transaction here (not at approval time), moves units from reserved
// → borrowed, audits, and notifies the student.
export async function releaseBorrowRequest(input: {
  request_id: string;
}): Promise<Result<{ transaction_id: string }>> {
  const gate = await assertStaff();
  if (!gate.ok) return { ok: false, error: gate.error };

  const supabase = await createClient();
  const { error, data } = await supabase
    .from("borrow_request")
    .update({ status: "RELEASED" })
    .eq("id", input.request_id)
    .eq("status", "APPROVED")
    .select("id")
    .maybeSingle();

  if (error) return { ok: false, error: friendlyError(error.message) };
  if (!data) {
    return {
      ok: false,
      error: friendlyError(
        "Request is not awaiting pickup. It may have expired or already been released.",
      ),
    };
  }

  // Fetch the just-created transaction so the caller can navigate / surface it.
  const { data: tx } = await supabase
    .from("borrow_transaction")
    .select("id")
    .eq("source_request_id", input.request_id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  revalidatePath("/staff/requests");
  revalidatePath("/staff/inventory");
  revalidatePath("/staff/home");
  return { ok: true, data: { transaction_id: tx?.id ?? "" } };
}

// ─── Cancel (manually expire) an APPROVED equipment request ──────────────
//
// Used when a student no-shows on a pickup code and staff needs to reclaim
// the reserved units before the Phase 9 auto-expire cron exists.
// Trigger: APPROVED → EXPIRED. Frees reserved units, audits, notifies the
// student that their reservation was released.
export async function expireBorrowRequest(input: {
  request_id: string;
}): Promise<Result> {
  const gate = await assertStaff();
  if (!gate.ok) return { ok: false, error: gate.error };

  const supabase = await createClient();
  const { error, data } = await supabase
    .from("borrow_request")
    .update({ status: "EXPIRED" })
    .eq("id", input.request_id)
    .eq("status", "APPROVED")
    .select("id")
    .maybeSingle();

  if (error) return { ok: false, error: friendlyError(error.message) };
  if (!data) {
    return {
      ok: false,
      error: friendlyError(
        "Reservation is no longer active. It may have just been released or expired.",
      ),
    };
  }

  revalidatePath("/staff/requests");
  revalidatePath("/staff/inventory");
  revalidatePath("/staff/home");
  return { ok: true };
}

// ─── Cancel (manually expire) an APPROVED consumable request ─────────────
export async function expireConsumableRequest(input: {
  request_id: string;
}): Promise<Result> {
  const gate = await assertStaff();
  if (!gate.ok) return { ok: false, error: gate.error };

  const supabase = await createClient();
  const { error, data } = await supabase
    .from("consumable_request")
    .update({ status: "EXPIRED" })
    .eq("id", input.request_id)
    .eq("status", "APPROVED")
    .select("id")
    .maybeSingle();

  if (error) return { ok: false, error: friendlyError(error.message) };
  if (!data) {
    return {
      ok: false,
      error: friendlyError(
        "Reservation is no longer active. It may have just been released or expired.",
      ),
    };
  }

  revalidatePath("/staff/requests");
  revalidatePath("/staff/inventory");
  revalidatePath("/staff/home");
  return { ok: true };
}

// ─── Release an approved consumable pre-request at counter pickup ─────────
export async function releaseConsumableRequest(input: {
  request_id: string;
}): Promise<Result<{ usage_id: string }>> {
  const gate = await assertStaff();
  if (!gate.ok) return { ok: false, error: gate.error };

  const supabase = await createClient();
  const { error, data } = await supabase
    .from("consumable_request")
    .update({ status: "RELEASED" })
    .eq("id", input.request_id)
    .eq("status", "APPROVED")
    .select("id")
    .maybeSingle();

  if (error) return { ok: false, error: friendlyError(error.message) };
  if (!data) {
    return {
      ok: false,
      error: friendlyError(
        "Request is not awaiting pickup. It may have expired or already been released.",
      ),
    };
  }

  const { data: usage } = await supabase
    .from("consumable_usage")
    .select("id")
    .eq("source_request_id", input.request_id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  revalidatePath("/staff/requests");
  revalidatePath("/staff/inventory");
  revalidatePath("/staff/home");
  return { ok: true, data: { usage_id: usage?.id ?? "" } };
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
export type ReturnCondition = "GOOD" | "DAMAGED" | "LOST_ON_RETURN";

export async function logReturn(input: {
  transaction_id: string;
  /** Physical condition recorded by staff at the counter. Routes the unit
   *  count back to the right shelf via the AFTER UPDATE trigger:
   *  GOOD → available, DAMAGED → maintenance, LOST_ON_RETURN → lost. */
  condition: ReturnCondition;
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
    .update({ status: next, return_condition: input.condition })
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
