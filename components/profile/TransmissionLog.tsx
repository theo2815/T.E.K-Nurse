import Link from "next/link";
import { Play, ArrowRight } from "lucide-react";

export type TransmissionEntry = {
  /** Stable React key — typically the source row ID. */
  id: string;
  /** ISO timestamp of the event. */
  at: string;
  /** Action label, e.g. "Borrow approved" or "Borrowed". */
  label: string;
  /** Optional target ID rendered in mono caps, e.g. "STH-007". */
  refId?: string | null;
  /** Optional trailing detail, e.g. "Stethoscope" or "50 mL". */
  detail?: string | null;
  /** Color tone for the action label — leans on the audit `actionTone` map. */
  tone?: "default" | "alert" | "success";
};

const TONE_LABEL: Record<NonNullable<TransmissionEntry["tone"]>, string> = {
  default: "text-navy",
  success: "text-teal-deep",
  alert: "text-red-deep",
};

function formatStamp(iso: string): string {
  const date = new Date(iso);
  const now = new Date();

  const sameDay =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();
  if (sameDay) {
    return date.toLocaleTimeString("en-US", {
      timeZone: "Asia/Manila",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  }

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const sameYesterday =
    date.getFullYear() === yesterday.getFullYear() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getDate() === yesterday.getDate();
  if (sameYesterday) return "Yest";

  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays >= 0 && diffDays < 7) {
    return date.toLocaleDateString("en-US", {
      timeZone: "Asia/Manila",
      weekday: "short",
    });
  }

  return date.toLocaleDateString("en-US", {
    timeZone: "Asia/Manila",
    month: "short",
    day: "numeric",
  });
}

/**
 * Console-style activity feed. Each row is timestamp (mono caps) · action
 * label · optional MonoId ref · optional descriptive trail. Empty state
 * renders a dashed-border placeholder so the section still has presence
 * for brand-new accounts.
 */
export function TransmissionLog({
  entries,
  seeAllHref,
  emptyHint,
}: {
  entries: TransmissionEntry[];
  seeAllHref?: string;
  emptyHint?: string;
}) {
  return (
    <section
      aria-label="Transmission log"
      className="flex flex-col gap-4"
    >
      <div className="flex items-center gap-2.5">
        <Play
          size={11}
          strokeWidth={2.5}
          className="text-teal fill-teal"
          aria-hidden
        />
        <p className="font-mono uppercase text-caps-md text-slate font-semibold tracking-[0.12em]">
          Transmission log
        </p>
        <span className="flex-1 border-t border-rule/80" aria-hidden />
      </div>

      {entries.length === 0 ? (
        <div className="border-[1.5px] border-dashed border-rule rounded bg-paper px-5 py-8 text-center">
          <p className="font-mono uppercase text-caps-md text-slate tracking-[0.1em] font-semibold">
            No activity yet
          </p>
          {emptyHint && (
            <p className="mt-2 text-[13px] text-slate/80 max-w-md mx-auto leading-relaxed">
              {emptyHint}
            </p>
          )}
        </div>
      ) : (
        <>
          <ol className="bg-paper border-[1.5px] border-rule rounded overflow-hidden divide-y divide-rule/60">
            {entries.map((e) => {
              const tone = e.tone ?? "default";
              return (
                <li
                  key={e.id}
                  className="grid grid-cols-[68px_minmax(0,_1fr)] md:grid-cols-[88px_minmax(0,_1fr)] gap-3 items-baseline px-4 md:px-5 py-3"
                >
                  <span className="font-mono uppercase text-caps-sm text-slate font-semibold tracking-[0.1em]">
                    {formatStamp(e.at)}
                  </span>
                  <span className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1 min-w-0">
                    <span
                      className={`text-[14px] font-medium ${TONE_LABEL[tone]}`}
                    >
                      {e.label}
                    </span>
                    {e.refId && (
                      <span className="font-mono uppercase text-caps-md font-semibold tracking-[0.06em] text-navy">
                        {e.refId}
                      </span>
                    )}
                    {e.detail && (
                      <span className="text-[13px] text-slate truncate min-w-0">
                        {e.detail}
                      </span>
                    )}
                  </span>
                </li>
              );
            })}
          </ol>
          {seeAllHref && (
            <Link
              href={seeAllHref}
              className="self-start inline-flex items-center gap-1.5 font-mono uppercase text-caps-sm text-teal hover:text-teal-deep tracking-[0.08em] font-semibold transition-colors"
            >
              See full log
              <ArrowRight size={12} strokeWidth={2} />
            </Link>
          )}
        </>
      )}
    </section>
  );
}
