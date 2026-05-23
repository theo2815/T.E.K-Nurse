import Link from "next/link";
import { buildReportHref, type ReportSearchParams } from "./report-url";

export type ReportTab =
  | "borrow"
  | "consumable"
  | "overdue"
  | "low-stock";

const TABS: Array<{ value: ReportTab; label: string }> = [
  { value: "borrow", label: "Borrow history" },
  { value: "consumable", label: "Consumable usage" },
  { value: "overdue", label: "Overdue + lost" },
  { value: "low-stock", label: "Low stock + expiring" },
];

export function ReportsTabs({
  active,
  basePath,
  searchParams,
}: {
  active: ReportTab;
  basePath: string;
  searchParams: ReportSearchParams;
}) {
  return (
    <div
      role="tablist"
      className="flex gap-6 md:gap-8 border-b border-rule overflow-x-auto md:overflow-x-visible"
    >
      {TABS.map((t) => {
        const isActive = t.value === active;
        // Switching tabs clears filters that don't apply to the new tab.
        // Keep `from`/`to`/`preset` since they shape the date range across
        // borrow + consumable. Drop sku/student/status/page; the new tab can
        // re-add them as the user filters.
        const href = buildReportHref(basePath, {}, {
          tab: t.value === "borrow" ? undefined : t.value,
          from: searchParams.from,
          to: searchParams.to,
          preset: searchParams.preset,
        });
        return (
          <Link
            key={t.value}
            href={href}
            scroll={false}
            role="tab"
            aria-selected={isActive}
            className={`relative py-3 whitespace-nowrap font-mono uppercase text-caps-md font-semibold tracking-[0.06em] transition-colors ${
              isActive ? "text-navy" : "text-slate/70 hover:text-slate"
            }`}
          >
            {t.label}
            {isActive && (
              <span
                aria-hidden
                className="absolute left-0 right-0 -bottom-[1px] h-[2px] bg-teal"
              />
            )}
          </Link>
        );
      })}
    </div>
  );
}
