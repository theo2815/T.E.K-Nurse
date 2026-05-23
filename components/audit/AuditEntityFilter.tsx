import Link from "next/link";
import {
  AUDIT_ENTITY_TYPES,
  type AuditEntityType,
} from "@/lib/audit/constants";
import {
  buildReportHref,
  type ReportSearchParams,
} from "@/components/reports/report-url";

const ENTITY_LABELS: Record<AuditEntityType, string> = {
  users: "Users",
  equipment_sku: "Equipment",
  consumable_sku: "Consumables",
  consumable_lot: "Lots",
  borrow_request: "Borrow requests",
  consumable_request: "Consumable requests",
  borrow_transaction: "Borrows",
  consumable_usage: "Usage",
};

/**
 * Single-select entity_type chip strip. Matches the StatusFilter shape.
 * "All" clears the URL param.
 */
export function AuditEntityFilter({
  selected,
  basePath,
  searchParams,
}: {
  selected: AuditEntityType | null;
  basePath: string;
  searchParams: ReportSearchParams;
}) {
  const allHref = buildReportHref(basePath, searchParams, {
    entity: undefined,
    page: undefined,
  });

  return (
    <div className="flex flex-col gap-1.5">
      <p className="font-mono uppercase text-caps-sm text-slate font-semibold tracking-[0.1em]">
        Entity
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <Link
          href={allHref}
          scroll={false}
          aria-pressed={selected === null}
          className={chipClass(selected === null)}
        >
          All
        </Link>
        {AUDIT_ENTITY_TYPES.map((value) => {
          const active = selected === value;
          const href = buildReportHref(basePath, searchParams, {
            entity: active ? undefined : value,
            page: undefined,
          });
          return (
            <Link
              key={value}
              href={href}
              scroll={false}
              aria-pressed={active}
              className={chipClass(active)}
            >
              {ENTITY_LABELS[value]}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function chipClass(active: boolean): string {
  return [
    "px-3 py-1.5 rounded border-[1.5px] font-mono uppercase text-caps-sm tracking-[0.08em] font-semibold transition-colors",
    active
      ? "border-teal bg-teal/10 text-teal-deep"
      : "border-rule bg-paper text-slate hover:border-slate/60",
  ].join(" ");
}
