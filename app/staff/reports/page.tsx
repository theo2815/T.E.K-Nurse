import { CatalogHeader } from "@/components/catalog/CatalogHeader";
import { ReportsTabs, type ReportTab } from "@/components/reports/ReportsTabs";
import { DateRangePicker } from "@/components/reports/DateRangePicker";
import { BorrowHistoryTab } from "@/components/reports/tabs/BorrowHistoryTab";
import { ConsumableUsageTab } from "@/components/reports/tabs/ConsumableUsageTab";
import { OverdueLostTab } from "@/components/reports/tabs/OverdueLostTab";
import { LowStockTab } from "@/components/reports/tabs/LowStockTab";
import { resolveRange } from "@/lib/reports/date-range";
import type { ReportSearchParams } from "@/components/reports/report-url";

const BASE = "/staff/reports";
const VALID_TABS: ReportTab[] = ["borrow", "consumable", "overdue", "low-stock"];

function parseTab(v: string | undefined): ReportTab {
  return (VALID_TABS as string[]).includes(v ?? "")
    ? (v as ReportTab)
    : "borrow";
}

export default async function StaffReportsPage({
  searchParams,
}: {
  searchParams: Promise<{
    tab?: string;
    from?: string;
    to?: string;
    preset?: string;
    sku?: string;
    student?: string;
    status?: string;
    page?: string;
  }>;
}) {
  const sp = await searchParams;
  const tab = parseTab(sp.tab);

  // Normalize for the URL helpers — `undefined` means "not set in the URL".
  const params: ReportSearchParams = {
    tab: tab === "borrow" ? undefined : tab,
    from: sp.from,
    to: sp.to,
    preset: sp.preset,
    sku: sp.sku,
    student: sp.student,
    status: sp.status,
    page: sp.page,
  };

  const range = resolveRange({
    preset: sp.preset,
    from: sp.from,
    to: sp.to,
  });

  const usesRange = tab === "borrow" || tab === "consumable";

  return (
    <div className="mx-auto max-w-6xl px-6 md:px-12 py-12 md:py-16 flex flex-col gap-8">
      <CatalogHeader
        eyebrow="Reports"
        title="Reports"
        overview={
          tab === "borrow"
            ? "BORROW HISTORY · TREND + LEDGER"
            : tab === "consumable"
              ? "CONSUMABLE USAGE · DAILY + LEDGER"
              : tab === "overdue"
                ? "OVERDUE + LOST · CURRENT STATE"
                : "LOW STOCK + EXPIRING · CURRENT STATE"
        }
      />

      <ReportsTabs active={tab} basePath={BASE} searchParams={params} />

      {usesRange && (
        <DateRangePicker
          basePath={BASE}
          searchParams={params}
          from={range.from}
          to={range.to}
          preset={range.preset}
        />
      )}

      {tab === "borrow" && (
        <BorrowHistoryTab
          from={range.from}
          to={range.to}
          basePath={BASE}
          searchParams={params}
        />
      )}
      {tab === "consumable" && (
        <ConsumableUsageTab
          from={range.from}
          to={range.to}
          basePath={BASE}
          searchParams={params}
        />
      )}
      {tab === "overdue" && (
        <OverdueLostTab basePath={BASE} searchParams={params} />
      )}
      {tab === "low-stock" && <LowStockTab />}
    </div>
  );
}
