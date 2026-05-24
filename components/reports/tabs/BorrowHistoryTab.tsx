import Link from "next/link";
import {
  getBorrowHistoryReport,
  getSkuLabelById,
  getStudentLabelById,
  type BorrowHistoryRow,
  type BorrowHistoryStatus,
  DEFAULT_PAGE_SIZE,
} from "@/lib/supabase/queries/reports";
import { ChartFrame } from "../ChartFrame";
import { BorrowTrendChart } from "../BorrowTrendChart";
import { ReportsTable, type ColumnDef } from "../ReportsTable";
import { Paginator } from "../Paginator";
import { SkuFilter } from "../SkuFilter";
import { StudentFilter } from "../StudentFilter";
import { StatusFilter, type StatusOption } from "../StatusFilter";
import { HeroStat } from "../HeroStat";
import type { ReportSearchParams } from "../report-url";
import { StatusText, type Status } from "@/components/ui/StatusText";

const STATUS_TEXT: Record<BorrowHistoryStatus, Status> = {
  BORROWED: "BORROWED",
  RETURNED: "RETURNED",
  RETURNED_LATE: "RETURNED LATE",
  OVERDUE: "OVERDUE",
  LOST: "LOST",
};

const STATUS_OPTIONS: StatusOption[] = [
  { value: "BORROWED", label: "Out" },
  { value: "RETURNED", label: "Returned" },
  { value: "RETURNED_LATE", label: "Returned late" },
  { value: "OVERDUE", label: "Overdue", tone: "alert" },
  { value: "LOST", label: "Lost", tone: "alert" },
];

const VALID_STATUS: BorrowHistoryStatus[] = [
  "BORROWED",
  "RETURNED",
  "RETURNED_LATE",
  "OVERDUE",
  "LOST",
];

function parseStatuses(raw: string | undefined): BorrowHistoryStatus[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter((s): s is BorrowHistoryStatus =>
      (VALID_STATUS as string[]).includes(s),
    );
}

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

export async function BorrowHistoryTab({
  from,
  to,
  basePath,
  searchParams,
}: {
  from: string;
  to: string;
  basePath: string;
  searchParams: ReportSearchParams;
}) {
  const page = Math.max(1, Number(searchParams.page) || 1);
  const statuses = parseStatuses(searchParams.status);
  const skuId = searchParams.sku;
  const studentId = searchParams.student;

  const [report, skuLabel, studentLabel] = await Promise.all([
    getBorrowHistoryReport({
      from,
      to,
      status: statuses.length > 0 ? statuses : undefined,
      skuId,
      studentId,
      page,
    }),
    skuId ? getSkuLabelById({ kind: "equipment", id: skuId }) : Promise.resolve(null),
    studentId ? getStudentLabelById(studentId) : Promise.resolve(null),
  ]);

  const columns: ColumnDef<BorrowHistoryRow>[] = [
    {
      key: "borrowed_at",
      header: "Borrowed",
      width: "160px",
      render: (r) => (
        <span className="font-mono uppercase text-caps-md text-navy tracking-[0.04em]">
          {formatDateTime(r.borrowed_at)}
        </span>
      ),
    },
    {
      key: "student",
      header: "Student",
      render: (r) => (
        <Link
          href={`/staff/students/${r.student.id}`}
          className="group flex flex-col"
        >
          <span className="text-[14px] text-navy font-semibold group-hover:text-teal-deep transition-colors">
            {r.student.full_name}
          </span>
          {r.student.student_id && (
            <span className="font-mono uppercase text-caps-sm text-slate/80 tracking-[0.06em]">
              {r.student.student_id}
            </span>
          )}
        </Link>
      ),
    },
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
      align: "right",
      width: "64px",
      hideOnMobile: true,
      render: (r) => (
        <span className="font-display italic font-extrabold text-[18px] text-navy">
          {r.quantity}
        </span>
      ),
    },
    {
      key: "returned_at",
      header: "Returned",
      width: "160px",
      hideOnMobile: true,
      render: (r) =>
        r.returned_at ? (
          <span className="font-mono uppercase text-caps-md text-slate tracking-[0.04em]">
            {formatDateTime(r.returned_at)}
          </span>
        ) : (
          <span className="font-mono uppercase text-caps-sm text-slate/50 tracking-[0.08em]">
            —
          </span>
        ),
    },
    {
      key: "status",
      header: "Status",
      width: "140px",
      render: (r) => <StatusText status={STATUS_TEXT[r.status]} />,
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <ChartFrame
        eyebrow="Borrows over time"
        caption="Counted by borrow date (Asia/Manila)."
        summary={
          <div className="flex items-end gap-6">
            <HeroStat
              label="Borrows"
              value={report.totals.borrows}
              size="sm"
              align="right"
            />
            {report.totals.returns > 0 && (
              <HeroStat
                label="Returns"
                value={report.totals.returns}
                tone="success"
                size="sm"
                align="right"
              />
            )}
            {(report.totals.overdue > 0 || report.totals.lost > 0) && (
              <HeroStat
                label="Lost / overdue"
                value={report.totals.overdue + report.totals.lost}
                tone="alert"
                size="sm"
                align="right"
              />
            )}
          </div>
        }
      >
        <BorrowTrendChart data={report.series} />
      </ChartFrame>

      <div className="flex flex-col gap-4 md:flex-row md:flex-wrap md:items-end">
        <StatusFilter
          options={STATUS_OPTIONS}
          selected={statuses}
          basePath={basePath}
          searchParams={searchParams}
        />
        <SkuFilter
          kind="equipment"
          value={skuLabel}
          basePath={basePath}
          searchParams={searchParams}
        />
        <StudentFilter
          value={studentLabel}
          basePath={basePath}
          searchParams={searchParams}
        />
      </div>

      <ReportsTable
        rows={report.rows}
        columns={columns}
        rowKey={(r) => r.id}
        emptyTitle="No borrows in this range"
        emptyHint="Adjust the date range or clear filters to see more."
      />

      {report.total > 0 && (
        <Paginator
          page={report.page}
          pageSize={report.pageSize || DEFAULT_PAGE_SIZE}
          total={report.total}
          basePath={basePath}
          searchParams={searchParams}
        />
      )}

      <p className="font-mono uppercase text-caps-sm text-slate/70 tracking-[0.08em] -mt-1">
        Dates are Asia/Manila · borrows show the day they were issued
      </p>
    </div>
  );
}
