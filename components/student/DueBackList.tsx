import Link from "next/link";
import { ArrowRight, Package } from "lucide-react";
import type { ActiveBorrowRow } from "@/lib/supabase/queries/transactions";

function manilaToday(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function ymdToUtc(ymd: string): number {
  const [y, m, d] = ymd.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
}

function daysBetween(fromYmd: string, toYmd: string): number {
  return Math.round(
    (ymdToUtc(toYmd) - ymdToUtc(fromYmd)) / (1000 * 60 * 60 * 24),
  );
}

function formatDate(ymd: string): string {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-US", {
    timeZone: "UTC",
    month: "short",
    day: "numeric",
  });
}

/**
 * Active borrows for the current student, ordered by due date. Overdue and
 * due-today rows surface a red-deep chip; everything else is slate. Rows link
 * out to the originating request page when a `source_request_id` is present
 * (walk-in borrows have none, in which case the row is non-linked).
 */
export function DueBackList({ rows }: { rows: ActiveBorrowRow[] }) {
  if (rows.length === 0) {
    return (
      <div className="border border-dashed border-rule rounded p-8 text-center">
        <Package size={32} strokeWidth={1.5} className="mx-auto text-slate/40" />
        <p className="mt-4 font-display italic font-extrabold text-[18px] text-navy">
          Nothing on loan
        </p>
        <p className="mt-1 text-[14px] text-slate">
          You don&apos;t have any equipment checked out right now.
        </p>
      </div>
    );
  }

  const today = manilaToday();

  return (
    <ol className="border-[1.5px] border-rule rounded bg-paper overflow-hidden">
      {rows.map((row, i) => {
        const diff = daysBetween(today, row.expected_return_date);
        const overdue = diff < 0;
        const dueToday = diff === 0;
        const alert = overdue || dueToday;

        const inner = (
          <div
            className={[
              "flex items-start gap-4 px-4 py-4 md:px-5",
              i === 0 ? "" : "border-t border-rule/60",
              row.source_request_id
                ? "group hover:bg-mist/60 transition-colors"
                : "",
            ].join(" ")}
          >
            <div
              aria-hidden
              className={[
                "shrink-0 mt-0.5 size-9 rounded-fab flex items-center justify-center border-[1.5px]",
                alert
                  ? "border-red-deep/40 bg-red-deep/8 text-red-deep"
                  : "border-rule bg-mist text-teal",
              ].join(" ")}
            >
              <Package size={16} strokeWidth={1.75} />
            </div>

            <div className="flex-1 min-w-0 flex flex-col gap-1">
              <div className="flex items-baseline gap-2.5 flex-wrap">
                <span className="font-mono text-[13px] tracking-[0.04em] text-navy font-semibold">
                  {row.sku.qr_code}
                </span>
                <span className="text-[15px] text-navy truncate font-semibold">
                  {row.sku.name}
                </span>
              </div>
              <p className="font-mono uppercase text-caps-sm text-slate tracking-[0.06em]">
                Qty {row.quantity}
                <span aria-hidden className="mx-2">
                  ·
                </span>
                Due {formatDate(row.expected_return_date)}
              </p>
            </div>

            <div className="shrink-0 flex items-center gap-3">
              <span
                className={[
                  "font-mono uppercase text-caps-sm tracking-[0.08em] font-bold",
                  overdue
                    ? "text-red-deep"
                    : dueToday
                      ? "text-red-deep"
                      : "text-slate",
                ].join(" ")}
              >
                {overdue
                  ? `${Math.abs(diff)}d overdue`
                  : dueToday
                    ? "Due today"
                    : `${diff}d left`}
              </span>
              {row.source_request_id && (
                <ArrowRight
                  size={14}
                  strokeWidth={2}
                  className="text-slate/50 group-hover:text-teal group-hover:translate-x-0.5 transition-transform"
                  aria-hidden
                />
              )}
            </div>
          </div>
        );

        return (
          <li key={row.id}>
            {row.source_request_id ? (
              <Link
                href={`/student/requests/${row.source_request_id}`}
                className="block"
              >
                {inner}
              </Link>
            ) : (
              inner
            )}
          </li>
        );
      })}
    </ol>
  );
}
