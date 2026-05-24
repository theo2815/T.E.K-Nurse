import { createClient } from "@/lib/supabase/server";

// ─── Recent activity ──────────────────────────────────────────────────────

export type StaffActivityEntry = {
  id: string;
  timestamp: string;
  action_type: string;
  entity_type: string;
  entity_id: string;
  notes: string | null;
};

/**
 * Lightweight "recent activity" feed for the staff transmission log on
 * /staff/profile. Keeps the row shape small — no target-name resolution,
 * no actor join (the actor is always the requesting user). The page
 * translates `action_type` → display label client-side via
 * `actionLabel()` / `actionTone()` from `components/audit/action-labels`.
 *
 * For the full target-resolved view, /staff/audit-log uses `listAuditLog()`.
 */
export async function getRecentStaffActivity(
  userId: string,
  limit: number = 6,
): Promise<StaffActivityEntry[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("audit_log")
    .select("id, timestamp, action_type, entity_type, entity_id, notes")
    .eq("actor_id", userId)
    .order("timestamp", { ascending: false })
    .limit(limit);
  if (error) throw error;

  type Row = {
    id: string;
    timestamp: string;
    action_type: string;
    entity_type: string;
    entity_id: string;
    notes: string | null;
  };
  return ((data ?? []) as Row[]).map((r) => ({
    id: r.id,
    timestamp: r.timestamp,
    action_type: r.action_type.toLowerCase(),
    entity_type: r.entity_type,
    entity_id: r.entity_id,
    notes: r.notes,
  }));
}

// ─── Aggregate stats ──────────────────────────────────────────────────────

export type StaffProfileStats = {
  borrows_approved: number;
  suspensions_issued: number;
  member_since: string;
};

/**
 * Three-stat band for /staff/profile.
 *
 * - `borrows_approved`: lifetime `borrow_transaction` rows where the current
 *   user was the approver (includes walk-ins where staff is set as
 *   `approved_by` on insert).
 * - `suspensions_issued`: lifetime `audit_log` rows where the actor pushed
 *   either `student_suspended` or `student_reinstated`. Mirrors the way
 *   /staff/audit-log groups the two events under "Account".
 * - `member_since`: `public.users.created_at` for the row that
 *   `handle_new_user` inserted at signup. Distinct from `auth.users.created_at`
 *   which we don't currently read; same instant in practice.
 */
export async function getStaffProfileStats(
  userId: string,
): Promise<StaffProfileStats> {
  const supabase = await createClient();
  const [approvedRes, suspensionsRes, memberRes] = await Promise.all([
    supabase
      .from("borrow_transaction")
      .select("id", { count: "exact", head: true })
      .eq("approved_by", userId),
    supabase
      .from("audit_log")
      .select("id", { count: "exact", head: true })
      .eq("actor_id", userId)
      .in("action_type", ["student_suspended", "student_reinstated"]),
    supabase
      .from("users")
      .select("created_at")
      .eq("id", userId)
      .maybeSingle(),
  ]);
  if (approvedRes.error) throw approvedRes.error;
  if (suspensionsRes.error) throw suspensionsRes.error;
  if (memberRes.error) throw memberRes.error;

  return {
    borrows_approved: approvedRes.count ?? 0,
    suspensions_issued: suspensionsRes.count ?? 0,
    member_since: memberRes.data?.created_at ?? new Date().toISOString(),
  };
}

export type StudentProfileStats = {
  lifetime_borrows: number;
  lifetime_usages: number;
  items_lost: number;
  currently_out: number;
  member_since: string;
};

/**
 * Four-stat band for /student/profile + the "Joined" caption underneath.
 * Distinct from `getMyHistoryStats()` (3 stats, no `currently_out`) which is
 * already used by /student/history — leaving that one alone to avoid
 * regressions in unrelated pages.
 *
 * RLS scopes everything to the authenticated student automatically.
 */
export async function getStudentProfileStats(
  userId: string,
): Promise<StudentProfileStats> {
  const supabase = await createClient();
  const [borrowsRes, usagesRes, lostRes, outRes, memberRes] = await Promise.all(
    [
      supabase
        .from("borrow_transaction")
        .select("id", { count: "exact", head: true })
        .eq("student_id", userId),
      supabase
        .from("consumable_usage")
        .select("id", { count: "exact", head: true })
        .eq("student_id", userId),
      supabase
        .from("borrow_transaction")
        .select("id", { count: "exact", head: true })
        .eq("student_id", userId)
        .eq("status", "LOST"),
      supabase
        .from("borrow_transaction")
        .select("id", { count: "exact", head: true })
        .eq("student_id", userId)
        .in("status", ["BORROWED", "OVERDUE"]),
      supabase
        .from("users")
        .select("created_at")
        .eq("id", userId)
        .maybeSingle(),
    ],
  );
  if (borrowsRes.error) throw borrowsRes.error;
  if (usagesRes.error) throw usagesRes.error;
  if (lostRes.error) throw lostRes.error;
  if (outRes.error) throw outRes.error;
  if (memberRes.error) throw memberRes.error;

  return {
    lifetime_borrows: borrowsRes.count ?? 0,
    lifetime_usages: usagesRes.count ?? 0,
    items_lost: lostRes.count ?? 0,
    currently_out: outRes.count ?? 0,
    member_since: memberRes.data?.created_at ?? new Date().toISOString(),
  };
}
