import Link from "next/link";
import { ArrowRight, Package, Beaker, Inbox } from "lucide-react";
import type { MyRequestRow } from "@/lib/supabase/queries/requests";
import { timeAgo } from "@/lib/time-ago";

/**
 * Requests the student has submitted that staff hasn't yet acted on. Low
 * visual weight — these are passive waits, not actionable. Empty state is
 * omitted on the home page (the section header itself is hidden when there
 * are no pending rows).
 */
export function PendingApprovalList({ rows }: { rows: MyRequestRow[] }) {
  if (rows.length === 0) {
    return (
      <div className="border border-dashed border-rule rounded p-6 text-center">
        <Inbox size={28} strokeWidth={1.5} className="mx-auto text-slate/40" />
        <p className="mt-3 text-[14px] text-slate">
          No requests waiting on staff right now.
        </p>
      </div>
    );
  }

  return (
    <ol className="flex flex-col gap-2">
      {rows.map((row) => {
        const TypeIcon = row.type === "equipment" ? Package : Beaker;
        return (
          <li key={`${row.type}:${row.id}`}>
            <Link
              href={`/student/requests/${row.id}`}
              className="group flex items-center gap-3 px-4 py-3 rounded border-[1.5px] border-rule bg-paper hover:border-teal transition-colors"
            >
              <TypeIcon
                size={14}
                strokeWidth={1.75}
                className="text-teal shrink-0"
                aria-hidden
              />
              <div className="flex-1 min-w-0 flex items-baseline gap-2.5 flex-wrap">
                <span className="font-mono text-[13px] tracking-[0.04em] text-navy font-semibold">
                  {row.sku.qr_code}
                </span>
                <span className="text-[14px] text-navy truncate">
                  {row.sku.name}
                </span>
                <span className="font-mono uppercase text-caps-sm text-slate/70 tracking-[0.06em]">
                  Qty {row.quantity}
                  {row.sku.unit ? ` ${row.sku.unit}` : ""}
                </span>
              </div>
              <span className="shrink-0 font-mono uppercase text-caps-sm text-slate tracking-[0.08em]">
                {timeAgo(row.created_at)}
              </span>
              <ArrowRight
                size={14}
                strokeWidth={2}
                className="text-slate/40 group-hover:text-teal group-hover:translate-x-0.5 transition-transform shrink-0"
                aria-hidden
              />
            </Link>
          </li>
        );
      })}
    </ol>
  );
}
