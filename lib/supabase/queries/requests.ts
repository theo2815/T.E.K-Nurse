import { createClient } from "@/lib/supabase/server";

export type RequestType = "equipment" | "consumable";

export type EquipmentRequestStatus =
  | "PENDING_PICKUP"
  | "APPROVED"
  | "RELEASED"
  | "EXPIRED"
  | "SKIPPED"
  | "CANCELLED"
  | "DECLINED";

export type ConsumableRequestStatus =
  | "PENDING_PICKUP"
  | "APPROVED"
  | "RELEASED"
  | "EXPIRED"
  | "CANCELLED"
  | "DECLINED";

export type RequestStatus =
  | EquipmentRequestStatus
  | ConsumableRequestStatus;

export type MyRequestRow = {
  id: string;
  type: RequestType;
  status: RequestStatus;
  quantity: number;
  borrow_date: string;
  expected_return_date: string | null;
  expires_at: string;
  notes: string | null;
  decline_reason: string | null;
  created_at: string;
  /** Approval timestamp — populated when status ∈ {APPROVED, RELEASED, EXPIRED}. */
  approved_at: string | null;
  /** Pickup code (shown on student page when status = APPROVED). */
  pickup_code: string | null;
  /** When the pickup code expires (24h after approval). Null pre-approval. */
  pickup_expires_at: string | null;
  released_at: string | null;
  sku: {
    id: string;
    qr_code: string;
    name: string;
    description: string | null;
    photo_url: string | null;
    unit: string | null;
  };
};

type EquipmentRow = {
  id: string;
  quantity: number;
  borrow_date: string;
  expected_return_date: string;
  status: EquipmentRequestStatus;
  expires_at: string;
  notes: string | null;
  decline_reason: string | null;
  created_at: string;
  approved_at: string | null;
  pickup_code: string | null;
  pickup_expires_at: string | null;
  released_at: string | null;
  equipment_sku: {
    id: string;
    qr_code: string;
    name: string;
    description: string | null;
    photo_url: string | null;
  };
};

type ConsumableRow = {
  id: string;
  quantity: number;
  borrow_date: string;
  status: ConsumableRequestStatus;
  expires_at: string;
  notes: string | null;
  decline_reason: string | null;
  created_at: string;
  approved_at: string | null;
  pickup_code: string | null;
  pickup_expires_at: string | null;
  released_at: string | null;
  consumable_sku: {
    id: string;
    qr_code: string;
    name: string;
    description: string | null;
    photo_url: string | null;
    unit: string;
  };
};

// PENDING tab now includes APPROVED — the student has a pickup code and an
// open task (go to the lab). RELEASED is the moment the item is in hand and
// the request lifecycle is complete; it lives in PAST alongside terminations.
const PENDING_STATUSES: RequestStatus[] = ["PENDING_PICKUP", "APPROVED"];
const PAST_STATUSES: RequestStatus[] = [
  "RELEASED",
  "EXPIRED",
  "SKIPPED",
  "CANCELLED",
  "DECLINED",
];

const EQUIPMENT_SELECT =
  "id, quantity, borrow_date, expected_return_date, status, expires_at, notes, decline_reason, created_at, approved_at, pickup_code, pickup_expires_at, released_at, equipment_sku ( id, qr_code, name, description, photo_url )";

const CONSUMABLE_SELECT =
  "id, quantity, borrow_date, status, expires_at, notes, decline_reason, created_at, approved_at, pickup_code, pickup_expires_at, released_at, consumable_sku ( id, qr_code, name, description, photo_url, unit )";

function mapEquipment(r: EquipmentRow): MyRequestRow {
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
    pickup_code: r.pickup_code,
    pickup_expires_at: r.pickup_expires_at,
    released_at: r.released_at,
    sku: {
      id: r.equipment_sku.id,
      qr_code: r.equipment_sku.qr_code,
      name: r.equipment_sku.name,
      description: r.equipment_sku.description,
      photo_url: r.equipment_sku.photo_url,
      unit: null,
    },
  };
}

function mapConsumable(r: ConsumableRow): MyRequestRow {
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
    pickup_code: r.pickup_code,
    pickup_expires_at: r.pickup_expires_at,
    released_at: r.released_at,
    sku: {
      id: r.consumable_sku.id,
      qr_code: r.consumable_sku.qr_code,
      name: r.consumable_sku.name,
      description: r.consumable_sku.description,
      photo_url: r.consumable_sku.photo_url,
      unit: r.consumable_sku.unit,
    },
  };
}

export async function listMyRequests(opts: {
  scope: "pending" | "past";
}): Promise<MyRequestRow[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const statuses =
    opts.scope === "pending" ? PENDING_STATUSES : PAST_STATUSES;

  const [eqRes, cnRes] = await Promise.all([
    supabase
      .from("borrow_request")
      .select(EQUIPMENT_SELECT)
      .eq("student_id", user.id)
      .in("status", statuses)
      .order("created_at", { ascending: false }),
    supabase
      .from("consumable_request")
      .select(CONSUMABLE_SELECT)
      .eq("student_id", user.id)
      .in("status", statuses.filter((s) => s !== "SKIPPED"))
      .order("created_at", { ascending: false }),
  ]);

  if (eqRes.error) throw eqRes.error;
  if (cnRes.error) throw cnRes.error;

  const merged: MyRequestRow[] = [
    ...((eqRes.data ?? []) as unknown as EquipmentRow[]).map(mapEquipment),
    ...((cnRes.data ?? []) as unknown as ConsumableRow[]).map(mapConsumable),
  ];

  merged.sort((a, b) => b.created_at.localeCompare(a.created_at));
  return merged;
}

export type MyRequestDetail = MyRequestRow & {
  /** Name of the staff who approved the request — joined via approved_by. */
  approved_by_name: string | null;
};

export async function getMyRequestById(opts: {
  id: string;
  type: RequestType;
}): Promise<MyRequestDetail | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  if (opts.type === "equipment") {
    const { data, error } = await supabase
      .from("borrow_request")
      .select(`${EQUIPMENT_SELECT}, approver:approved_by ( full_name )`)
      .eq("id", opts.id)
      .eq("student_id", user.id)
      .maybeSingle();
    if (error) throw error;
    if (!data) return null;

    const base = mapEquipment(data as unknown as EquipmentRow);
    const row = data as unknown as {
      approver: { full_name: string } | { full_name: string }[] | null;
    };
    const approver = Array.isArray(row.approver)
      ? row.approver[0] ?? null
      : row.approver;
    return { ...base, approved_by_name: approver?.full_name ?? null };
  }

  const { data, error } = await supabase
    .from("consumable_request")
    .select(`${CONSUMABLE_SELECT}, approver:approved_by ( full_name )`)
    .eq("id", opts.id)
    .eq("student_id", user.id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;

  const base = mapConsumable(data as unknown as ConsumableRow);
  const row = data as unknown as {
    approver: { full_name: string } | { full_name: string }[] | null;
  };
  const approver = Array.isArray(row.approver)
    ? row.approver[0] ?? null
    : row.approver;
  return { ...base, approved_by_name: approver?.full_name ?? null };
}

export function requestStatusLabel(s: RequestStatus): string {
  switch (s) {
    case "PENDING_PICKUP":
      return "PENDING PICKUP";
    case "APPROVED":
      return "READY TO COLLECT";
    case "RELEASED":
      return "PICKED UP";
    case "EXPIRED":
      return "EXPIRED";
    case "SKIPPED":
      return "SKIPPED";
    case "CANCELLED":
      return "CANCELLED";
    case "DECLINED":
      return "DECLINED";
  }
}
