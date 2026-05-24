import { createClient } from "@/lib/supabase/server";
import {
  pht00UtcIso,
  phtEndUtcIso,
  utcToPhtDate,
  eachDay,
  todayPht,
} from "@/lib/reports/date-range";

// ─── Filter label lookups (for active-chip rendering) ──────────────────────

export type SkuLabel = {
  id: string;
  qr_code: string;
  name: string;
  kind: "equipment" | "consumable";
};

export async function getSkuLabelById(opts: {
  kind: "equipment" | "consumable";
  id: string;
}): Promise<SkuLabel | null> {
  const supabase = await createClient();
  const table = opts.kind === "equipment" ? "equipment_sku" : "consumable_sku";
  const { data, error } = await supabase
    .from(table)
    .select("id, qr_code, name")
    .eq("id", opts.id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return {
    id: data.id as string,
    qr_code: data.qr_code as string,
    name: data.name as string,
    kind: opts.kind,
  };
}

export type StudentLabel = {
  id: string;
  full_name: string;
  email: string;
  student_id: string | null;
};

export async function getStudentLabelById(
  id: string,
): Promise<StudentLabel | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("users")
    .select("id, full_name, email, student_id")
    .eq("id", id)
    .eq("role", "student")
    .maybeSingle();
  if (error) throw error;
  return (data as StudentLabel | null) ?? null;
}

// ─── Shared shapes ─────────────────────────────────────────────────────────

export type Paged<T> = {
  rows: T[];
  total: number;
  page: number;
  pageSize: number;
};

export type DailyPoint = { date: string; value: number };

export const DEFAULT_PAGE_SIZE = 50;

type StudentJoin =
  | { id: string; full_name: string; email: string; student_id: string | null }
  | { id: string; full_name: string; email: string; student_id: string | null }[]
  | null;

type EqSkuJoin =
  | { id: string; qr_code: string; name: string }
  | { id: string; qr_code: string; name: string }[]
  | null;

type CnSkuJoin =
  | { id: string; qr_code: string; name: string; unit: string }
  | { id: string; qr_code: string; name: string; unit: string }[]
  | null;

type StudentLite = {
  id: string;
  full_name: string;
  email: string;
  student_id: string | null;
};

const EMPTY_STUDENT: StudentLite = {
  id: "",
  full_name: "Unknown",
  email: "",
  student_id: null,
};

function unwrapStudent(s: StudentJoin): StudentLite {
  if (!s) return EMPTY_STUDENT;
  const u = Array.isArray(s) ? s[0] : s;
  return u ?? EMPTY_STUDENT;
}

function unwrapEqSku(s: EqSkuJoin) {
  if (!s) return { id: "", qr_code: "", name: "Unknown" };
  const u = Array.isArray(s) ? s[0] : s;
  return u ?? { id: "", qr_code: "", name: "Unknown" };
}

function unwrapCnSku(s: CnSkuJoin) {
  if (!s) return { id: "", qr_code: "", name: "Unknown", unit: "" };
  const u = Array.isArray(s) ? s[0] : s;
  return u ?? { id: "", qr_code: "", name: "Unknown", unit: "" };
}

// ─── Borrow history ────────────────────────────────────────────────────────

export type BorrowHistoryStatus =
  | "BORROWED"
  | "RETURNED"
  | "RETURNED_LATE"
  | "OVERDUE"
  | "LOST";

export type BorrowHistoryRow = {
  id: string;
  status: BorrowHistoryStatus;
  quantity: number;
  borrowed_at: string;
  returned_at: string | null;
  expected_return_date: string;
  student: StudentLite;
  sku: { id: string; qr_code: string; name: string };
};

export type BorrowHistoryReport = Paged<BorrowHistoryRow> & {
  series: DailyPoint[];
  totals: {
    borrows: number;
    returns: number;
    overdue: number;
    lost: number;
  };
};

export type BorrowHistoryFilters = {
  from: string;
  to: string;
  status?: BorrowHistoryStatus[];
  skuId?: string;
  studentId?: string;
  page?: number;
  pageSize?: number;
};

export async function getBorrowHistoryReport(
  opts: BorrowHistoryFilters,
): Promise<BorrowHistoryReport> {
  const supabase = await createClient();
  const fromUtc = pht00UtcIso(opts.from);
  const toUtc = phtEndUtcIso(opts.to);
  const page = Math.max(1, opts.page ?? 1);
  const pageSize = opts.pageSize ?? DEFAULT_PAGE_SIZE;
  const offset = (page - 1) * pageSize;

  let q = supabase
    .from("borrow_transaction")
    .select(
      "id, status, quantity, borrowed_at, returned_at, expected_return_date, " +
        "student:student_id ( id, full_name, email, student_id ), " +
        "sku:equipment_sku_id ( id, qr_code, name )",
      { count: "exact" },
    )
    .gte("borrowed_at", fromUtc)
    .lt("borrowed_at", toUtc)
    .order("borrowed_at", { ascending: false })
    .range(offset, offset + pageSize - 1);

  if (opts.status && opts.status.length > 0) {
    q = q.in("status", opts.status);
  }
  if (opts.skuId) q = q.eq("equipment_sku_id", opts.skuId);
  if (opts.studentId) q = q.eq("student_id", opts.studentId);

  const { data, error, count } = await q;
  if (error) throw error;

  type Row = {
    id: string;
    status: BorrowHistoryStatus;
    quantity: number;
    borrowed_at: string;
    returned_at: string | null;
    expected_return_date: string;
    student: StudentJoin;
    sku: EqSkuJoin;
  };

  const rows: BorrowHistoryRow[] = ((data ?? []) as unknown as Row[]).map((r) => ({
    id: r.id,
    status: r.status,
    quantity: r.quantity,
    borrowed_at: r.borrowed_at,
    returned_at: r.returned_at,
    expected_return_date: r.expected_return_date,
    student: unwrapStudent(r.student),
    sku: unwrapEqSku(r.sku),
  }));

  // Series + status totals: separate aggregate query so paging doesn't bias
  // the chart. Same filters except no range/offset.
  let aggQ = supabase
    .from("borrow_transaction")
    .select("status, borrowed_at")
    .gte("borrowed_at", fromUtc)
    .lt("borrowed_at", toUtc);

  if (opts.status && opts.status.length > 0) {
    aggQ = aggQ.in("status", opts.status);
  }
  if (opts.skuId) aggQ = aggQ.eq("equipment_sku_id", opts.skuId);
  if (opts.studentId) aggQ = aggQ.eq("student_id", opts.studentId);

  const { data: aggData, error: aggErr } = await aggQ;
  if (aggErr) throw aggErr;

  const days = eachDay(opts.from, opts.to);
  const counts = new Map<string, number>(days.map((d) => [d, 0]));
  const totals = { borrows: 0, returns: 0, overdue: 0, lost: 0 };

  for (const row of (aggData ?? []) as {
    status: BorrowHistoryStatus;
    borrowed_at: string;
  }[]) {
    const day = utcToPhtDate(row.borrowed_at);
    if (counts.has(day)) counts.set(day, (counts.get(day) ?? 0) + 1);
    totals.borrows += 1;
    if (row.status === "RETURNED" || row.status === "RETURNED_LATE") {
      totals.returns += 1;
    } else if (row.status === "OVERDUE") {
      totals.overdue += 1;
    } else if (row.status === "LOST") {
      totals.lost += 1;
    }
  }

  const series: DailyPoint[] = days.map((d) => ({
    date: d,
    value: counts.get(d) ?? 0,
  }));

  return {
    rows,
    total: count ?? rows.length,
    page,
    pageSize,
    series,
    totals,
  };
}

// ─── Consumable usage ──────────────────────────────────────────────────────

export type ConsumableUsageRow = {
  id: string;
  used_at: string;
  quantity_used: number;
  student: StudentLite;
  sku: { id: string; qr_code: string; name: string; unit: string };
};

export type ConsumableUsageReport = Paged<ConsumableUsageRow> & {
  series: DailyPoint[];
  totals: {
    events: number;
    units: number;
  };
};

export type ConsumableUsageFilters = {
  from: string;
  to: string;
  skuId?: string;
  studentId?: string;
  page?: number;
  pageSize?: number;
};

export async function getConsumableUsageReport(
  opts: ConsumableUsageFilters,
): Promise<ConsumableUsageReport> {
  const supabase = await createClient();
  const fromUtc = pht00UtcIso(opts.from);
  const toUtc = phtEndUtcIso(opts.to);
  const page = Math.max(1, opts.page ?? 1);
  const pageSize = opts.pageSize ?? DEFAULT_PAGE_SIZE;
  const offset = (page - 1) * pageSize;

  let q = supabase
    .from("consumable_usage")
    .select(
      "id, used_at, quantity_used, " +
        "student:student_id ( id, full_name, email, student_id ), " +
        "sku:consumable_sku_id ( id, qr_code, name, unit )",
      { count: "exact" },
    )
    .gte("used_at", fromUtc)
    .lt("used_at", toUtc)
    .order("used_at", { ascending: false })
    .range(offset, offset + pageSize - 1);

  if (opts.skuId) q = q.eq("consumable_sku_id", opts.skuId);
  if (opts.studentId) q = q.eq("student_id", opts.studentId);

  const { data, error, count } = await q;
  if (error) throw error;

  type Row = {
    id: string;
    used_at: string;
    quantity_used: number;
    student: StudentJoin;
    sku: CnSkuJoin;
  };
  const rows: ConsumableUsageRow[] = ((data ?? []) as unknown as Row[]).map(
    (r) => ({
      id: r.id,
      used_at: r.used_at,
      quantity_used: r.quantity_used,
      student: unwrapStudent(r.student),
      sku: unwrapCnSku(r.sku),
    }),
  );

  let aggQ = supabase
    .from("consumable_usage")
    .select("used_at, quantity_used")
    .gte("used_at", fromUtc)
    .lt("used_at", toUtc);
  if (opts.skuId) aggQ = aggQ.eq("consumable_sku_id", opts.skuId);
  if (opts.studentId) aggQ = aggQ.eq("student_id", opts.studentId);

  const { data: aggData, error: aggErr } = await aggQ;
  if (aggErr) throw aggErr;

  const days = eachDay(opts.from, opts.to);
  const counts = new Map<string, number>(days.map((d) => [d, 0]));
  const totals = { events: 0, units: 0 };

  for (const row of (aggData ?? []) as {
    used_at: string;
    quantity_used: number;
  }[]) {
    const day = utcToPhtDate(row.used_at);
    const next = (counts.get(day) ?? 0) + row.quantity_used;
    if (counts.has(day)) counts.set(day, next);
    totals.events += 1;
    totals.units += row.quantity_used;
  }

  const series: DailyPoint[] = days.map((d) => ({
    date: d,
    value: counts.get(d) ?? 0,
  }));

  return {
    rows,
    total: count ?? rows.length,
    page,
    pageSize,
    series,
    totals,
  };
}

// ─── Overdue + Lost ────────────────────────────────────────────────────────

export type OverdueStatus = "OVERDUE" | "LOST";

export type OverdueRow = {
  id: string;
  status: OverdueStatus;
  quantity: number;
  borrowed_at: string;
  expected_return_date: string;
  days_overdue: number;
  student: StudentLite;
  sku: { id: string; qr_code: string; name: string };
};

export type OverdueReport = Paged<OverdueRow> & {
  totals: { overdue: number; lost: number };
};

export type OverdueFilters = {
  status?: OverdueStatus[];
  skuId?: string;
  studentId?: string;
  page?: number;
  pageSize?: number;
};

export async function getOverdueLostReport(
  opts: OverdueFilters = {},
): Promise<OverdueReport> {
  const supabase = await createClient();
  const page = Math.max(1, opts.page ?? 1);
  const pageSize = opts.pageSize ?? DEFAULT_PAGE_SIZE;
  const offset = (page - 1) * pageSize;
  const today = todayPht();

  const status =
    opts.status && opts.status.length > 0 ? opts.status : ["OVERDUE", "LOST"];

  let q = supabase
    .from("borrow_transaction")
    .select(
      "id, status, quantity, borrowed_at, expected_return_date, " +
        "student:student_id ( id, full_name, email, student_id ), " +
        "sku:equipment_sku_id ( id, qr_code, name )",
      { count: "exact" },
    )
    .in("status", status)
    .order("expected_return_date", { ascending: true })
    .range(offset, offset + pageSize - 1);

  if (opts.skuId) q = q.eq("equipment_sku_id", opts.skuId);
  if (opts.studentId) q = q.eq("student_id", opts.studentId);

  const { data, error, count } = await q;
  if (error) throw error;

  type Row = {
    id: string;
    status: OverdueStatus;
    quantity: number;
    borrowed_at: string;
    expected_return_date: string;
    student: StudentJoin;
    sku: EqSkuJoin;
  };
  const todayDate = new Date(`${today}T00:00:00.000+08:00`).getTime();
  const rows: OverdueRow[] = ((data ?? []) as unknown as Row[]).map((r) => {
    const dueDate = new Date(
      `${r.expected_return_date}T00:00:00.000+08:00`,
    ).getTime();
    const days = Math.max(
      0,
      Math.floor((todayDate - dueDate) / 86_400_000),
    );
    return {
      id: r.id,
      status: r.status,
      quantity: r.quantity,
      borrowed_at: r.borrowed_at,
      expected_return_date: r.expected_return_date,
      days_overdue: days,
      student: unwrapStudent(r.student),
      sku: unwrapEqSku(r.sku),
    };
  });

  const [oRes, lRes] = await Promise.all([
    supabase
      .from("borrow_transaction")
      .select("id", { count: "exact", head: true })
      .eq("status", "OVERDUE"),
    supabase
      .from("borrow_transaction")
      .select("id", { count: "exact", head: true })
      .eq("status", "LOST"),
  ]);
  if (oRes.error) throw oRes.error;
  if (lRes.error) throw lRes.error;

  return {
    rows,
    total: count ?? rows.length,
    page,
    pageSize,
    totals: {
      overdue: oRes.count ?? 0,
      lost: lRes.count ?? 0,
    },
  };
}

// ─── Low stock + expiring ──────────────────────────────────────────────────

export type EquipmentLowStockRow = {
  id: string;
  qr_code: string;
  name: string;
  available_units: number;
  low_stock_threshold: number;
  location: string | null;
};

export type ConsumableLowStockRow = {
  id: string;
  qr_code: string;
  name: string;
  unit: string;
  total_remaining: number;
  low_stock_threshold: number;
};

export type ExpiringLotRow = {
  id: string;
  sku_id: string;
  sku_qr: string;
  sku_name: string;
  unit: string;
  lot_number: string | null;
  expiration_date: string;
  days_until_expiry: number;
  quantity_remaining: number;
  warning_days: number;
};

export type LowStockReport = {
  equipment: EquipmentLowStockRow[];
  consumables: ConsumableLowStockRow[];
  expiring: ExpiringLotRow[];
};

export async function getLowStockReport(): Promise<LowStockReport> {
  const supabase = await createClient();

  const [eqRes, lotsRes, snRes] = await Promise.all([
    supabase
      .from("equipment_sku")
      .select(
        "id, qr_code, name, available_units, low_stock_threshold, location",
      )
      .order("qr_code"),
    supabase
      .from("consumable_lot")
      .select(
        "id, consumable_sku_id, lot_number, expiration_date, quantity_remaining, is_depleted",
      )
      .eq("is_depleted", false)
      .gt("quantity_remaining", 0),
    supabase
      .from("consumable_sku")
      .select(
        "id, qr_code, name, unit, low_stock_threshold, expiration_warning_days",
      )
      .order("qr_code"),
  ]);

  if (eqRes.error) throw eqRes.error;
  if (lotsRes.error) throw lotsRes.error;
  if (snRes.error) throw snRes.error;

  type EqRow = {
    id: string;
    qr_code: string;
    name: string;
    available_units: number;
    low_stock_threshold: number;
    location: string | null;
  };
  const equipment: EquipmentLowStockRow[] = ((eqRes.data ?? []) as EqRow[])
    .filter((r) => r.available_units < r.low_stock_threshold)
    .map((r) => ({
      id: r.id,
      qr_code: r.qr_code,
      name: r.name,
      available_units: r.available_units,
      low_stock_threshold: r.low_stock_threshold,
      location: r.location,
    }));

  type SnRow = {
    id: string;
    qr_code: string;
    name: string;
    unit: string;
    low_stock_threshold: number;
    expiration_warning_days: number;
  };
  type LotRow = {
    id: string;
    consumable_sku_id: string;
    lot_number: string | null;
    expiration_date: string;
    quantity_remaining: number;
  };

  const skuById = new Map<string, SnRow>(
    ((snRes.data ?? []) as SnRow[]).map((s) => [s.id, s]),
  );
  const totalsBySku = new Map<string, number>();
  for (const lot of (lotsRes.data ?? []) as LotRow[]) {
    totalsBySku.set(
      lot.consumable_sku_id,
      (totalsBySku.get(lot.consumable_sku_id) ?? 0) + lot.quantity_remaining,
    );
  }

  const consumables: ConsumableLowStockRow[] = [];
  for (const sku of skuById.values()) {
    const total = totalsBySku.get(sku.id) ?? 0;
    if (total < sku.low_stock_threshold) {
      consumables.push({
        id: sku.id,
        qr_code: sku.qr_code,
        name: sku.name,
        unit: sku.unit,
        total_remaining: total,
        low_stock_threshold: sku.low_stock_threshold,
      });
    }
  }
  consumables.sort((a, b) => a.qr_code.localeCompare(b.qr_code));

  const today = todayPht();
  const todayMs = new Date(`${today}T00:00:00.000+08:00`).getTime();
  const expiring: ExpiringLotRow[] = [];
  for (const lot of (lotsRes.data ?? []) as LotRow[]) {
    const sku = skuById.get(lot.consumable_sku_id);
    if (!sku) continue;
    const expMs = new Date(
      `${lot.expiration_date}T00:00:00.000+08:00`,
    ).getTime();
    const days = Math.floor((expMs - todayMs) / 86_400_000);
    if (days <= sku.expiration_warning_days) {
      expiring.push({
        id: lot.id,
        sku_id: sku.id,
        sku_qr: sku.qr_code,
        sku_name: sku.name,
        unit: sku.unit,
        lot_number: lot.lot_number,
        expiration_date: lot.expiration_date,
        days_until_expiry: days,
        quantity_remaining: lot.quantity_remaining,
        warning_days: sku.expiration_warning_days,
      });
    }
  }
  expiring.sort(
    (a, b) =>
      a.days_until_expiry - b.days_until_expiry ||
      a.sku_qr.localeCompare(b.sku_qr),
  );

  return { equipment, consumables, expiring };
}
