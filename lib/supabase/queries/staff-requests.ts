import { createClient } from "@/lib/supabase/server";

export type RequestType = "equipment" | "consumable";

export type StaffRequestStatus =
  | "PENDING_PICKUP"
  | "APPROVED"
  | "RELEASED"
  | "EXPIRED"
  | "SKIPPED"
  | "CANCELLED"
  | "DECLINED";

export type StaffPendingRequestRow = {
  id: string;
  type: RequestType;
  status: StaffRequestStatus;
  quantity: number;
  borrow_date: string;
  expected_return_date: string | null;
  expires_at: string;
  notes: string | null;
  decline_reason: string | null;
  created_at: string;
  /** Approval attribution (slice #3). Populated once status ∈ {APPROVED, RELEASED, EXPIRED}. */
  approved_at: string | null;
  approved_by_name: string | null;
  /** Pickup code (slice #4). Set on approval, cleared semantically once RELEASED. */
  pickup_code: string | null;
  pickup_expires_at: string | null;
  released_at: string | null;
  released_by_name: string | null;
  sku: {
    id: string;
    qr_code: string;
    name: string;
    description: string | null;
    photo_url: string | null;
    unit: string | null;
  };
  student: {
    id: string;
    full_name: string;
    email: string;
    year_section: string | null;
  };
};

type StudentJoin =
  | { id: string; full_name: string; email: string; year_section: string | null }
  | { id: string; full_name: string; email: string; year_section: string | null }[]
  | null;

type UserJoin =
  | { full_name: string }
  | { full_name: string }[]
  | null;

type EquipmentJoin = {
  id: string;
  quantity: number;
  borrow_date: string;
  expected_return_date: string;
  status: StaffRequestStatus;
  expires_at: string;
  notes: string | null;
  decline_reason: string | null;
  created_at: string;
  approved_at: string | null;
  pickup_code: string | null;
  pickup_expires_at: string | null;
  released_at: string | null;
  approver: UserJoin;
  releaser: UserJoin;
  equipment_sku:
    | {
        id: string;
        qr_code: string;
        name: string;
        description: string | null;
        photo_url: string | null;
      }
    | {
        id: string;
        qr_code: string;
        name: string;
        description: string | null;
        photo_url: string | null;
      }[]
    | null;
  student: StudentJoin;
};

type ConsumableJoin = {
  id: string;
  quantity: number;
  borrow_date: string;
  status: StaffRequestStatus;
  expires_at: string;
  notes: string | null;
  decline_reason: string | null;
  created_at: string;
  approved_at: string | null;
  pickup_code: string | null;
  pickup_expires_at: string | null;
  released_at: string | null;
  approver: UserJoin;
  releaser: UserJoin;
  consumable_sku:
    | {
        id: string;
        qr_code: string;
        name: string;
        description: string | null;
        photo_url: string | null;
        unit: string;
      }
    | {
        id: string;
        qr_code: string;
        name: string;
        description: string | null;
        photo_url: string | null;
        unit: string;
      }[]
    | null;
  student: StudentJoin;
};

const EQUIPMENT_SELECT =
  "id, quantity, borrow_date, expected_return_date, status, expires_at, notes, decline_reason, created_at, approved_at, pickup_code, pickup_expires_at, released_at, approver:approved_by ( full_name ), releaser:released_by ( full_name ), equipment_sku ( id, qr_code, name, description, photo_url ), student:student_id ( id, full_name, email, year_section )";

const CONSUMABLE_SELECT =
  "id, quantity, borrow_date, status, expires_at, notes, decline_reason, created_at, approved_at, pickup_code, pickup_expires_at, released_at, approver:approved_by ( full_name ), releaser:released_by ( full_name ), consumable_sku ( id, qr_code, name, description, photo_url, unit ), student:student_id ( id, full_name, email, year_section )";

function unwrapStudent(s: StudentJoin) {
  if (!s) return { id: "", full_name: "Unknown", email: "", year_section: null };
  const u = Array.isArray(s) ? s[0] : s;
  return u ?? { id: "", full_name: "Unknown", email: "", year_section: null };
}

function unwrapSku<T>(s: T | T[] | null): T | null {
  if (!s) return null;
  return Array.isArray(s) ? s[0] ?? null : s;
}

function unwrapUser(u: UserJoin): { full_name: string } | null {
  if (!u) return null;
  return Array.isArray(u) ? u[0] ?? null : u;
}

function mapEquipment(r: EquipmentJoin): StaffPendingRequestRow {
  const sku = unwrapSku(r.equipment_sku);
  const approver = unwrapUser(r.approver);
  const releaser = unwrapUser(r.releaser);
  return {
    id: r.id,
    type: "equipment",
    status: r.status,
    quantity: r.quantity,
    borrow_date: r.borrow_date,
    expected_return_date: r.expected_return_date,
    expires_at: r.expires_at,
    notes: r.notes,
    decline_reason: r.decline_reason,
    created_at: r.created_at,
    approved_at: r.approved_at,
    approved_by_name: approver?.full_name ?? null,
    pickup_code: r.pickup_code,
    pickup_expires_at: r.pickup_expires_at,
    released_at: r.released_at,
    released_by_name: releaser?.full_name ?? null,
    sku: {
      id: sku?.id ?? "",
      qr_code: sku?.qr_code ?? "",
      name: sku?.name ?? "Unknown",
      description: sku?.description ?? null,
      photo_url: sku?.photo_url ?? null,
      unit: null,
    },
    student: unwrapStudent(r.student),
  };
}

function mapConsumable(r: ConsumableJoin): StaffPendingRequestRow {
  const sku = unwrapSku(r.consumable_sku);
  const approver = unwrapUser(r.approver);
  const releaser = unwrapUser(r.releaser);
  return {
    id: r.id,
    type: "consumable",
    status: r.status,
    quantity: r.quantity,
    borrow_date: r.borrow_date,
    expected_return_date: null,
    expires_at: r.expires_at,
    notes: r.notes,
    decline_reason: r.decline_reason,
    created_at: r.created_at,
    approved_at: r.approved_at,
    approved_by_name: approver?.full_name ?? null,
    pickup_code: r.pickup_code,
    pickup_expires_at: r.pickup_expires_at,
    released_at: r.released_at,
    released_by_name: releaser?.full_name ?? null,
    sku: {
      id: sku?.id ?? "",
      qr_code: sku?.qr_code ?? "",
      name: sku?.name ?? "Unknown",
      description: sku?.description ?? null,
      photo_url: sku?.photo_url ?? null,
      unit: sku?.unit ?? null,
    },
    student: unwrapStudent(r.student),
  };
}

/**
 * Pending request queue for staff. Oldest first (FIFO).
 * type='all' returns equipment + consumable merged by created_at asc.
 */
export async function listPendingRequests(
  opts: { type?: RequestType | "all" } = {},
): Promise<StaffPendingRequestRow[]> {
  const supabase = await createClient();
  const type = opts.type ?? "all";

  const eqPromise =
    type === "consumable"
      ? Promise.resolve({ data: [] as EquipmentJoin[], error: null })
      : supabase
          .from("borrow_request")
          .select(EQUIPMENT_SELECT)
          .eq("status", "PENDING_PICKUP")
          .order("created_at", { ascending: true });

  const cnPromise =
    type === "equipment"
      ? Promise.resolve({ data: [] as ConsumableJoin[], error: null })
      : supabase
          .from("consumable_request")
          .select(CONSUMABLE_SELECT)
          .eq("status", "PENDING_PICKUP")
          .order("created_at", { ascending: true });

  const [eqRes, cnRes] = await Promise.all([eqPromise, cnPromise]);
  if (eqRes.error) throw eqRes.error;
  if (cnRes.error) throw cnRes.error;

  const equipment = ((eqRes.data ?? []) as unknown as EquipmentJoin[]).map(
    mapEquipment,
  );
  const consumable = ((cnRes.data ?? []) as unknown as ConsumableJoin[]).map(
    mapConsumable,
  );

  if (type === "equipment") return equipment;
  if (type === "consumable") return consumable;

  return [...equipment, ...consumable].sort((a, b) =>
    a.created_at.localeCompare(b.created_at),
  );
}

export async function getPendingRequestById(opts: {
  id: string;
  type: RequestType;
}): Promise<StaffPendingRequestRow | null> {
  const supabase = await createClient();
  if (opts.type === "equipment") {
    const { data, error } = await supabase
      .from("borrow_request")
      .select(EQUIPMENT_SELECT)
      .eq("id", opts.id)
      .maybeSingle();
    if (error) throw error;
    if (!data) return null;
    return mapEquipment(data as unknown as EquipmentJoin);
  }
  const { data, error } = await supabase
    .from("consumable_request")
    .select(CONSUMABLE_SELECT)
    .eq("id", opts.id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return mapConsumable(data as unknown as ConsumableJoin);
}

/** Pending requests for a single SKU. Used by the override modal (Flow 6). */
export async function listPendingRequestsForEquipmentSku(
  equipmentSkuId: string,
): Promise<StaffPendingRequestRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("borrow_request")
    .select(EQUIPMENT_SELECT)
    .eq("status", "PENDING_PICKUP")
    .eq("equipment_sku_id", equipmentSkuId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return ((data ?? []) as unknown as EquipmentJoin[]).map(mapEquipment);
}

/** APPROVED-but-not-yet-released requests for a single equipment SKU. Used by
 *  the scan flow to surface "student at counter with code" verifications. */
export async function listAwaitingPickupForEquipmentSku(
  equipmentSkuId: string,
): Promise<StaffPendingRequestRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("borrow_request")
    .select(EQUIPMENT_SELECT)
    .eq("status", "APPROVED")
    .eq("equipment_sku_id", equipmentSkuId)
    .order("approved_at", { ascending: true });
  if (error) throw error;
  return ((data ?? []) as unknown as EquipmentJoin[]).map(mapEquipment);
}

/** APPROVED-but-not-yet-released requests for a single consumable SKU. */
export async function listAwaitingPickupForConsumableSku(
  consumableSkuId: string,
): Promise<StaffPendingRequestRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("consumable_request")
    .select(CONSUMABLE_SELECT)
    .eq("status", "APPROVED")
    .eq("consumable_sku_id", consumableSkuId)
    .order("approved_at", { ascending: true });
  if (error) throw error;
  return ((data ?? []) as unknown as ConsumableJoin[]).map(mapConsumable);
}

export type StudentSearchRow = {
  id: string;
  full_name: string;
  email: string;
  year_section: string | null;
  /** Count of borrow_transaction rows in OVERDUE or LOST status for this
   *  student. Populated only by searchStudents / getStudentById — pre-existing
   *  joins on request/transaction rows leave it undefined. Surfaced in the
   *  walk-in modals so staff sees the block before submitting. */
  overdue_count?: number;
};

/**
 * Typeahead search over verified active students.
 * Returns up to 10 matches against full_name OR email (case-insensitive).
 * Empty / short queries return [].
 *
 * Each row is enriched with overdue_count so the walk-in modals can show a
 * pre-submit warning when the student is blocked from borrowing.
 */
export async function searchStudents(q: string): Promise<StudentSearchRow[]> {
  const query = q.trim();
  if (query.length < 2) return [];

  const supabase = await createClient();
  const escaped = query.replace(/[%_,]/g, (m) => `\\${m}`);
  const pattern = `%${escaped}%`;

  const { data, error } = await supabase
    .from("users")
    .select("id, full_name, email, year_section")
    .eq("role", "student")
    .eq("is_active", true)
    .or(`full_name.ilike.${pattern},email.ilike.${pattern}`)
    .order("full_name", { ascending: true })
    .limit(10);

  if (error) throw error;
  const rows = (data ?? []) as StudentSearchRow[];
  return attachOverdueCounts(supabase, rows);
}

export async function getStudentById(
  id: string,
): Promise<StudentSearchRow | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("users")
    .select("id, full_name, email, year_section")
    .eq("id", id)
    .eq("role", "student")
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const [enriched] = await attachOverdueCounts(supabase, [data as StudentSearchRow]);
  return enriched ?? null;
}

async function attachOverdueCounts(
  supabase: Awaited<ReturnType<typeof createClient>>,
  rows: StudentSearchRow[],
): Promise<StudentSearchRow[]> {
  if (rows.length === 0) return rows;
  const ids = rows.map((r) => r.id);
  const { data, error } = await supabase
    .from("borrow_transaction")
    .select("student_id")
    .in("status", ["OVERDUE", "LOST"])
    .in("student_id", ids);
  if (error) throw error;

  const counts = new Map<string, number>();
  for (const row of (data ?? []) as { student_id: string }[]) {
    counts.set(row.student_id, (counts.get(row.student_id) ?? 0) + 1);
  }
  return rows.map((r) => ({ ...r, overdue_count: counts.get(r.id) ?? 0 }));
}

export type OpenBorrowRow = {
  id: string;
  quantity: number;
  status: "BORROWED" | "OVERDUE";
  borrowed_at: string;
  expected_return_date: string;
  student: StudentSearchRow;
};

/** Open (BORROWED or OVERDUE) borrow_transactions for a single equipment SKU. */
export async function listOpenBorrowsForEquipmentSku(
  equipmentSkuId: string,
): Promise<OpenBorrowRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("borrow_transaction")
    .select(
      "id, quantity, status, borrowed_at, expected_return_date, student:student_id ( id, full_name, email, year_section )",
    )
    .eq("equipment_sku_id", equipmentSkuId)
    .in("status", ["BORROWED", "OVERDUE"])
    .order("borrowed_at", { ascending: true });
  if (error) throw error;

  type Row = {
    id: string;
    quantity: number;
    status: "BORROWED" | "OVERDUE";
    borrowed_at: string;
    expected_return_date: string;
    student: StudentJoin;
  };
  return ((data ?? []) as unknown as Row[]).map((r) => ({
    id: r.id,
    quantity: r.quantity,
    status: r.status,
    borrowed_at: r.borrowed_at,
    expected_return_date: r.expected_return_date,
    student: unwrapStudent(r.student),
  }));
}

export type PendingCountByType = {
  equipment: number;
  consumable: number;
  total: number;
};

export async function getPendingRequestCounts(): Promise<PendingCountByType> {
  const supabase = await createClient();
  const [eq, cn] = await Promise.all([
    supabase
      .from("borrow_request")
      .select("id", { count: "exact", head: true })
      .eq("status", "PENDING_PICKUP"),
    supabase
      .from("consumable_request")
      .select("id", { count: "exact", head: true })
      .eq("status", "PENDING_PICKUP"),
  ]);
  if (eq.error) throw eq.error;
  if (cn.error) throw cn.error;
  const equipment = eq.count ?? 0;
  const consumable = cn.count ?? 0;
  return { equipment, consumable, total: equipment + consumable };
}

/**
 * All APPROVED-but-not-yet-released requests. Ordered by pickup_expires_at
 * ascending so the most-urgent (expiring soonest) shows first.
 * type='all' returns equipment + consumable merged.
 */
export async function listAwaitingPickupRequests(
  opts: { type?: RequestType | "all" } = {},
): Promise<StaffPendingRequestRow[]> {
  const supabase = await createClient();
  const type = opts.type ?? "all";

  const eqPromise =
    type === "consumable"
      ? Promise.resolve({ data: [] as EquipmentJoin[], error: null })
      : supabase
          .from("borrow_request")
          .select(EQUIPMENT_SELECT)
          .eq("status", "APPROVED")
          .order("pickup_expires_at", { ascending: true });

  const cnPromise =
    type === "equipment"
      ? Promise.resolve({ data: [] as ConsumableJoin[], error: null })
      : supabase
          .from("consumable_request")
          .select(CONSUMABLE_SELECT)
          .eq("status", "APPROVED")
          .order("pickup_expires_at", { ascending: true });

  const [eqRes, cnRes] = await Promise.all([eqPromise, cnPromise]);
  if (eqRes.error) throw eqRes.error;
  if (cnRes.error) throw cnRes.error;

  const equipment = ((eqRes.data ?? []) as unknown as EquipmentJoin[]).map(
    mapEquipment,
  );
  const consumable = ((cnRes.data ?? []) as unknown as ConsumableJoin[]).map(
    mapConsumable,
  );

  if (type === "equipment") return equipment;
  if (type === "consumable") return consumable;

  return [...equipment, ...consumable].sort((a, b) => {
    const ax = a.pickup_expires_at ?? "";
    const bx = b.pickup_expires_at ?? "";
    return ax.localeCompare(bx);
  });
}

export async function getAwaitingPickupCounts(): Promise<PendingCountByType> {
  const supabase = await createClient();
  const [eq, cn] = await Promise.all([
    supabase
      .from("borrow_request")
      .select("id", { count: "exact", head: true })
      .eq("status", "APPROVED"),
    supabase
      .from("consumable_request")
      .select("id", { count: "exact", head: true })
      .eq("status", "APPROVED"),
  ]);
  if (eq.error) throw eq.error;
  if (cn.error) throw cn.error;
  const equipment = eq.count ?? 0;
  const consumable = cn.count ?? 0;
  return { equipment, consumable, total: equipment + consumable };
}

export type OverdueCounts = {
  /** Transactions marked OVERDUE today or earlier. */
  overdue: number;
  /** BORROWED transactions whose expected_return_date <= today (not yet flagged OVERDUE by cron). */
  due_today_or_earlier: number;
};

export async function getOverdueCounts(): Promise<OverdueCounts> {
  const supabase = await createClient();
  const today = new Date().toISOString().slice(0, 10);
  const [overdueRes, dueRes] = await Promise.all([
    supabase
      .from("borrow_transaction")
      .select("id", { count: "exact", head: true })
      .eq("status", "OVERDUE"),
    supabase
      .from("borrow_transaction")
      .select("id", { count: "exact", head: true })
      .eq("status", "BORROWED")
      .lte("expected_return_date", today),
  ]);
  if (overdueRes.error) throw overdueRes.error;
  if (dueRes.error) throw dueRes.error;
  return {
    overdue: overdueRes.count ?? 0,
    due_today_or_earlier: dueRes.count ?? 0,
  };
}

export type StaffDashboardStats = {
  pending: PendingCountByType;
  overdue: OverdueCounts;
  /** Total active borrows (status in BORROWED, OVERDUE). */
  items_out: number;
};

export async function getStaffDashboardStats(): Promise<StaffDashboardStats> {
  const supabase = await createClient();
  const [pending, overdue, outRes] = await Promise.all([
    getPendingRequestCounts(),
    getOverdueCounts(),
    supabase
      .from("borrow_transaction")
      .select("id", { count: "exact", head: true })
      .in("status", ["BORROWED", "OVERDUE"]),
  ]);
  if (outRes.error) throw outRes.error;
  return {
    pending,
    overdue,
    items_out: outRes.count ?? 0,
  };
}

export type ActivityFeedItem =
  | {
      kind: "borrow";
      id: string;
      when: string;
      status: "BORROWED" | "RETURNED" | "RETURNED_LATE" | "OVERDUE" | "LOST";
      quantity: number;
      student_name: string;
      sku_name: string;
      sku_qr: string;
    }
  | {
      kind: "usage";
      id: string;
      when: string;
      quantity: number;
      student_name: string;
      sku_name: string;
      sku_qr: string;
      unit: string;
    };

/** Most recent activity across borrows + consumable usages. Default limit 10. */
export async function listRecentActivity(
  limit = 10,
): Promise<ActivityFeedItem[]> {
  const supabase = await createClient();
  const [borrowRes, usageRes] = await Promise.all([
    supabase
      .from("borrow_transaction")
      .select(
        "id, status, borrowed_at, returned_at, quantity, student:student_id ( full_name ), equipment_sku ( name, qr_code )",
      )
      .order("created_at", { ascending: false })
      .limit(limit),
    supabase
      .from("consumable_usage")
      .select(
        "id, used_at, quantity_used, student:student_id ( full_name ), consumable_sku ( name, qr_code, unit )",
      )
      .order("used_at", { ascending: false })
      .limit(limit),
  ]);
  if (borrowRes.error) throw borrowRes.error;
  if (usageRes.error) throw usageRes.error;

  type BorrowRow = {
    id: string;
    status: "BORROWED" | "RETURNED" | "RETURNED_LATE" | "OVERDUE" | "LOST";
    borrowed_at: string;
    returned_at: string | null;
    quantity: number;
    student: { full_name: string } | { full_name: string }[] | null;
    equipment_sku:
      | { name: string; qr_code: string }
      | { name: string; qr_code: string }[]
      | null;
  };
  type UsageRow = {
    id: string;
    used_at: string;
    quantity_used: number;
    student: { full_name: string } | { full_name: string }[] | null;
    consumable_sku:
      | { name: string; qr_code: string; unit: string }
      | { name: string; qr_code: string; unit: string }[]
      | null;
  };

  const borrows: ActivityFeedItem[] = (
    (borrowRes.data ?? []) as unknown as BorrowRow[]
  ).map((r) => {
    const student = Array.isArray(r.student) ? r.student[0] : r.student;
    const sku = Array.isArray(r.equipment_sku)
      ? r.equipment_sku[0]
      : r.equipment_sku;
    return {
      kind: "borrow",
      id: r.id,
      when:
        r.status === "RETURNED" || r.status === "RETURNED_LATE"
          ? r.returned_at ?? r.borrowed_at
          : r.borrowed_at,
      status: r.status,
      quantity: r.quantity,
      student_name: student?.full_name ?? "Unknown",
      sku_name: sku?.name ?? "Unknown",
      sku_qr: sku?.qr_code ?? "",
    };
  });

  const usages: ActivityFeedItem[] = (
    (usageRes.data ?? []) as unknown as UsageRow[]
  ).map((r) => {
    const student = Array.isArray(r.student) ? r.student[0] : r.student;
    const sku = Array.isArray(r.consumable_sku)
      ? r.consumable_sku[0]
      : r.consumable_sku;
    return {
      kind: "usage",
      id: r.id,
      when: r.used_at,
      quantity: r.quantity_used,
      student_name: student?.full_name ?? "Unknown",
      sku_name: sku?.name ?? "Unknown",
      sku_qr: sku?.qr_code ?? "",
      unit: sku?.unit ?? "",
    };
  });

  return [...borrows, ...usages]
    .sort((a, b) => b.when.localeCompare(a.when))
    .slice(0, limit);
}
