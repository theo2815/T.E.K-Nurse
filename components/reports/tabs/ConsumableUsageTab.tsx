import Link from "next/link";
import {
  getConsumableUsageReport,
  getSkuLabelById,
  getStudentLabelById,
  type ConsumableUsageRow,
  DEFAULT_PAGE_SIZE,
} from "@/lib/supabase/queries/reports";
import { ChartFrame } from "../ChartFrame";
import { UsageTrendChart } from "../UsageTrendChart";
import { ReportsTable, type ColumnDef } from "../ReportsTable";
import { Paginator } from "../Paginator";
import { SkuFilter } from "../SkuFilter";
import { StudentFilter } from "../StudentFilter";
import { HeroStat } from "../HeroStat";
import type { ReportSearchParams } from "../report-url";

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

export async function ConsumableUsageTab({
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
  const skuId = searchParams.sku;
  const studentId = searchParams.student;

  const [report, skuLabel, studentLabel] = await Promise.all([
    getConsumableUsageReport({ from, to, skuId, studentId, page }),
    skuId ? getSkuLabelById({ kind: "consumable", id: skuId }) : Promise.resolve(null),
    studentId ? getStudentLabelById(studentId) : Promise.resolve(null),
  ]);

  const columns: ColumnDef<ConsumableUsageRow>[] = [
    {
      key: "used_at",
      header: "Used",
      width: "180px",
      render: (r) => (
        <span className="font-mono uppercase text-caps-md text-navy tracking-[0.04em]">
          {formatDateTime(r.used_at)}
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
          {r.student.year_section && (
            <span className="font-mono uppercase text-caps-sm text-slate/80 tracking-[0.06em]">
              {r.student.year_section}
            </span>
          )}
        </Link>
      ),
    },
    {
      key: "sku",
      header: "Supply",
      render: (r) => (
        <Link
          href={`/staff/inventory/consumables/${encodeURIComponent(r.sku.qr_code)}`}
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
      width: "120px",
      render: (r) => (
        <span className="inline-flex items-baseline gap-1.5">
          <span className="font-display italic font-extrabold text-[20px] text-navy">
            {r.quantity_used}
          </span>
          <span className="font-mono uppercase text-caps-sm text-slate tracking-[0.08em]">
            {r.sku.unit}
          </span>
        </span>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <ChartFrame
        eyebrow="Usage over time"
        caption="Total units issued per day. Walk-in + approved both count."
        summary={
          <div className="flex items-end gap-6">
            <HeroStat
              label="Events"
              value={report.totals.events}
              size="sm"
              align="right"
            />
            <HeroStat
              label="Units"
              value={report.totals.units}
              tone="active"
              size="sm"
              align="right"
            />
          </div>
        }
      >
        <UsageTrendChart data={report.series} unitLabel={skuLabel?.qr_code} />
      </ChartFrame>

      <div className="flex flex-col gap-4 md:flex-row md:flex-wrap md:items-end">
        <SkuFilter
          kind="consumable"
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
        emptyTitle="No usage in this range"
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
        FIFO lot drilldown lives on the SKU detail page · click a SKU code to open it
      </p>
    </div>
  );
}
