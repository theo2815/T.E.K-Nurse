import { Ban } from "lucide-react";

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
 * Compact paused-account banner shown at the top of /student/home when the
 * student is suspended. Distinct from RequestPausedInterstitial — that one
 * replaces the new-request form because submission is impossible while
 * paused. On the home page the student still benefits from seeing their
 * outstanding loans, due dates, and recent activity, so this is a strip
 * (not a takeover).
 */
export function StudentPausedStrip({
  reason,
  suspendedAt,
}: {
  reason: string | null;
  suspendedAt: string | null;
}) {
  return (
    <section
      aria-label="Account paused"
      className="border-l-4 border-red-deep bg-paper rounded-r p-5 md:p-6 flex items-start gap-4"
    >
      <div
        aria-hidden
        className="shrink-0 size-10 rounded-fab bg-red-deep/10 border-[1.5px] border-red-deep/40 flex items-center justify-center text-red-deep"
      >
        <Ban size={18} strokeWidth={2} />
      </div>

      <div className="flex-1 min-w-0 flex flex-col gap-2">
        <div className="flex items-baseline gap-3 flex-wrap">
          <p className="font-mono uppercase text-caps-md text-red-deep font-bold tracking-[0.1em]">
            Account paused
          </p>
          {suspendedAt && (
            <p className="font-mono uppercase text-caps-sm text-slate tracking-[0.08em]">
              Since {formatDateTime(suspendedAt)}
            </p>
          )}
        </div>
        <p className="text-[15px] text-navy leading-snug">
          You can&apos;t submit new requests right now. Drop by the nursing lab
          in person, or reply to the suspension email staff sent you.
        </p>
        {reason && reason.trim().length > 0 && (
          <p className="text-[14px] italic text-slate leading-relaxed">
            “{reason}”
          </p>
        )}
      </div>
    </section>
  );
}
