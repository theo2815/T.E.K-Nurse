import { Info } from "lucide-react";
import {
  listPendingRequests,
  getPendingRequestCounts,
  type StaffPendingRequestRow,
} from "@/lib/supabase/queries/staff-requests";
import { CatalogHeader } from "@/components/catalog/CatalogHeader";
import { EmptyState } from "@/components/catalog/EmptyState";
import { RequestsTabs } from "@/components/requests/RequestsTabs";
import { StaffRequestCard } from "@/components/requests/StaffRequestCard";
import { StaffRequestsRealtime } from "@/components/requests/StaffRequestsRealtime";

type QueueTab = "all" | "equipment" | "consumable";

function parseTab(v: string | undefined): QueueTab {
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

function cardProps(r: StaffPendingRequestRow) {
  const qtyUnit = r.sku.unit ? ` ${r.sku.unit}` : r.quantity === 1 ? " unit" : " units";
  return {
    href: `/staff/requests/${r.id}?type=${r.type}`,
    type: r.type,
    qr: r.sku.qr_code,
    studentName: r.student.full_name,
    studentDetail: r.student.year_section ?? r.student.email,
    itemName: r.sku.name,
    itemMeta: `${formatPickup(r.borrow_date)}  ·  Qty ${r.quantity}${qtyUnit}`,
    createdAt: r.created_at,
    expiresAt: r.expires_at,
  } as const;
}

const TABS: Array<{ value: QueueTab; label: string }> = [
  { value: "all", label: "All" },
  { value: "equipment", label: "Equipment" },
  { value: "consumable", label: "Consumables" },
];

export default async function StaffRequestsPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>;
}) {
  const sp = await searchParams;
  const tab = parseTab(sp.type);

  const [counts, rows] = await Promise.all([
    getPendingRequestCounts(),
    listPendingRequests({ type: tab === "all" ? "all" : tab }),
  ]);

  const tabsWithCounts = TABS.map((t) => ({
    ...t,
    count:
      t.value === "all"
        ? counts.total
        : t.value === "equipment"
        ? counts.equipment
        : counts.consumable,
  }));

  return (
    <div className="mx-auto max-w-3xl px-6 md:px-12 py-12 md:py-16 flex flex-col gap-8">
      <StaffRequestsRealtime />

      <CatalogHeader
        eyebrow="Queue"
        title="Pending requests"
        overview={
          counts.total === 0
            ? "QUEUE CLEAR"
            : `${counts.total} WAITING · OLDEST FIRST`
        }
      />

      <RequestsTabs
        tabs={tabsWithCounts}
        active={tab}
        basePath="/staff/requests"
        defaultTab="all"
        paramName="type"
      />

      {rows.length === 0 ? (
        <EmptyState
          title="Queue clear"
          hint={
            tab === "all"
              ? "No students are waiting. Walk-ins start from Inventory or the Scan FAB."
              : tab === "equipment"
              ? "No equipment pre-requests waiting."
              : "No consumable pre-requests waiting."
          }
        />
      ) : (
        <div className="flex flex-col gap-4">
          {rows.map((r) => (
            <StaffRequestCard key={`${r.type}:${r.id}`} {...cardProps(r)} />
          ))}
          <p className="mt-2 inline-flex items-center gap-2 text-[13px] text-slate italic">
            <Info size={14} strokeWidth={1.75} />
            Queue updates live as students submit + cancel requests.
          </p>
        </div>
      )}
    </div>
  );
}
