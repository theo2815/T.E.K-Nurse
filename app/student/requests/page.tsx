import { redirect } from "next/navigation";
import Link from "next/link";
import { Info } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import {
  listMyRequests,
  requestStatusLabel,
  type MyRequestRow,
} from "@/lib/supabase/queries/requests";
import { listMyActiveBorrows } from "@/lib/supabase/queries/transactions";
import { CatalogHeader } from "@/components/catalog/CatalogHeader";
import { EmptyState } from "@/components/catalog/EmptyState";
import { RequestsTabs, type RequestTab } from "@/components/requests/RequestsTabs";
import { RequestCard } from "@/components/requests/RequestCard";
import { RequestsRealtime } from "@/components/requests/RequestsRealtime";
import type { Status } from "@/components/ui/StatusText";

const TABS: Array<{ value: RequestTab; label: string }> = [
  { value: "pending", label: "Pending" },
  { value: "active", label: "Active" },
  { value: "past", label: "Past" },
];

function parseTab(v: string | undefined): RequestTab {
  if (v === "active" || v === "past") return v;
  return "pending";
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

function formatExpiresAt(iso: string): string {
  const d = new Date(iso);
  const todayMid = new Date();
  todayMid.setHours(0, 0, 0, 0);
  const dayDiff = Math.floor(
    (d.getTime() - todayMid.getTime()) / 86_400_000,
  );
  const time = d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
  if (dayDiff < 0) return `Expired ${Math.abs(dayDiff)}d ago`;
  if (dayDiff === 0) return `Expires today ${time}`;
  if (dayDiff === 1) return `Expires tomorrow ${time}`;
  return `Expires ${d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  })} ${time}`;
}

function pendingRowProps(r: MyRequestRow) {
  return {
    href: `/student/requests/${r.id}?type=${r.type}`,
    type: r.type,
    qr: r.sku.qr_code,
    status: "PENDING PICKUP" as Status,
    name: r.sku.name,
    primaryMeta: `${formatPickup(r.borrow_date)}  ·  Qty ${r.quantity}${
      r.sku.unit ? ` ${r.sku.unit}` : ""
    }`,
    secondaryMeta: formatExpiresAt(r.expires_at),
    secondaryAlert: new Date(r.expires_at).getTime() <= Date.now(),
  };
}

function pastRowProps(r: MyRequestRow) {
  const label = requestStatusLabel(r.status);
  return {
    href: `/student/requests/${r.id}?type=${r.type}`,
    type: r.type,
    qr: r.sku.qr_code,
    status: label as Status,
    name: r.sku.name,
    primaryMeta: `${formatPickup(r.borrow_date)}  ·  Qty ${r.quantity}${
      r.sku.unit ? ` ${r.sku.unit}` : ""
    }`,
    secondaryMeta: `Submitted ${new Date(r.created_at).toLocaleDateString(
      "en-US",
      { month: "short", day: "numeric", year: "numeric" },
    )}`,
  };
}

export default async function StudentRequestsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const sp = await searchParams;
  const tab = parseTab(sp.tab);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Counts for all three tabs — lightweight head queries.
  const [pendingEqCount, pendingCnCount, activeCount] = await Promise.all([
    supabase
      .from("borrow_request")
      .select("id", { count: "exact", head: true })
      .eq("student_id", user.id)
      .eq("status", "PENDING_PICKUP"),
    supabase
      .from("consumable_request")
      .select("id", { count: "exact", head: true })
      .eq("student_id", user.id)
      .eq("status", "PENDING_PICKUP"),
    supabase
      .from("borrow_transaction")
      .select("id", { count: "exact", head: true })
      .eq("student_id", user.id)
      .in("status", ["BORROWED", "OVERDUE"]),
  ]);

  const tabsWithCounts = TABS.map((t) => ({
    ...t,
    count:
      t.value === "pending"
        ? (pendingEqCount.count ?? 0) + (pendingCnCount.count ?? 0)
        : t.value === "active"
        ? (activeCount.count ?? 0)
        : undefined,
  }));

  return (
    <div className="mx-auto max-w-3xl px-6 md:px-12 py-12 md:py-16 flex flex-col gap-8">
      <RequestsRealtime studentId={user.id} />

      <CatalogHeader eyebrow="Student" title="My Requests" />

      <RequestsTabs
        tabs={tabsWithCounts}
        active={tab}
        basePath="/student/requests"
        defaultTab="pending"
      />

      {tab === "pending" && <PendingTab />}
      {tab === "active" && <ActiveTab />}
      {tab === "past" && <PastTab />}
    </div>
  );
}

async function PendingTab() {
  const rows = await listMyRequests({ scope: "pending" });
  if (rows.length === 0) {
    return (
      <EmptyState
        title="No pending requests"
        hint="Submit a request from the Equipment or Consumables catalog."
      />
    );
  }
  return (
    <div className="flex flex-col gap-4">
      {rows.map((r) => (
        <RequestCard key={`${r.type}:${r.id}`} {...pendingRowProps(r)} />
      ))}
      <p className="mt-2 inline-flex items-center gap-2 text-[13px] text-slate italic">
        <Info size={14} strokeWidth={1.75} />
        Updates live as staff approves at the counter.
      </p>
    </div>
  );
}

async function ActiveTab() {
  const rows = await listMyActiveBorrows();
  if (rows.length === 0) {
    return (
      <EmptyState
        title="Nothing borrowed"
        hint="When staff approves a borrow, it appears here with its due date."
      />
    );
  }
  const todayMid = new Date();
  todayMid.setHours(0, 0, 0, 0);

  return (
    <div className="flex flex-col gap-4">
      {rows.map((r) => {
        const due = new Date(`${r.expected_return_date}T00:00:00`);
        const diffDays = Math.round(
          (due.getTime() - todayMid.getTime()) / 86_400_000,
        );
        const overdue = r.status === "OVERDUE" || diffDays < 0;
        const secondary = overdue
          ? `OVERDUE · ${Math.abs(diffDays)}d past due`
          : diffDays === 0
          ? "Due today"
          : diffDays === 1
          ? "Due tomorrow"
          : `Due ${due.toLocaleDateString("en-US", {
              weekday: "short",
              month: "short",
              day: "numeric",
            })} · ${diffDays} days left`;

        return (
          <RequestCard
            key={r.id}
            href={`/student/requests/${r.id}?type=transaction`}
            type="equipment"
            qr={r.sku.qr_code}
            status={overdue ? ("OVERDUE" as Status) : ("BORROWED" as Status)}
            name={r.sku.name}
            primaryMeta={`Borrowed ${new Date(
              r.borrowed_at,
            ).toLocaleDateString("en-US", {
              weekday: "short",
              month: "short",
              day: "numeric",
            })}  ·  Qty ${r.quantity}`}
            secondaryMeta={secondary}
            secondaryAlert={overdue || diffDays <= 1}
          />
        );
      })}
      <p className="mt-2 inline-flex items-center gap-2 text-[13px] text-slate italic">
        <Info size={14} strokeWidth={1.75} />
        Consumables don&apos;t appear here — see History.
      </p>
    </div>
  );
}

async function PastTab() {
  const rows = await listMyRequests({ scope: "past" });
  if (rows.length === 0) {
    return (
      <EmptyState
        title="No past requests"
        hint="Terminal requests (approved, expired, cancelled) will land here."
      />
    );
  }
  return (
    <div className="flex flex-col gap-4">
      {rows.map((r) => (
        <RequestCard key={`${r.type}:${r.id}`} {...pastRowProps(r)} />
      ))}
      <p className="mt-2 text-[13px] text-slate italic">
        Looking for returned items?{" "}
        <Link
          href="/student/history"
          className="underline underline-offset-4 decoration-teal decoration-2 hover:text-navy"
        >
          See History
        </Link>
        .
      </p>
    </div>
  );
}
