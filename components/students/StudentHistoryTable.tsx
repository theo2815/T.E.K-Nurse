import type { ReactNode } from "react";
import Link from "next/link";
import { Package, Beaker } from "lucide-react";
import type { StudentHistoryItem } from "@/lib/supabase/queries/students";
import { ReportsTable, type ColumnDef } from "@/components/reports/ReportsTable";
import { StatusText, type Status } from "@/components/ui/StatusText";

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

const STATUS_LABEL: Record<
  "BORROWED" | "RETURNED" | "RETURNED_LATE" | "OVERDUE" | "LOST",
  Status
> = {
  BORROWED: "BORROWED",
  RETURNED: "RETURNED",
  RETURNED_LATE: "RETURNED LATE",
  OVERDUE: "OVERDUE",
  LOST: "LOST",
};

export function StudentHistoryTable({
  items,
  /** Whose inventory pages to link out to. Staff sees the staff inventory
   *  routes; students see their own browse routes. Defaults to staff. */
  role = "staff",
  emptyTitle,
  emptyHint,
  emptyCta,
}: {
  items: StudentHistoryItem[];
  role?: "staff" | "student";
  emptyTitle?: string;
  emptyHint?: string;
  emptyCta?: ReactNode;
}) {
  const eqBase =
    role === "student" ? "/student/equipment" : "/staff/inventory/equipment";
  const cnBase =
    role === "student" ? "/student/consumables" : "/staff/inventory/consumables";

  const columns: ColumnDef<StudentHistoryItem>[] = [
    {
      key: "when",
      header: "When",
      width: "180px",
      render: (r) => (
        <span className="font-mono uppercase text-caps-md text-navy tracking-[0.04em]">
          {formatDateTime(r.when)}
        </span>
      ),
    },
    {
      key: "kind",
      header: "Kind",
      width: "120px",
      render: (r) => {
        const Icon = r.kind === "borrow" ? Package : Beaker;
        return (
          <span className="font-mono uppercase text-caps-sm font-semibold tracking-[0.1em] inline-flex items-center gap-1.5 text-slate">
            <Icon size={12} strokeWidth={2} className="text-teal" />
            {r.kind === "borrow" ? "Borrow" : "Usage"}
          </span>
        );
      },
    },
    {
      key: "sku",
      header: "Item",
      render: (r) => {
        const href =
          r.kind === "borrow"
            ? `${eqBase}/${encodeURIComponent(r.sku.qr_code)}`
            : `${cnBase}/${encodeURIComponent(r.sku.qr_code)}`;
        return (
          <Link href={href} className="group inline-flex items-baseline gap-2">
            <span className="font-mono uppercase text-caps-md text-navy font-semibold tracking-[0.04em]">
              {r.sku.qr_code}
            </span>
            <span className="text-[14px] text-navy group-hover:text-teal-deep truncate transition-colors">
              {r.sku.name}
            </span>
          </Link>
        );
      },
    },
    {
      key: "qty",
      header: "Qty",
      align: "right",
      width: "120px",
      render: (r) => (
        <span className="inline-flex items-baseline gap-1.5 justify-end">
          <span className="font-display italic font-extrabold text-[18px] text-navy">
            {r.quantity}
          </span>
          {r.kind === "usage" && (
            <span className="font-mono uppercase text-caps-sm text-slate tracking-[0.08em]">
              {r.sku.unit}
            </span>
          )}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      width: "140px",
      hideOnMobile: true,
      render: (r) =>
        r.kind === "borrow" ? (
          <StatusText status={STATUS_LABEL[r.status]} />
        ) : (
          <span className="font-mono uppercase text-caps-sm text-slate/70 tracking-[0.08em]">
            —
          </span>
        ),
    },
  ];

  return (
    <ReportsTable
      rows={items}
      columns={columns}
      rowKey={(r) => `${r.kind}:${r.id}`}
      emptyTitle={emptyTitle ?? "No activity yet."}
      emptyHint={
        emptyHint ?? "This student hasn't borrowed equipment or used consumables."
      }
      emptyCta={emptyCta}
    />
  );
}
