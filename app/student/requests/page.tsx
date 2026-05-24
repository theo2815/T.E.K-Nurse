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
  { value: "approved", label: "Approved" },
  { value: "active", label: "Active" },
  { value: "past", label: "Past" },
];

function parseTab(v: string | undefined): RequestTab {
  if (v === "approved" || v === "active" || v === "past") return v;
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
    photoUrl: r.sku.photo_url,
    primaryMeta: `${formatPickup(r.borrow_date)}  ·  Qty ${r.quantity}${
      r.sku.unit ? ` ${r.sku.unit}` : ""
    }`,
    secondaryMeta: formatExpiresAt(r.expires_at),
    secondaryAlert: new Date(r.expires_at).getTime() <= Date.now(),
  };
}

function approvedRowProps(r: MyRequestRow) {
  // For APPROVED rows, the relevant deadline is the 24h pickup window
  // (pickup_expires_at), not the original approve-by deadline (expires_at).
  // Fall back to expires_at defensively if pickup_expires_at is missing.
  const deadline = r.pickup_expires_at ?? r.expires_at;
  return {
    href: `/student/requests/${r.id}?type=${r.type}`,
    type: r.type,
    qr: r.sku.qr_code,
    status: "APPROVED" as Status,
    name: r.sku.name,
    photoUrl: r.sku.photo_url,
    primaryMeta: `${formatPickup(r.borrow_date)}  ·  Qty ${r.quantity}${
      r.sku.unit ? ` ${r.sku.unit}` : ""
    }`,
    secondaryMeta: formatExpiresAt(deadline).replace(/^Expir/, "Pickup expir"),
    secondaryAlert: new Date(deadline).getTime() <= Date.now(),
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
    photoUrl: r.sku.photo_url,
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

  // Counts for the pending / approved / active tabs — lightweight head queries.
  const [
    pendingEqCount,
    pendingCnCount,
    approvedEqCount,
    approvedCnCount,
    activeCount,
  ] = await Promise.all([
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
      .from("borrow_request")
      .select("id", { count: "exact", head: true })
      .eq("student_id", user.id)
      .eq("status", "APPROVED"),
    supabase
      .from("consumable_request")
      .select("id", { count: "exact", head: true })
      .eq("student_id", user.id)
      .eq("status", "APPROVED"),
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
        : t.value === "approved"
        ? (approvedEqCount.count ?? 0) + (approvedCnCount.count ?? 0)
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
      {tab === "approved" && <ApprovedTab />}
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
        title="No pending requests."
        hint="Submit one from the equipment or consumables catalog."
        cta={
          <Link
            href="/student/equipment"
            className="font-mono uppercase text-caps-sm tracking-[0.1em] text-teal-deep underline underline-offset-4 decoration-teal decoration-2 hover:text-navy transition-colors"
          >
            Browse equipment →
          </Link>
        }
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

async function ApprovedTab() {
  const rows = await listMyRequests({ scope: "approved" });
  if (rows.length === 0) {
    return (
      <EmptyState
        title="Nothing approved yet."
        hint="Approved requests appear here with their pickup window."
      />
    );
  }
  return (
    <div className="flex flex-col gap-4">
      {rows.map((r) => (
        <RequestCard key={`${r.type}:${r.id}`} {...approvedRowProps(r)} />
      ))}
      <p className="mt-2 inline-flex items-center gap-2 text-[13px] text-slate italic">
        <Info size={14} strokeWidth={1.75} />
        Tap a card to see its pickup code. Codes expire 24h after approval.
      </p>
    </div>
  );
}

async function ActiveTab() {
  const rows = await listMyActiveBorrows();
  if (rows.length === 0) {
    return (
      <EmptyState
        title="Nothing borrowed."
        hint="Active borrows appear here with their due date."
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
            photoUrl={r.sku.photo_url}
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
        title="No past requests."
        hint="Closed requests (approved, expired, cancelled) land here."
        cta={
          <Link
            href="/student/history"
            className="font-mono uppercase text-caps-sm tracking-[0.1em] text-teal-deep underline underline-offset-4 decoration-teal decoration-2 hover:text-navy transition-colors"
          >
            Full history →
          </Link>
        }
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
