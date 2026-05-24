import Link from "next/link";
import { ChevronDown, ChevronRight, Inbox } from "lucide-react";
import type { AuditRow } from "@/lib/supabase/queries/audit";
import { timeAgo } from "@/lib/time-ago";
import {
  buildReportHref,
  type ReportSearchParams,
} from "@/components/reports/report-url";
import { actionLabel, actionTone } from "./action-labels";
import { AuditActorChip } from "./AuditActorChip";
import { AuditDiffPanel } from "./AuditDiffPanel";

/**
 * Renders the audit log as a stack of rows with inline expand. Phase-10's
 * ReportsTable shape doesn't accommodate "row + inline detail beneath",
 * so this is a bespoke list layout that still echoes the Catalog visual
 * language (paper-card shell + dashed empty + mono caps + italic numerals
 * for chips).
 */
export function AuditLogTable({
  rows,
  openId,
  basePath,
  searchParams,
}: {
  rows: AuditRow[];
  openId: string | null;
  basePath: string;
  searchParams: ReportSearchParams;
}) {
  if (rows.length === 0) {
    return (
      <div className="border border-dashed border-rule rounded p-10 text-center bg-paper">
        <Inbox
          size={36}
          strokeWidth={1.5}
          aria-hidden
          className="mx-auto text-slate/40"
        />
        <p className="mt-4 font-display italic font-extrabold text-[18px] text-navy">
          No events in range.
        </p>
        <p className="mt-1 text-[14px] text-slate">
          Widen the date range, or clear filters.
        </p>
      </div>
    );
  }

  return (
    <ul className="bg-paper border-[1.5px] border-rule rounded overflow-hidden">
      {rows.map((r, i) => {
        const isOpen = openId === r.id;
        const toggleHref = buildReportHref(basePath, searchParams, {
          open: isOpen ? undefined : r.id,
        });
        return (
          <li
            key={r.id}
            className={i === 0 ? "" : "border-t border-rule/60"}
          >
            <Link
              href={toggleHref}
              scroll={false}
              aria-expanded={isOpen}
              className={[
                "block px-4 md:px-5 py-3 md:py-4 transition-colors",
                isOpen
                  ? "bg-teal/[0.04]"
                  : "hover:bg-teal/[0.03]",
              ].join(" ")}
            >
              <div className="flex items-start gap-3 md:gap-4">
                <span
                  aria-hidden
                  className="shrink-0 mt-1 text-slate"
                >
                  {isOpen ? (
                    <ChevronDown size={14} strokeWidth={2} />
                  ) : (
                    <ChevronRight size={14} strokeWidth={2} />
                  )}
                </span>

                <div className="flex-1 min-w-0 grid grid-cols-1 md:grid-cols-[minmax(0,1.6fr)_minmax(0,2.4fr)_minmax(0,1.8fr)_auto] gap-x-4 gap-y-1 items-baseline">
                  {/* Actor */}
                  <div className="min-w-0">
                    <AuditActorChip
                      actorId={r.actor_id}
                      actorName={r.actor_name}
                    />
                  </div>

                  {/* Action */}
                  <div className="min-w-0">
                    <ActionPill action={r.action_type} />
                  </div>

                  {/* Target */}
                  <div className="min-w-0">
                    <p className="text-[14px] text-navy font-semibold truncate">
                      {r.target_label}
                    </p>
                    {r.target_secondary && (
                      <p className="font-mono text-[11px] text-slate/80 tracking-[0.04em] truncate">
                        {r.target_secondary}
                      </p>
                    )}
                  </div>

                  {/* Time */}
                  <div className="min-w-0 text-left md:text-right">
                    <p
                      className="font-mono uppercase text-caps-sm text-slate tracking-[0.08em]"
                      title={new Date(r.timestamp).toISOString()}
                    >
                      {timeAgo(r.timestamp)}
                    </p>
                  </div>
                </div>
              </div>
            </Link>

            {isOpen && (
              <div className="px-4 md:px-5 pb-4 md:pb-5">
                <AuditDiffPanel
                  before={r.before_value}
                  after={r.after_value}
                  notes={r.notes}
                />
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}

function ActionPill({ action }: { action: string }) {
  const tone = actionTone(action);
  const cls =
    tone === "alert"
      ? "border-red/40 bg-red/5 text-red-deep"
      : tone === "success"
        ? "border-green/40 bg-green/10 text-green"
        : "border-rule bg-paper text-slate";
  return (
    <span
      className={[
        "inline-flex items-center rounded border-[1.5px] px-2.5 py-1 font-mono uppercase text-caps-sm tracking-[0.08em] font-semibold",
        cls,
      ].join(" ")}
    >
      {actionLabel(action)}
    </span>
  );
}
