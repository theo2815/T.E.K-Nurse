import { createClient } from "@/lib/supabase/server";
import { pht00UtcIso, phtEndUtcIso } from "@/lib/reports/date-range";
import type { Paged } from "@/lib/supabase/queries/reports";
import {
  AUDIT_ACTION_GROUPS,
  AUDIT_ALL_ACTIONS,
  AUDIT_ENTITY_TYPES,
  type AuditEntityType,
} from "@/lib/audit/constants";

// Re-export the client-safe constants so server-only callers (the page,
// other server queries) can import everything from one place without
// caring where the bytes live.
export {
  AUDIT_ACTION_GROUPS,
  AUDIT_ALL_ACTIONS,
  AUDIT_ENTITY_TYPES,
  type AuditEntityType,
};

export const AUDIT_PAGE_SIZE = 25;

export type AuditRow = {
  id: string;
  timestamp: string;
  /** Lowercased at the query boundary so any legacy uppercase rows collapse. */
  action_type: string;
  entity_type: string;
  entity_id: string;
  /** null = system (cron / scheduled job). */
  actor_id: string | null;
  /** null when actor is system OR actor row was deleted. */
  actor_name: string | null;
  /** Primary human-readable label for the target entity. */
  target_label: string;
  /** Secondary line (e.g. QR code, email) — null when nothing useful. */
  target_secondary: string | null;
  before_value: Record<string, unknown> | null;
  after_value: Record<string, unknown> | null;
  notes: string | null;
};

export type AuditTotals = {
  events: number;
  /** Distinct non-null actors within the filter window. */
  actors: number;
  /** Count of rows where actor_id IS NULL within the filter window. */
  system: number;
};

export type AuditReport = Paged<AuditRow> & { totals: AuditTotals };

/** "system" filters to rows with `actor_id IS NULL`. */
export type AuditActorFilter = "system" | string;

export type AuditFilters = {
  from: string;
  to: string;
  actorId?: AuditActorFilter;
  actionTypes?: string[];
  entityType?: AuditEntityType;
  page?: number;
  pageSize?: number;
};

// ─── Main list query ──────────────────────────────────────────────────────

export async function listAuditLog(
  opts: AuditFilters,
): Promise<AuditReport> {
  const supabase = await createClient();
  const fromUtc = pht00UtcIso(opts.from);
  const toUtc = phtEndUtcIso(opts.to);
  const page = Math.max(1, opts.page ?? 1);
  const pageSize = opts.pageSize ?? AUDIT_PAGE_SIZE;
  const offset = (page - 1) * pageSize;

  let q = supabase
    .from("audit_log")
    .select(
      "id, timestamp, action_type, entity_type, entity_id, actor_id, before_value, after_value, notes, actor:actor_id ( full_name )",
      { count: "exact" },
    )
    .gte("timestamp", fromUtc)
    .lt("timestamp", toUtc)
    .order("timestamp", { ascending: false })
    .range(offset, offset + pageSize - 1);

  if (opts.actorId === "system") {
    q = q.is("actor_id", null);
  } else if (opts.actorId) {
    q = q.eq("actor_id", opts.actorId);
  }
  if (opts.actionTypes && opts.actionTypes.length > 0) {
    q = q.in("action_type", opts.actionTypes);
  }
  if (opts.entityType) {
    q = q.eq("entity_type", opts.entityType);
  }

  const { data, error, count } = await q;
  if (error) throw error;

  // Hero totals: separate aggregate so chart-style stats reflect the full
  // matching set, not just the current page.
  const totals = await fetchAuditTotals(opts, fromUtc, toUtc);

  type ActorJoin =
    | { full_name: string }
    | { full_name: string }[]
    | null;
  type Row = {
    id: string;
    timestamp: string;
    action_type: string;
    entity_type: string;
    entity_id: string;
    actor_id: string | null;
    before_value: Record<string, unknown> | null;
    after_value: Record<string, unknown> | null;
    notes: string | null;
    actor: ActorJoin;
  };

  const rawRows = (data ?? []) as unknown as Row[];
  const labelMap = await batchFetchLabels(rawRows);

  const rows: AuditRow[] = rawRows.map((r) => {
    const lookupKey = `${r.entity_type}:${r.entity_id}`;
    const live = labelMap.get(lookupKey);
    const target =
      live ?? deriveFallbackLabel(r.entity_type, r.entity_id, r.before_value, r.after_value);
    const actorName = unwrapActorJoin(r.actor);
    return {
      id: r.id,
      timestamp: r.timestamp,
      action_type: r.action_type.toLowerCase(),
      entity_type: r.entity_type,
      entity_id: r.entity_id,
      actor_id: r.actor_id,
      actor_name: actorName,
      target_label: target.label,
      target_secondary: target.secondary,
      before_value: r.before_value,
      after_value: r.after_value,
      notes: r.notes,
    };
  });

  return {
    rows,
    total: count ?? rows.length,
    page,
    pageSize,
    totals,
  };
}

function unwrapActorJoin(
  actor: { full_name: string } | { full_name: string }[] | null,
): string | null {
  if (!actor) return null;
  if (Array.isArray(actor)) return actor[0]?.full_name ?? null;
  return actor.full_name ?? null;
}

async function fetchAuditTotals(
  opts: AuditFilters,
  fromUtc: string,
  toUtc: string,
): Promise<AuditTotals> {
  const supabase = await createClient();
  let q = supabase
    .from("audit_log")
    .select("actor_id", { count: "exact" })
    .gte("timestamp", fromUtc)
    .lt("timestamp", toUtc);

  if (opts.actorId === "system") {
    q = q.is("actor_id", null);
  } else if (opts.actorId) {
    q = q.eq("actor_id", opts.actorId);
  }
  if (opts.actionTypes && opts.actionTypes.length > 0) {
    q = q.in("action_type", opts.actionTypes);
  }
  if (opts.entityType) {
    q = q.eq("entity_type", opts.entityType);
  }

  // Cap the total scan — at lab scale even an unfiltered all-time fetch is
  // tiny, but the cap prevents pathological accidents (e.g., 5-year history
  // pulled in one shot). The `count: 'exact'` is the source of truth for
  // event totals; the in-memory walk only needs enough rows to compute
  // distinct actors + system count.
  const { data, error, count } = await q.limit(20000);
  if (error) throw error;

  type Row = { actor_id: string | null };
  const rows = (data ?? []) as Row[];
  const distinctActors = new Set<string>();
  let systemCount = 0;
  for (const r of rows) {
    if (r.actor_id === null) systemCount += 1;
    else distinctActors.add(r.actor_id);
  }

  return {
    events: count ?? rows.length,
    actors: distinctActors.size,
    system: systemCount,
  };
}

// ─── Target-name resolution ───────────────────────────────────────────────

type LabelPair = { label: string; secondary: string | null };

async function batchFetchLabels(
  rows: { entity_type: string; entity_id: string }[],
): Promise<Map<string, LabelPair>> {
  const map = new Map<string, LabelPair>();
  if (rows.length === 0) return map;

  // Group ids by entity_type
  const byType = new Map<string, Set<string>>();
  for (const r of rows) {
    const set = byType.get(r.entity_type) ?? new Set<string>();
    set.add(r.entity_id);
    byType.set(r.entity_type, set);
  }

  const supabase = await createClient();
  const tasks: Promise<void>[] = [];

  for (const [entityType, idSet] of byType) {
    const ids = [...idSet];
    if (ids.length === 0) continue;
    tasks.push(hydrateOneType(supabase, entityType, ids, map));
  }
  await Promise.all(tasks);
  return map;
}

type SB = Awaited<ReturnType<typeof createClient>>;

async function hydrateOneType(
  supabase: SB,
  entityType: string,
  ids: string[],
  out: Map<string, LabelPair>,
): Promise<void> {
  // Fetch shape-per-table. We tolerate misses (row deleted) — the caller
  // walks rawRows + falls back to the JSON snapshot.
  if (entityType === "users") {
    const { data } = await supabase
      .from("users")
      .select("id, full_name, email")
      .in("id", ids);
    for (const r of (data ?? []) as {
      id: string;
      full_name: string;
      email: string;
    }[]) {
      out.set(`users:${r.id}`, { label: r.full_name, secondary: r.email });
    }
    return;
  }

  if (entityType === "equipment_sku") {
    const { data } = await supabase
      .from("equipment_sku")
      .select("id, name, qr_code")
      .in("id", ids);
    for (const r of (data ?? []) as {
      id: string;
      name: string;
      qr_code: string;
    }[]) {
      out.set(`equipment_sku:${r.id}`, {
        label: r.name,
        secondary: r.qr_code,
      });
    }
    return;
  }

  if (entityType === "consumable_sku") {
    const { data } = await supabase
      .from("consumable_sku")
      .select("id, name, qr_code")
      .in("id", ids);
    for (const r of (data ?? []) as {
      id: string;
      name: string;
      qr_code: string;
    }[]) {
      out.set(`consumable_sku:${r.id}`, {
        label: r.name,
        secondary: r.qr_code,
      });
    }
    return;
  }

  if (entityType === "consumable_lot") {
    const { data } = await supabase
      .from("consumable_lot")
      .select(
        "id, lot_number, sku:consumable_sku_id ( name, qr_code )",
      )
      .in("id", ids);
    type LotSkuJoin =
      | { name: string; qr_code: string }
      | { name: string; qr_code: string }[]
      | null;
    type LotRow = { id: string; lot_number: string | null; sku: LotSkuJoin };
    for (const r of (data ?? []) as unknown as LotRow[]) {
      const sku = r.sku
        ? Array.isArray(r.sku)
          ? r.sku[0]
          : r.sku
        : null;
      const skuName = sku?.name ?? "Lot";
      const lotPart = r.lot_number ?? r.id.slice(0, 8);
      out.set(`consumable_lot:${r.id}`, {
        label: skuName,
        secondary: `Lot ${lotPart}`,
      });
    }
    return;
  }

  if (entityType === "borrow_request" || entityType === "borrow_transaction") {
    const table = entityType;
    const { data } = await supabase
      .from(table)
      .select(
        "id, sku:equipment_sku_id ( name, qr_code ), student:student_id ( full_name )",
      )
      .in("id", ids);
    type SkuJ =
      | { name: string; qr_code: string }
      | { name: string; qr_code: string }[]
      | null;
    type StudentJ =
      | { full_name: string }
      | { full_name: string }[]
      | null;
    type RR = { id: string; sku: SkuJ; student: StudentJ };
    for (const r of (data ?? []) as unknown as RR[]) {
      const sku = r.sku
        ? Array.isArray(r.sku)
          ? r.sku[0]
          : r.sku
        : null;
      const student = r.student
        ? Array.isArray(r.student)
          ? r.student[0]
          : r.student
        : null;
      out.set(`${entityType}:${r.id}`, {
        label: sku?.name ?? "Unknown item",
        secondary: student?.full_name ?? null,
      });
    }
    return;
  }

  if (
    entityType === "consumable_request" ||
    entityType === "consumable_usage"
  ) {
    const table = entityType;
    const fk = entityType === "consumable_usage"
      ? "consumable_sku_id"
      : "consumable_sku_id";
    const { data } = await supabase
      .from(table)
      .select(
        `id, sku:${fk} ( name, qr_code ), student:student_id ( full_name )`,
      )
      .in("id", ids);
    type SkuJ =
      | { name: string; qr_code: string }
      | { name: string; qr_code: string }[]
      | null;
    type StudentJ =
      | { full_name: string }
      | { full_name: string }[]
      | null;
    type RR = { id: string; sku: SkuJ; student: StudentJ };
    for (const r of (data ?? []) as unknown as RR[]) {
      const sku = r.sku
        ? Array.isArray(r.sku)
          ? r.sku[0]
          : r.sku
        : null;
      const student = r.student
        ? Array.isArray(r.student)
          ? r.student[0]
          : r.student
        : null;
      out.set(`${entityType}:${r.id}`, {
        label: sku?.name ?? "Unknown item",
        secondary: student?.full_name ?? null,
      });
    }
    return;
  }
  // Unknown entity_type — fall through silently; caller uses derive fallback.
}

/**
 * 3rd-rung fallback. The entity_type table didn't return the row (likely
 * hard-deleted). Mine the audit row's own JSON snapshot for a name, then
 * fall back to "<entity_type> · <8-char-id>" muted-style.
 */
function deriveFallbackLabel(
  entityType: string,
  entityId: string,
  before: Record<string, unknown> | null,
  after: Record<string, unknown> | null,
): LabelPair {
  const snap = (after ?? before ?? {}) as Record<string, unknown>;
  const altSnap = (before ?? {}) as Record<string, unknown>;
  const pick = (k: string): string | null => {
    const v = snap[k] ?? altSnap[k];
    return typeof v === "string" && v.length > 0 ? v : null;
  };
  const shortId = entityId.slice(0, 8);

  if (entityType === "users") {
    const label = pick("full_name") ?? `User · ${shortId}`;
    const secondary = pick("email");
    return { label, secondary };
  }
  if (entityType === "equipment_sku" || entityType === "consumable_sku") {
    const label = pick("name") ?? `Deleted SKU · ${shortId}`;
    const secondary = pick("qr_code");
    return { label, secondary };
  }
  if (entityType === "consumable_lot") {
    const label = "Deleted lot";
    const lotPart = pick("lot_number") ?? shortId;
    return { label, secondary: `Lot ${lotPart}` };
  }
  // Requests / transactions / usage — IDs in the snapshot don't dereference
  // without another roundtrip. Use a generic placeholder; the action_type
  // already tells the reader what happened.
  const prefix = humanizeEntityType(entityType);
  return { label: `${prefix} · ${shortId}`, secondary: null };
}

function humanizeEntityType(entityType: string): string {
  switch (entityType) {
    case "borrow_request":
      return "Borrow request";
    case "borrow_transaction":
      return "Borrow";
    case "consumable_request":
      return "Consumable request";
    case "consumable_usage":
      return "Consumable use";
    case "users":
      return "User";
    case "equipment_sku":
      return "Equipment";
    case "consumable_sku":
      return "Consumable";
    case "consumable_lot":
      return "Lot";
    default:
      return entityType;
  }
}

// ─── Actor search + label lookup (for filter chips) ───────────────────────

export type AuditActorOption = {
  /** UUID, or the literal "system". */
  id: string;
  full_name: string;
  email: string | null;
  role: "staff" | "student" | "system";
};

export const SYSTEM_ACTOR: AuditActorOption = {
  id: "system",
  full_name: "System",
  email: null,
  role: "system",
};

/**
 * Typeahead for the actor filter. Includes both staff + students (audit log
 * is staff-actioned, but a future activity-by-student pivot may use the
 * same field for student rows). Pinned "System" sentinel surfaces when the
 * query is empty or matches "sys".
 */
export async function searchActors(q: string): Promise<AuditActorOption[]> {
  const query = q.trim();
  const supabase = await createClient();
  const includeSystem =
    query.length === 0 || "system".includes(query.toLowerCase());

  if (query.length < 2) {
    // With no real query we still return the System sentinel + recent staff
    // so the dropdown isn't empty on first focus.
    const { data } = await supabase
      .from("users")
      .select("id, full_name, email, role")
      .eq("role", "staff")
      .order("full_name", { ascending: true })
      .limit(8);
    const staffRows = ((data ?? []) as AuditActorOption[]).map((r) => ({
      ...r,
      role: (r.role ?? "staff") as AuditActorOption["role"],
    }));
    return includeSystem ? [SYSTEM_ACTOR, ...staffRows] : staffRows;
  }

  const escaped = query.replace(/[%_,]/g, (m) => `\\${m}`);
  const pattern = `%${escaped}%`;

  const { data, error } = await supabase
    .from("users")
    .select("id, full_name, email, role")
    .or(`full_name.ilike.${pattern},email.ilike.${pattern}`)
    .order("full_name", { ascending: true })
    .limit(10);

  if (error) throw error;
  const rows = ((data ?? []) as AuditActorOption[]).map((r) => ({
    ...r,
    role: (r.role ?? "student") as AuditActorOption["role"],
  }));
  return includeSystem ? [SYSTEM_ACTOR, ...rows] : rows;
}

export async function getActorLabelById(
  id: AuditActorFilter,
): Promise<AuditActorOption | null> {
  if (id === "system") return SYSTEM_ACTOR;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("users")
    .select("id, full_name, email, role")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return {
    id: data.id as string,
    full_name: data.full_name as string,
    email: (data.email as string) ?? null,
    role: ((data.role as string) ?? "student") as AuditActorOption["role"],
  };
}
