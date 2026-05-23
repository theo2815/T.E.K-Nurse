import Link from "next/link";
import { buildReportHref, type ReportSearchParams } from "./report-url";

export type StatusOption = {
  value: string;
  label: string;
  /** Visual tone of the chip when active. */
  tone?: "default" | "alert" | "success";
};

/**
 * Multi-select status chip strip. Clicking a chip toggles it on/off in the
 * URL — `?status=A,B`. "All" clears the param entirely.
 */
export function StatusFilter({
  options,
  selected,
  basePath,
  searchParams,
  label = "Status",
}: {
  options: StatusOption[];
  /** Currently-applied values (from URL parsing). */
  selected: string[];
  basePath: string;
  searchParams: ReportSearchParams;
  label?: string;
}) {
  function hrefForToggle(value: string): string {
    const set = new Set(selected);
    if (set.has(value)) set.delete(value);
    else set.add(value);
    const param = set.size === 0 ? undefined : Array.from(set).join(",");
    return buildReportHref(basePath, searchParams, {
      status: param,
      page: undefined,
    });
  }

  const allHref = buildReportHref(basePath, searchParams, {
    status: undefined,
    page: undefined,
  });

  const allActive = selected.length === 0;

  return (
    <div className="flex flex-col gap-1.5">
      <p className="font-mono uppercase text-caps-sm text-slate font-semibold tracking-[0.1em]">
        {label}
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <Link
          href={allHref}
          scroll={false}
          aria-pressed={allActive}
          className={[
            "px-3 py-1.5 rounded border-[1.5px] font-mono uppercase text-caps-sm tracking-[0.08em] font-semibold transition-colors",
            allActive
              ? "border-teal bg-teal/10 text-teal-deep"
              : "border-rule bg-paper text-slate hover:border-slate/60",
          ].join(" ")}
        >
          All
        </Link>
        {options.map((opt) => {
          const active = selected.includes(opt.value);
          const tone = opt.tone ?? "default";
          const activeClass =
            tone === "alert"
              ? "border-red bg-red/10 text-red-deep"
              : tone === "success"
                ? "border-green bg-green/10 text-green"
                : "border-teal bg-teal/10 text-teal-deep";
          return (
            <Link
              key={opt.value}
              href={hrefForToggle(opt.value)}
              scroll={false}
              aria-pressed={active}
              className={[
                "px-3 py-1.5 rounded border-[1.5px] font-mono uppercase text-caps-sm tracking-[0.08em] font-semibold transition-colors",
                active
                  ? activeClass
                  : "border-rule bg-paper text-slate hover:border-slate/60",
              ].join(" ")}
            >
              {opt.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
