import { createClient } from "@/lib/supabase/server";

/**
 * Staff nav badge: count of student requests awaiting staff approval across
 * both borrow_request + consumable_request. Status `PENDING_PICKUP` is the
 * pre-approval state (confusingly named — see Decisions Log).
 */
export async function getStaffPendingRequestCount(): Promise<number> {
  const supabase = await createClient();

  const [borrow, consumable] = await Promise.all([
    supabase
      .from("borrow_request")
      .select("id", { count: "exact", head: true })
      .eq("status", "PENDING_PICKUP"),
    supabase
      .from("consumable_request")
      .select("id", { count: "exact", head: true })
      .eq("status", "PENDING_PICKUP"),
  ]);

  if (borrow.error) throw borrow.error;
  if (consumable.error) throw consumable.error;
  return (borrow.count ?? 0) + (consumable.count ?? 0);
}

/**
 * Student nav badge: count of this student's requests that staff have
 * approved and are now awaiting pickup. These are time-sensitive — the
 * student has an item ready and a deadline before it auto-expires.
 */
export async function getStudentAwaitingPickupCount(): Promise<number> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return 0;

  const [borrow, consumable] = await Promise.all([
    supabase
      .from("borrow_request")
      .select("id", { count: "exact", head: true })
      .eq("student_id", user.id)
      .eq("status", "APPROVED"),
    supabase
      .from("consumable_request")
      .select("id", { count: "exact", head: true })
      .eq("student_id", user.id)
      .eq("status", "APPROVED"),
  ]);

  if (borrow.error) throw borrow.error;
  if (consumable.error) throw consumable.error;
  return (borrow.count ?? 0) + (consumable.count ?? 0);
}
