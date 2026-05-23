import Link from "next/link";
import type { StudentActiveLoanRow } from "@/lib/supabase/queries/students";
import { ReportsTable, type ColumnDef } from "@/components/reports/ReportsTable";
import { StatusText } from "@/components/ui/StatusText";

function formatDate(iso: string): string {
  return new Date(`${iso}T00:00:00.000Z`).toLocaleDateString("en-US", {
    timeZone: "UTC",
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function daysUntil(iso: string): number {
  const todayMs = Date.now();
  const dueMs = new Date(`${iso}T23:59:59.999+08:00`).getTime();
  return Math.ceil((dueMs - todayMs) / 86_400_000);
}

export function StudentActiveLoans({
  loans,
}: {
  loans: StudentActiveLoanRow[];
}) {
  const columns: ColumnDef<StudentActiveLoanRow>[] = [
    {
      key: "sku",
      header: "Item",
      render: (r) => (
        <Link
          href={`/staff/inventory/equipment/${encodeURIComponent(r.sku.qr_code)}`}
          className="group inline-flex items-baseline gap-2"
        >
          <span className="font-mono uppercase text-caps-md text-navy font-semibold tracking-[0.04em]">
            {r.sku.qr_code}
          </span>
          <span className="text-[14px] text-navy group-hover:text-teal-deep truncate transition-colors">
            {r.sku.name}
          </span>
        </Link>
      ),
    },
    {
      key: "qty",
      header: "Qty",
      width: "60px",
      align: "right",
      render: (r) => (
        <span className="font-display italic font-extrabold text-[18px] text-navy">
          {r.quantity}
        </span>
      ),
    },
    {
      key: "due",
      header: "Due",
      width: "120px",
      render: (r) => (
        <span className="font-mono uppercase text-caps-md text-slate tracking-[0.04em]">
          {formatDate(r.expected_return_date)}
        </span>
      ),
    },
    {
      key: "remaining",
      header: "Days left",
      width: "120px",
      align: "right",
      hideOnMobile: true,
      render: (r) => {
        if (r.status === "OVERDUE") {
          return (
            <span className="font-display italic font-extrabold text-[22px] text-red-deep">
              {Math.abs(daysUntil(r.expected_return_date))}d late
            </span>
          );
        }
        const d = daysUntil(r.expected_return_date);
        return (
          <span
            className={`font-display italic font-extrabold text-[22px] ${
              d <= 1 ? "text-red" : "text-navy"
            }`}
          >
            {d}d
          </span>
        );
      },
    },
    {
      key: "status",
      header: "Status",
      width: "120px",
      render: (r) => <StatusText status={r.status} />,
    },
  ];

  return (
    <ReportsTable
      rows={loans}
      columns={columns}
      rowKey={(r) => r.id}
      emptyTitle="No active loans"
      emptyHint="This student has nothing currently checked out."
    />
  );
}
