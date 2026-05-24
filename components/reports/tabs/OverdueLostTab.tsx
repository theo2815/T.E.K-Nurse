import Link from "next/link";
import {
  getOverdueLostReport,
  getSkuLabelById,
  getStudentLabelById,
  type OverdueRow,
  type OverdueStatus,
  DEFAULT_PAGE_SIZE,
} from "@/lib/supabase/queries/reports";
import { ReportsTable, type ColumnDef } from "../ReportsTable";
import { Paginator } from "../Paginator";
import { SkuFilter } from "../SkuFilter";
import { StudentFilter } from "../StudentFilter";
import { StatusFilter, type StatusOption } from "../StatusFilter";
import { HeroStat } from "../HeroStat";
import { StatusText } from "@/components/ui/StatusText";
import type { ReportSearchParams } from "../report-url";

const STATUS_OPTIONS: StatusOption[] = [
  { value: "OVERDUE", label: "Overdue", tone: "alert" },
  { value: "LOST", label: "Lost", tone: "alert" },
];

const VALID: OverdueStatus[] = ["OVERDUE", "LOST"];

function parseStatuses(raw: string | undefined): OverdueStatus[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter((s): s is OverdueStatus => (VALID as string[]).includes(s));
}

function formatDate(iso: string): string {
  return new Date(`${iso}T00:00:00.000Z`)
    .toLocaleDateString("en-US", {
      timeZone: "UTC",
      year: "numeric",
      month: "short",
      day: "numeric",
    });
}

export async function OverdueLostTab({
  basePath,
  searchParams,
}: {
  basePath: string;
  searchParams: ReportSearchParams;
}) {
  const page = Math.max(1, Number(searchParams.page) || 1);
  const statuses = parseStatuses(searchParams.status);
  const skuId = searchParams.sku;
  const studentId = searchParams.student;

  const [report, skuLabel, studentLabel] = await Promise.all([
    getOverdueLostReport({
      status: statuses.length > 0 ? statuses : undefined,
      skuId,
      studentId,
      page,
    }),
    skuId ? getSkuLabelById({ kind: "equipment", id: skuId }) : Promise.resolve(null),
    studentId ? getStudentLabelById(studentId) : Promise.resolve(null),
  ]);

  const columns: ColumnDef<OverdueRow>[] = [
    {
      key: "days",
      header: "Days late",
      width: "100px",
      align: "right",
      render: (r) => (
        <span
          className={`font-display italic font-extrabold text-[28px] leading-none ${
            r.status === "LOST" ? "text-red-deep" : "text-red"
          }`}
        >
          {r.days_overdue}
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
      width: "60px",
      align: "right",
      hideOnMobile: true,
      render: (r) => (
        <span className="font-display italic font-extrabold text-[18px] text-navy">
          {r.quantity}
        </span>
      ),
    },
    {
      key: "expected",
      header: "Due",
      width: "120px",
      hideOnMobile: true,
      render: (r) => (
        <span className="font-mono uppercase text-caps-md text-slate tracking-[0.04em]">
          {formatDate(r.expected_return_date)}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      width: "100px",
      render: (r) => <StatusText status={r.status} />,
    },
  ];

  const allClear = report.totals.overdue + report.totals.lost === 0;

  return (
    <div className="flex flex-col gap-6">
      <section className="bg-paper border-[1.5px] border-rule rounded p-5 md:p-6 flex flex-wrap items-end gap-8">
        <HeroStat
          label="Overdue"
          value={report.totals.overdue}
          tone={report.totals.overdue > 0 ? "alert" : "default"}
          caption={
            report.totals.overdue === 0 ? "None flagged" : "Past expected return"
          }
        />
        <HeroStat
          label="Lost"
          value={report.totals.lost}
          tone={report.totals.lost > 0 ? "alert" : "default"}
          caption={
            report.totals.lost === 0
              ? "None marked lost"
              : "Auto-flagged at T+7 or by staff"
          }
        />
        <p className="ml-auto font-mono uppercase text-caps-sm text-slate/80 tracking-[0.08em] max-w-sm">
          {allClear
            ? "ALL CLEAR · NO RECOVERY NEEDED"
            : "REMINDERS RUN DAILY · CADENCE T+0 / +1 / +3 / +7"}
        </p>
      </section>

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
        emptyTitle="Nothing overdue or lost."
        emptyHint="All borrows are within their return window."
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
        Point-in-time view · reflects the current status of every borrow_transaction
      </p>
    </div>
  );
}
