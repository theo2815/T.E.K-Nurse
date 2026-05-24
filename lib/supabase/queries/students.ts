import { createClient } from "@/lib/supabase/server";
import type { Paged } from "@/lib/supabase/queries/reports";

export const STUDENTS_PAGE_SIZE = 50;

export type StudentRosterRow = {
  id: string;
  full_name: string;
  email: string;
  student_id: string | null;
  is_active: boolean;
  created_at: string;
  /** Open BORROWED + OVERDUE borrows for this student. */
  active_loan_count: number;
  /** OVERDUE + LOST — drives the borrowing block flag too. */
  overdue_count: number;
  /** Most recent activity (borrow or usage) timestamp, or null. */
  last_activity_at: string | null;
};

export type StudentRoster = Paged<StudentRosterRow>;

export type StudentRosterFilters = {
  q?: string;
  page?: number;
  pageSize?: number;
};

export async function listStudents(
  opts: StudentRosterFilters = {},
): Promise<StudentRoster> {
  const supabase = await createClient();
  const page = Math.max(1, opts.page ?? 1);
  const pageSize = opts.pageSize ?? STUDENTS_PAGE_SIZE;
  const offset = (page - 1) * pageSize;

  let q = supabase
    .from("users")
    .select(
      "id, full_name, email, student_id, is_active, created_at",
      { count: "exact" },
    )
    .eq("role", "student")
    .order("full_name", { ascending: true })
    .range(offset, offset + pageSize - 1);

  const trimmed = opts.q?.trim();
  if (trimmed && trimmed.length >= 1) {
    const escaped = trimmed.replace(/[%_,]/g, (m) => `\\${m}`);
    const pattern = `%${escaped}%`;
    q = q.or(`full_name.ilike.${pattern},email.ilike.${pattern}`);
  }

  const { data, error, count } = await q;
  if (error) throw error;

  type BaseRow = {
    id: string;
    full_name: string;
    email: string;
    student_id: string | null;
    is_active: boolean;
    created_at: string;
  };
  const baseRows = (data ?? []) as BaseRow[];

  if (baseRows.length === 0) {
    return {
      rows: [],
      total: count ?? 0,
      page,
      pageSize,
    };
  }

  const ids = baseRows.map((r) => r.id);

  // Batch the per-row aggregates: one query for borrow status counts +
  // last borrow per student; one for last usage per student. Resolve in JS.
  const [borrowsRes, usagesRes] = await Promise.all([
    supabase
      .from("borrow_transaction")
      .select("student_id, status, borrowed_at")
      .in("student_id", ids),
    supabase
      .from("consumable_usage")
      .select("student_id, used_at")
      .in("student_id", ids),
  ]);
  if (borrowsRes.error) throw borrowsRes.error;
  if (usagesRes.error) throw usagesRes.error;

  type BorrowAgg = {
    student_id: string;
    status: "BORROWED" | "RETURNED" | "RETURNED_LATE" | "OVERDUE" | "LOST";
    borrowed_at: string;
  };
  type UsageAgg = { student_id: string; used_at: string };

  const active = new Map<string, number>();
  const overdue = new Map<string, number>();
  const lastBorrow = new Map<string, string>();
  for (const row of (borrowsRes.data ?? []) as BorrowAgg[]) {
    if (row.status === "BORROWED" || row.status === "OVERDUE") {
      active.set(row.student_id, (active.get(row.student_id) ?? 0) + 1);
    }
    if (row.status === "OVERDUE" || row.status === "LOST") {
      overdue.set(row.student_id, (overdue.get(row.student_id) ?? 0) + 1);
    }
    const prev = lastBorrow.get(row.student_id);
    if (!prev || row.borrowed_at > prev) {
      lastBorrow.set(row.student_id, row.borrowed_at);
    }
  }

  const lastUsage = new Map<string, string>();
  for (const row of (usagesRes.data ?? []) as UsageAgg[]) {
    const prev = lastUsage.get(row.student_id);
    if (!prev || row.used_at > prev) {
      lastUsage.set(row.student_id, row.used_at);
    }
  }

  const rows: StudentRosterRow[] = baseRows.map((r) => {
    const lb = lastBorrow.get(r.id);
    const lu = lastUsage.get(r.id);
    const last =
      lb && lu ? (lb > lu ? lb : lu) : (lb ?? lu ?? null);
    return {
      ...r,
      active_loan_count: active.get(r.id) ?? 0,
      overdue_count: overdue.get(r.id) ?? 0,
      last_activity_at: last,
    };
  });

  return {
    rows,
    total: count ?? rows.length,
    page,
    pageSize,
  };
}

// ─── Single-student detail ─────────────────────────────────────────────────

export type LatestSuspension = {
  reason: string;
  suspended_at: string;
  suspended_by_id: string | null;
  suspended_by_name: string | null;
};

export type StudentDetail = StudentRosterRow & {
  /** Total borrows including past/returned. */
  lifetime_borrow_count: number;
  /** Total consumable usage events. */
  lifetime_usage_count: number;
  /** First borrow or usage timestamp, if any. */
  first_activity_at: string | null;
  /**
   * The currently-active suspension event, if `is_active === false`.
   * `null` when the student is active OR when they were suspended before
   * 0015 shipped (no audit row to read).
   */
  latest_suspension: LatestSuspension | null;
};

export async function getStudentDetail(id: string): Promise<StudentDetail | null> {
  const supabase = await createClient();
  const { data: profile, error } = await supabase
    .from("users")
    .select("id, full_name, email, student_id, is_active, created_at, role")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!profile || profile.role !== "student") return null;

  const [borrowsRes, usagesRes, latestSuspensionRes] = await Promise.all([
    supabase
      .from("borrow_transaction")
      .select("status, borrowed_at")
      .eq("student_id", id),
    supabase
      .from("consumable_usage")
      .select("used_at")
      .eq("student_id", id),
    profile.is_active
      ? Promise.resolve({ data: null, error: null } as const)
      : supabase.rpc("get_latest_suspension", { p_student_id: id }),
  ]);
  if (borrowsRes.error) throw borrowsRes.error;
  if (usagesRes.error) throw usagesRes.error;
  if (latestSuspensionRes.error) throw latestSuspensionRes.error;

  type BR = {
    status: "BORROWED" | "RETURNED" | "RETURNED_LATE" | "OVERDUE" | "LOST";
    borrowed_at: string;
  };
  type UR = { used_at: string };
  const borrows = (borrowsRes.data ?? []) as BR[];
  const usages = (usagesRes.data ?? []) as UR[];

  let active = 0;
  let overdue = 0;
  let firstBorrow: string | null = null;
  let lastBorrow: string | null = null;
  for (const b of borrows) {
    if (b.status === "BORROWED" || b.status === "OVERDUE") active += 1;
    if (b.status === "OVERDUE" || b.status === "LOST") overdue += 1;
    if (!firstBorrow || b.borrowed_at < firstBorrow) firstBorrow = b.borrowed_at;
    if (!lastBorrow || b.borrowed_at > lastBorrow) lastBorrow = b.borrowed_at;
  }
  let firstUsage: string | null = null;
  let lastUsage: string | null = null;
  for (const u of usages) {
    if (!firstUsage || u.used_at < firstUsage) firstUsage = u.used_at;
    if (!lastUsage || u.used_at > lastUsage) lastUsage = u.used_at;
  }
  const first =
    firstBorrow && firstUsage
      ? firstBorrow < firstUsage
        ? firstBorrow
        : firstUsage
      : (firstBorrow ?? firstUsage ?? null);
  const last =
    lastBorrow && lastUsage
      ? lastBorrow > lastUsage
        ? lastBorrow
        : lastUsage
      : (lastBorrow ?? lastUsage ?? null);

  type LatestSuspensionRow = {
    reason: string | null;
    suspended_at: string;
    suspended_by_id: string | null;
    suspended_by_name: string | null;
  };
  const suspensionRows =
    (latestSuspensionRes.data ?? null) as LatestSuspensionRow[] | null;
  const latest_suspension: LatestSuspension | null =
    suspensionRows && suspensionRows.length > 0
      ? {
          reason: suspensionRows[0].reason ?? "",
          suspended_at: suspensionRows[0].suspended_at,
          suspended_by_id: suspensionRows[0].suspended_by_id,
          suspended_by_name: suspensionRows[0].suspended_by_name,
        }
      : null;

  return {
    id: profile.id as string,
    full_name: profile.full_name as string,
    email: profile.email as string,
    student_id: (profile.student_id as string | null) ?? null,
    is_active: profile.is_active as boolean,
    created_at: profile.created_at as string,
    active_loan_count: active,
    overdue_count: overdue,
    last_activity_at: last,
    lifetime_borrow_count: borrows.length,
    lifetime_usage_count: usages.length,
    first_activity_at: first,
    latest_suspension,
  };
}

// ─── Suspension history ────────────────────────────────────────────────────

export type SuspensionHistoryEvent = {
  id: string;
  occurred_at: string;
  action_type: "student_suspended" | "student_reinstated";
  reason: string | null;
  actor_id: string | null;
  actor_name: string | null;
};

/**
 * Chronological log of suspend/reinstate events for one student. Reads
 * audit_log via the SECURITY DEFINER `get_student_suspension_history` RPC,
 * which gates on `is_staff()` itself.
 */
export async function getStudentSuspensionHistory(
  studentId: string,
): Promise<SuspensionHistoryEvent[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc(
    "get_student_suspension_history",
    { p_student_id: studentId },
  );
  if (error) throw error;

  type Row = {
    id: string;
    occurred_at: string;
    action_type: string;
    reason: string | null;
    actor_id: string | null;
    actor_name: string | null;
  };
  return ((data ?? []) as Row[])
    .filter(
      (r): r is Row & {
        action_type: "student_suspended" | "student_reinstated";
      } =>
        r.action_type === "student_suspended" ||
        r.action_type === "student_reinstated",
    )
    .map((r) => ({
      id: r.id,
      occurred_at: r.occurred_at,
      action_type: r.action_type,
      reason: r.reason,
      actor_id: r.actor_id,
      actor_name: r.actor_name,
    }));
}

// ─── Current student's paused state (self-read) ────────────────────────────

export type MyPausedState =
  | { paused: false }
  | { paused: true; reason: string | null; suspendedAt: string | null };

/**
 * Returns the current authenticated student's suspension state in one trip.
 * Used by surfaces that need to either gate submission (interstitial on
 * `/student/requests/new`) or surface a passive banner (strip on
 * `/student/home`).
 *
 * Leans on the `get_latest_suspension` RPC's self-read branch
 * (`auth.uid() = p_student_id`) — students can see their own paused row but
 * not anyone else's. Returns `{ paused: false }` when unauthenticated rather
 * than throwing, so callers can defer the redirect decision.
 */
export async function getMyPausedState(): Promise<MyPausedState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { paused: false };

  const { data: profile } = await supabase
    .from("users")
    .select("is_active")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile || profile.is_active !== false) return { paused: false };

  type LatestRow = { reason: string | null; suspended_at: string };
  const { data } = await supabase.rpc("get_latest_suspension", {
    p_student_id: user.id,
  });
  const rows = (data ?? null) as LatestRow[] | null;
  const first = rows && rows.length > 0 ? rows[0] : null;
  return {
    paused: true,
    reason: first?.reason ?? null,
    suspendedAt: first?.suspended_at ?? null,
  };
}

// ─── Active loans for one student ──────────────────────────────────────────

export type StudentActiveLoanRow = {
  id: string;
  quantity: number;
  status: "BORROWED" | "OVERDUE";
  borrowed_at: string;
  expected_return_date: string;
  sku: {
    id: string;
    qr_code: string;
    name: string;
  };
};

export async function listStudentActiveLoans(
  studentId: string,
): Promise<StudentActiveLoanRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("borrow_transaction")
    .select(
      "id, quantity, status, borrowed_at, expected_return_date, sku:equipment_sku_id ( id, qr_code, name )",
    )
    .eq("student_id", studentId)
    .in("status", ["BORROWED", "OVERDUE"])
    .order("expected_return_date", { ascending: true });
  if (error) throw error;

  type SkuJoin =
    | { id: string; qr_code: string; name: string }
    | { id: string; qr_code: string; name: string }[]
    | null;
  type Row = {
    id: string;
    quantity: number;
    status: "BORROWED" | "OVERDUE";
    borrowed_at: string;
    expected_return_date: string;
    sku: SkuJoin;
  };
  function unwrap(s: SkuJoin) {
    if (!s) return { id: "", qr_code: "", name: "Unknown" };
    return Array.isArray(s) ? (s[0] ?? { id: "", qr_code: "", name: "Unknown" }) : s;
  }

  return ((data ?? []) as unknown as Row[]).map((r) => ({
    id: r.id,
    quantity: r.quantity,
    status: r.status,
    borrowed_at: r.borrowed_at,
    expected_return_date: r.expected_return_date,
    sku: unwrap(r.sku),
  }));
}

// ─── Transaction history for one student (merged borrows + usages) ─────────

export type StudentHistoryItem =
  | {
      kind: "borrow";
      id: string;
      when: string;
      status: "BORROWED" | "RETURNED" | "RETURNED_LATE" | "OVERDUE" | "LOST";
      quantity: number;
      returned_at: string | null;
      expected_return_date: string;
      sku: { id: string; qr_code: string; name: string };
    }
  | {
      kind: "usage";
      id: string;
      when: string;
      quantity: number;
      sku: { id: string; qr_code: string; name: string; unit: string };
    };

export type StudentHistoryPage = Paged<StudentHistoryItem>;

export const STUDENT_HISTORY_PAGE_SIZE = 25;

/**
 * Merged borrow + usage events for one student, newest first. Paginated by
 * client-side merge — pulls up to `pageSize * page * 2` rows from each source
 * then trims after merging. Small page sizes keep the over-fetch sane at
 * lab scale; the alternative (a DB view with union all) is overkill here.
 */
export async function listStudentTransactionHistory(opts: {
  studentId: string;
  page?: number;
  pageSize?: number;
}): Promise<StudentHistoryPage> {
  const supabase = await createClient();
  const page = Math.max(1, opts.page ?? 1);
  const pageSize = opts.pageSize ?? STUDENT_HISTORY_PAGE_SIZE;
  const limit = pageSize * page;

  const [borrowsRes, usagesRes, borrowsCountRes, usagesCountRes] =
    await Promise.all([
      supabase
        .from("borrow_transaction")
        .select(
          "id, quantity, status, borrowed_at, returned_at, expected_return_date, sku:equipment_sku_id ( id, qr_code, name )",
        )
        .eq("student_id", opts.studentId)
        .order("borrowed_at", { ascending: false })
        .limit(limit + pageSize),
      supabase
        .from("consumable_usage")
        .select(
          "id, used_at, quantity_used, sku:consumable_sku_id ( id, qr_code, name, unit )",
        )
        .eq("student_id", opts.studentId)
        .order("used_at", { ascending: false })
        .limit(limit + pageSize),
      supabase
        .from("borrow_transaction")
        .select("id", { count: "exact", head: true })
        .eq("student_id", opts.studentId),
      supabase
        .from("consumable_usage")
        .select("id", { count: "exact", head: true })
        .eq("student_id", opts.studentId),
    ]);
  if (borrowsRes.error) throw borrowsRes.error;
  if (usagesRes.error) throw usagesRes.error;
  if (borrowsCountRes.error) throw borrowsCountRes.error;
  if (usagesCountRes.error) throw usagesCountRes.error;

  type SkuEqJoin =
    | { id: string; qr_code: string; name: string }
    | { id: string; qr_code: string; name: string }[]
    | null;
  type SkuCnJoin =
    | { id: string; qr_code: string; name: string; unit: string }
    | { id: string; qr_code: string; name: string; unit: string }[]
    | null;
  type BR = {
    id: string;
    quantity: number;
    status: "BORROWED" | "RETURNED" | "RETURNED_LATE" | "OVERDUE" | "LOST";
    borrowed_at: string;
    returned_at: string | null;
    expected_return_date: string;
    sku: SkuEqJoin;
  };
  type UR = {
    id: string;
    used_at: string;
    quantity_used: number;
    sku: SkuCnJoin;
  };

  function unwrapEq(s: SkuEqJoin) {
    if (!s) return { id: "", qr_code: "", name: "Unknown" };
    return Array.isArray(s) ? (s[0] ?? { id: "", qr_code: "", name: "Unknown" }) : s;
  }
  function unwrapCn(s: SkuCnJoin) {
    if (!s) return { id: "", qr_code: "", name: "Unknown", unit: "" };
    return Array.isArray(s)
      ? (s[0] ?? { id: "", qr_code: "", name: "Unknown", unit: "" })
      : s;
  }

  const borrowItems: StudentHistoryItem[] = (
    (borrowsRes.data ?? []) as unknown as BR[]
  ).map((r) => ({
    kind: "borrow",
    id: r.id,
    when:
      r.status === "RETURNED" || r.status === "RETURNED_LATE"
        ? (r.returned_at ?? r.borrowed_at)
        : r.borrowed_at,
    status: r.status,
    quantity: r.quantity,
    returned_at: r.returned_at,
    expected_return_date: r.expected_return_date,
    sku: unwrapEq(r.sku),
  }));

  const usageItems: StudentHistoryItem[] = (
    (usagesRes.data ?? []) as unknown as UR[]
  ).map((r) => ({
    kind: "usage",
    id: r.id,
    when: r.used_at,
    quantity: r.quantity_used,
    sku: unwrapCn(r.sku),
  }));

  const merged = [...borrowItems, ...usageItems].sort((a, b) =>
    b.when.localeCompare(a.when),
  );

  const total =
    (borrowsCountRes.count ?? 0) + (usagesCountRes.count ?? 0);
  const offset = (page - 1) * pageSize;
  const sliced = merged.slice(offset, offset + pageSize);

  return {
    rows: sliced,
    total,
    page,
    pageSize,
  };
}
