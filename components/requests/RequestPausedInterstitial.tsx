import Link from "next/link";
import { Ban, ArrowLeft, Mail } from "lucide-react";

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
 * Replaces the new-request form when the logged-in student's account is
 * paused. Shows the reason (staff-written) and points them to the right
 * recovery path (in-person at the lab, or replying to the suspension email).
 */
export function RequestPausedInterstitial({
  reason,
  suspendedAt,
  backHref,
}: {
  reason: string | null;
  suspendedAt: string | null;
  backHref: string;
}) {
  return (
    <div className="flex flex-col gap-6">
      <div className="border-l-4 border-red-deep bg-paper rounded-r p-6 md:p-7 flex flex-col gap-5">
        <div className="flex items-start gap-4">
          <div
            aria-hidden
            className="shrink-0 size-12 rounded-fab bg-red-deep/10 border-[1.5px] border-red-deep/40 flex items-center justify-center text-red-deep"
          >
            <Ban size={22} strokeWidth={2} />
          </div>
          <div className="flex-1 min-w-0 flex flex-col gap-1">
            <p className="font-mono uppercase text-caps-md text-red-deep font-bold tracking-[0.1em]">
              Account paused
            </p>
            <h2 className="font-display italic font-extrabold text-[28px] md:text-[32px] text-navy leading-tight">
              You can&apos;t submit requests right now
            </h2>
            {suspendedAt && (
              <p className="font-mono uppercase text-caps-sm text-slate tracking-[0.08em] mt-1">
                Since {formatDateTime(suspendedAt)}
              </p>
            )}
          </div>
        </div>

        {reason && reason.trim().length > 0 && (
          <div className="border-l-[3px] border-red-deep/60 pl-4 py-1">
            <p className="font-mono uppercase text-caps-sm text-slate font-semibold tracking-[0.1em] mb-1.5">
              Reason from staff
            </p>
            <p className="text-[15px] italic text-navy leading-relaxed">
              “{reason}”
            </p>
          </div>
        )}

        <div className="flex flex-col gap-2 text-[14px] text-slate leading-relaxed">
          <p className="text-navy font-semibold">How to get back to active</p>
          <p>
            Please drop by the nursing lab in person — a short conversation is
            the fastest way to resolve this. You can also reply to the email
            staff sent you to discuss the issue first.
          </p>
        </div>
      </div>

      <Link
        href={backHref}
        className="inline-flex items-center gap-2 self-start font-mono uppercase text-caps-sm text-slate hover:text-teal-deep tracking-[0.08em] font-semibold transition-colors"
      >
        <ArrowLeft size={14} strokeWidth={2} />
        Back
      </Link>

      <p className="font-mono uppercase text-caps-sm text-slate/70 tracking-[0.08em] flex items-center gap-2">
        <Mail size={11} strokeWidth={2} className="text-teal" />
        T.E.K Nurse support · in person or by email reply
      </p>
    </div>
  );
}
