import { Cpu, User as UserIcon } from "lucide-react";

/**
 * Renders the actor side of an audit row. NULL actor (system / cron) gets a
 * muted slate "SYSTEM" chip with a Cpu glyph so reviewers can tell at a
 * glance that no human is on the hook. Human actors get an initial avatar
 * + name + optional role suffix.
 */
export function AuditActorChip({
  actorId,
  actorName,
  variant = "row",
}: {
  actorId: string | null;
  actorName: string | null;
  variant?: "row" | "compact";
}) {
  if (actorId === null) {
    return (
      <span
        className={[
          "inline-flex items-center gap-1.5 rounded border-[1.5px] border-slate/30 bg-slate/5 text-slate font-mono uppercase tracking-[0.1em] font-semibold",
          variant === "compact"
            ? "px-2 py-0.5 text-caps-sm"
            : "px-2.5 py-1 text-caps-sm",
        ].join(" ")}
        title="Scheduled job (no human actor)"
      >
        <Cpu size={12} strokeWidth={2} aria-hidden />
        System
      </span>
    );
  }

  const name = actorName ?? "Unknown actor";
  const initial = (actorName ?? "?").trim().charAt(0).toUpperCase();

  return (
    <span className="inline-flex items-center gap-2 text-[14px] text-navy">
      <span
        aria-hidden
        className="shrink-0 size-7 rounded-fab border-[1.5px] border-teal/40 bg-teal/5 text-teal-deep font-display italic font-extrabold text-[13px] flex items-center justify-center"
      >
        {initial || <UserIcon size={12} strokeWidth={2} />}
      </span>
      <span className="font-semibold truncate max-w-[180px]">{name}</span>
    </span>
  );
}
