import { Ban, CheckCircle2, History } from "lucide-react";
import type { SuspensionHistoryEvent } from "@/lib/supabase/queries/students";

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/**
 * Chronological pause/restore log for one student.
 * Server-rendered; data comes from `getStudentSuspensionHistory`.
 * Renders an empty-state shell when nothing has happened — staff still see
 * the section, so the absence reads as "no history" not "missing feature."
 */
export function StudentSuspensionHistory({
  events,
}: {
  events: SuspensionHistoryEvent[];
}) {
  return (
    <section className="flex flex-col gap-4">
      <header className="flex items-center gap-3">
        <History size={16} strokeWidth={1.75} className="text-teal" />
        <h2 className="font-display italic font-extrabold text-[22px] text-navy leading-tight">
          Pause / restore log
        </h2>
        {events.length > 0 && (
          <span className="font-mono uppercase text-caps-sm text-slate tracking-[0.1em] font-semibold">
            · {events.length} event{events.length === 1 ? "" : "s"}
          </span>
        )}
      </header>

      {events.length === 0 ? (
        <div className="border-[1.5px] border-dashed border-rule rounded bg-paper px-5 py-8 text-center">
          <p className="font-mono uppercase text-caps-md text-slate tracking-[0.08em] font-semibold">
            No pause or restore events on record
          </p>
          <p className="mt-2 text-[13px] text-slate/80 max-w-md mx-auto leading-relaxed">
            When staff pauses or restores this student&apos;s borrowing access,
            it&apos;ll appear here with the reason and timestamp.
          </p>
        </div>
      ) : (
        <ol className="bg-paper border-[1.5px] border-rule rounded overflow-hidden">
          {events.map((event, idx) => (
            <EventRow
              key={event.id}
              event={event}
              isFirst={idx === 0}
              isLast={idx === events.length - 1}
            />
          ))}
        </ol>
      )}
    </section>
  );
}

function EventRow({
  event,
  isFirst,
}: {
  event: SuspensionHistoryEvent;
  isFirst: boolean;
  isLast: boolean;
}) {
  const isSuspend = event.action_type === "student_suspended";
  return (
    <li
      className={`flex gap-4 px-5 py-5 ${
        isFirst ? "" : "border-t border-rule/60"
      }`}
    >
      {/* Icon column */}
      <div
        aria-hidden
        className={`shrink-0 size-9 rounded-fab flex items-center justify-center border-[1.5px] ${
          isSuspend
            ? "border-red-deep/40 bg-red-deep/5 text-red-deep"
            : "border-teal/40 bg-teal/10 text-teal-deep"
        }`}
      >
        {isSuspend ? (
          <Ban size={16} strokeWidth={2} />
        ) : (
          <CheckCircle2 size={16} strokeWidth={2} />
        )}
      </div>

      {/* Body column */}
      <div className="flex-1 min-w-0 flex flex-col gap-2">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <span
            className={`font-mono uppercase text-caps-md font-bold tracking-[0.1em] ${
              isSuspend ? "text-red-deep" : "text-teal-deep"
            }`}
          >
            {isSuspend ? "Paused" : "Restored"}
          </span>
          <span className="font-mono uppercase text-caps-sm text-slate tracking-[0.08em]">
            {formatDateTime(event.occurred_at)}
          </span>
          {event.actor_name && (
            <span className="text-[13px] text-slate">
              · by{" "}
              <span className="text-navy font-semibold">{event.actor_name}</span>
            </span>
          )}
        </div>

        {event.reason && event.reason.trim().length > 0 ? (
          <blockquote
            className={`border-l-[3px] pl-3 py-1 text-[14px] italic text-navy leading-relaxed ${
              isSuspend ? "border-red-deep/60" : "border-teal/60"
            }`}
          >
            “{event.reason}”
          </blockquote>
        ) : (
          <p className="text-[13px] text-slate/70 italic">
            {isSuspend ? "(no reason recorded)" : "(no note recorded)"}
          </p>
        )}
      </div>
    </li>
  );
}
