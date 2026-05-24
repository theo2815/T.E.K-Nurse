import {
  listPendingRequests,
  listAwaitingPickupRequests,
  getPendingRequestCounts,
  getAwaitingPickupCounts,
  type StaffPendingRequestRow,
} from "@/lib/supabase/queries/staff-requests";
import { CatalogHeader } from "@/components/catalog/CatalogHeader";
import { EmptyState } from "@/components/catalog/EmptyState";
import { RequestsTabs } from "@/components/requests/RequestsTabs";
import { StaffRequestCard } from "@/components/requests/StaffRequestCard";
import { StaffAwaitingPickupCard } from "@/components/requests/StaffAwaitingPickupCard";
import { StaffRequestsRealtime } from "@/components/requests/StaffRequestsRealtime";
import {
  RequestsSearchableList,
  type RequestsSearchableItem,
} from "@/components/requests/RequestsSearchableList";

function buildSearchText(r: StaffPendingRequestRow): string {
  return [
    r.student.full_name,
    r.student.student_id ?? "",
    r.student.email,
    r.sku.name,
    r.sku.qr_code,
  ]
    .join(" ")
    .toLowerCase();
}

type QueueStage = "pending" | "awaiting";
type QueueType = "all" | "equipment" | "consumable";

function parseStage(v: string | undefined): QueueStage {
  return v === "awaiting" ? "awaiting" : "pending";
}
function parseType(v: string | undefined): QueueType {
  if (v === "equipment" || v === "consumable") return v;
  return "all";
}

function formatPickup(iso: string): string {
  const todayLocal = new Date();
  const today = `${todayLocal.getFullYear()}-${String(
    todayLocal.getMonth() + 1,
  ).padStart(2, "0")}-${String(todayLocal.getDate()).padStart(2, "0")}`;
  if (iso === today) return "Pickup today";
  const tomorrow = new Date(todayLocal);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tIso = `${tomorrow.getFullYear()}-${String(
    tomorrow.getMonth() + 1,
  ).padStart(2, "0")}-${String(tomorrow.getDate()).padStart(2, "0")}`;
  if (iso === tIso) return "Pickup tomorrow";
  const d = new Date(`${iso}T00:00:00`);
  return `Pickup ${d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  })}`;
}

function pendingCardProps(r: StaffPendingRequestRow) {
  const qtyUnit = r.sku.unit ? ` ${r.sku.unit}` : r.quantity === 1 ? " unit" : " units";
  return {
    href: `/staff/requests/${r.id}?type=${r.type}`,
    type: r.type,
    qr: r.sku.qr_code,
    studentName: r.student.full_name,
    studentDetail: r.student.student_id ?? r.student.email,
    itemName: r.sku.name,
    itemPhotoUrl: r.sku.photo_url,
    itemMeta: `${formatPickup(r.borrow_date)}  ·  Qty ${r.quantity}${qtyUnit}`,
    createdAt: r.created_at,
    expiresAt: r.expires_at,
  } as const;
}

const STAGE_TABS: Array<{ value: QueueStage; label: string }> = [
  { value: "pending", label: "Pending approval" },
  { value: "awaiting", label: "Awaiting pickup" },
];

const TYPE_TABS: Array<{ value: QueueType; label: string }> = [
  { value: "all", label: "All" },
  { value: "equipment", label: "Equipment" },
  { value: "consumable", label: "Consumables" },
];

function emptyHint(stage: QueueStage, type: QueueType): string {
  if (stage === "pending") {
    if (type === "all")
      return "No students are waiting. Walk-ins start from Inventory or the Scan FAB.";
    if (type === "equipment") return "No equipment pre-requests waiting.";
    return "No consumable pre-requests waiting.";
  }
  if (type === "all") return "No approved requests are awaiting pickup.";
  if (type === "equipment")
    return "No approved equipment requests awaiting pickup.";
  return "No approved consumable requests awaiting pickup.";
}

export default async function StaffRequestsPage({
  searchParams,
}: {
  searchParams: Promise<{ stage?: string; type?: string }>;
}) {
  const sp = await searchParams;
  const stage = parseStage(sp.stage);
  const type = parseType(sp.type);

  const [pendingCounts, awaitingCounts, rows] = await Promise.all([
    getPendingRequestCounts(),
    getAwaitingPickupCounts(),
    stage === "pending"
      ? listPendingRequests({ type: type === "all" ? "all" : type })
      : listAwaitingPickupRequests({ type: type === "all" ? "all" : type }),
  ]);

  const stageCounts = stage === "pending" ? pendingCounts : awaitingCounts;
  const typeFilteredCount =
    type === "all"
      ? stageCounts.total
      : type === "equipment"
        ? stageCounts.equipment
        : stageCounts.consumable;

  const stageTabsWithCounts = STAGE_TABS.map((t) => ({
    ...t,
    count: t.value === "pending" ? pendingCounts.total : awaitingCounts.total,
  }));

  const typeTabsWithCounts = TYPE_TABS.map((t) => ({
    ...t,
    count:
      t.value === "all"
        ? stageCounts.total
        : t.value === "equipment"
          ? stageCounts.equipment
          : stageCounts.consumable,
  }));

  const stageExtraParams = type === "all" ? undefined : { type };
  const typeExtraParams = stage === "pending" ? undefined : { stage };

  const headerOverview =
    stage === "pending"
      ? typeFilteredCount === 0
        ? "QUEUE CLEAR"
        : `${typeFilteredCount} WAITING · OLDEST FIRST`
      : typeFilteredCount === 0
        ? "ALL CLAIMED"
        : `${typeFilteredCount} HOLDING · EXPIRING FIRST`;

  return (
    <div className="mx-auto max-w-3xl px-6 md:px-12 py-12 md:py-16 flex flex-col gap-8">
      <StaffRequestsRealtime />

      <CatalogHeader
        eyebrow="Queue"
        title={stage === "pending" ? "Pending requests" : "Awaiting pickup"}
        overview={headerOverview}
      />

      <div className="flex flex-col gap-3">
        <RequestsTabs
          tabs={stageTabsWithCounts}
          active={stage}
          basePath="/staff/requests"
          defaultTab="pending"
          paramName="stage"
          extraParams={stageExtraParams}
        />
        <RequestsTabs
          tabs={typeTabsWithCounts}
          active={type}
          basePath="/staff/requests"
          defaultTab="all"
          paramName="type"
          extraParams={typeExtraParams}
        />
      </div>

      {rows.length === 0 ? (
        <EmptyState
          title={stage === "pending" ? "Queue clear." : "Nothing awaiting pickup."}
          hint={emptyHint(stage, type)}
        />
      ) : (
        (() => {
          const items: RequestsSearchableItem[] = rows.map((r) => ({
            id: `${r.type}:${r.id}`,
            searchText: buildSearchText(r),
            element:
              stage === "pending" ? (
                <StaffRequestCard {...pendingCardProps(r)} />
              ) : (
                <StaffAwaitingPickupCard request={r} />
              ),
          }));
          const footer =
            stage === "pending"
              ? "Queue updates live as students submit + cancel requests."
              : "Items here are reserved for the student. Scan the QR at the counter to verify the code and release.";
          return <RequestsSearchableList items={items} footer={footer} />;
        })()
      )}
    </div>
  );
}
