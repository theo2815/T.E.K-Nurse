import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { buildReportHref, type ReportSearchParams } from "./report-url";

export function Paginator({
  page,
  pageSize,
  total,
  basePath,
  searchParams,
}: {
  page: number;
  pageSize: number;
  total: number;
  basePath: string;
  searchParams: ReportSearchParams;
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);
  const hasPrev = page > 1;
  const hasNext = page < totalPages;

  const prevHref = buildReportHref(basePath, searchParams, {
    page: page - 1 === 1 ? undefined : String(page - 1),
  });
  const nextHref = buildReportHref(basePath, searchParams, {
    page: String(page + 1),
  });

  return (
    <div className="flex items-center justify-between gap-4 pt-4 mt-4 border-t border-rule">
      <p className="font-mono uppercase text-caps-sm text-slate tracking-[0.08em]">
        {total === 0
          ? "No matches"
          : `Showing ${from}–${to} of ${total}`}
      </p>
      <div className="flex items-center gap-1.5">
        <PagerLink
          href={prevHref}
          disabled={!hasPrev}
          aria-label="Previous page"
        >
          <ChevronLeft size={16} strokeWidth={2} />
        </PagerLink>
        <span className="font-mono uppercase text-caps-sm text-slate tracking-[0.08em] px-2">
          {page} / {totalPages}
        </span>
        <PagerLink
          href={nextHref}
          disabled={!hasNext}
          aria-label="Next page"
        >
          <ChevronRight size={16} strokeWidth={2} />
        </PagerLink>
      </div>
    </div>
  );
}

function PagerLink({
  href,
  disabled,
  children,
  ...rest
}: {
  href: string;
  disabled?: boolean;
  children: React.ReactNode;
} & React.AriaAttributes) {
  if (disabled) {
    return (
      <span
        {...rest}
        aria-disabled
        className="inline-flex items-center justify-center size-8 rounded border-[1.5px] border-rule text-slate/40 cursor-not-allowed"
      >
        {children}
      </span>
    );
  }
  return (
    <Link
      href={href}
      scroll={false}
      {...rest}
      className="inline-flex items-center justify-center size-8 rounded border-[1.5px] border-rule text-navy hover:border-teal hover:text-teal transition-colors"
    >
      {children}
    </Link>
  );
}
