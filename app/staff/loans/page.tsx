import { Info } from "lucide-react";
import {
  listActiveLoans,
  getActiveLoanCounts,
} from "@/lib/supabase/queries/loans";
import { CatalogHeader } from "@/components/catalog/CatalogHeader";
import { EmptyState } from "@/components/catalog/EmptyState";
import { RequestsTabs } from "@/components/requests/RequestsTabs";
import { StaffLoanCard } from "@/components/loans/StaffLoanCard";
import { StaffLoansRealtime } from "@/components/loans/StaffLoansRealtime";

type LoanStage = "active" | "overdue";

function parseStage(v: string | undefined): LoanStage {
  return v === "overdue" ? "overdue" : "active";
}

const STAGE_TABS: Array<{ value: LoanStage; label: string }> = [
  { value: "active", label: "Active" },
  { value: "overdue", label: "Overdue" },
];

export default async function StaffLoansPage({
  searchParams,
}: {
  searchParams: Promise<{ stage?: string }>;
}) {
  const sp = await searchParams;
  const stage = parseStage(sp.stage);

  const [counts, rows] = await Promise.all([
    getActiveLoanCounts(),
    listActiveLoans({ stage }),
  ]);

  const stageTabsWithCounts = STAGE_TABS.map((t) => ({
    ...t,
    count: t.value === "active" ? counts.active : counts.overdue,
  }));

  const visibleCount =
    stage === "active" ? counts.active : counts.overdue;

  const headerOverview =
    stage === "active"
      ? visibleCount === 0
        ? "ALL IN"
        : `${visibleCount} OUT · DUE-SOONEST FIRST`
      : visibleCount === 0
        ? "NONE OVERDUE"
        : `${visibleCount} OVERDUE · LONGEST FIRST`;

  const headerTitle = stage === "active" ? "Items out" : "Overdue";

  return (
    <div className="mx-auto max-w-3xl px-6 md:px-12 py-12 md:py-16 flex flex-col gap-8">
      <StaffLoansRealtime />

      <CatalogHeader
        eyebrow="Loans"
        title={headerTitle}
        overview={headerOverview}
      />

      <div className="flex flex-col gap-3">
        <RequestsTabs
          tabs={stageTabsWithCounts}
          active={stage}
          basePath="/staff/loans"
          defaultTab="active"
          paramName="stage"
        />
      </div>

      {rows.length === 0 ? (
        <EmptyState
          title={stage === "active" ? "All items in" : "Nothing overdue"}
          hint={
            stage === "active"
              ? "No equipment is currently checked out."
              : "All active loans are within their return window."
          }
        />
      ) : (
        <div className="flex flex-col gap-4">
          {rows.map((r) => (
            <StaffLoanCard key={r.id} loan={r} />
          ))}
          <p className="mt-2 inline-flex items-center gap-2 text-[13px] text-slate italic">
            <Info size={14} strokeWidth={1.75} />
            Loans update live as items are released and returned.
          </p>
        </div>
      )}
    </div>
  );
}
