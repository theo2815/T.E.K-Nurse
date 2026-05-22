"use client";

import { useEffect, useState } from "react";
import { Clock, Ticket } from "lucide-react";

type Props = {
  code: string;
  expiresAt: string;
};

/**
 * Hero card shown on /student/requests/[id] when status = APPROVED.
 * The pickup code is the verification artifact the student presents to the
 * lab nurse at the counter; the nurse visually compares it to what's on the
 * staff verify modal before releasing the item.
 *
 * The expiry chip ticks every minute so the student knows how much time is
 * left without having to refresh.
 */
export function PickupCodeCard({ code, expiresAt }: Props) {
  return (
    <section
      aria-label="Pickup code"
      className="relative overflow-hidden border-[1.5px] border-amber rounded bg-paper"
    >
      {/* Amber console strip across the top */}
      <header className="bg-amber/15 px-5 py-3 flex items-center justify-between border-b border-amber/40">
        <div className="flex items-center gap-2">
          <Ticket size={14} strokeWidth={2} className="text-amber-700" />
          <p className="font-mono uppercase text-[11px] tracking-[0.16em] font-bold text-amber-700">
            Ready to collect
          </p>
        </div>
        <ExpiryChip expiresAt={expiresAt} />
      </header>

      <div className="px-5 md:px-7 py-7 md:py-9 flex flex-col items-center gap-4 text-center">
        <p className="font-mono uppercase text-caps-sm text-slate tracking-[0.12em] font-semibold">
          Pickup code
        </p>
        <p
          aria-label={`Pickup code ${code.split("").join(" ")}`}
          className="font-mono font-bold text-[44px] md:text-[56px] tracking-[0.14em] text-navy leading-none tabular-nums"
        >
          {formatCode(code)}
        </p>
        <p className="text-[15px] text-slate max-w-sm leading-relaxed">
          Show this to the lab nurse at the counter. They&apos;ll verify it
          before handing you the item.
        </p>
      </div>
    </section>
  );
}

function formatCode(code: string): string {
  const clean = code.replace(/[^0-9A-Z]/gi, "").toUpperCase();
  if (clean.length === 6) return `${clean.slice(0, 3)}-${clean.slice(3)}`;
  return clean;
}

function ExpiryChip({ expiresAt }: { expiresAt: string }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);

  const expiresMs = new Date(expiresAt).getTime();
  const remainingMs = expiresMs - now;

  if (remainingMs <= 0) {
    return (
      <span className="inline-flex items-center gap-1.5 font-mono uppercase text-[10.5px] tracking-[0.12em] font-bold text-red-deep">
        <Clock size={11} strokeWidth={2.5} />
        Expired
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 font-mono uppercase text-[10.5px] tracking-[0.12em] font-bold text-amber-700">
      <Clock size={11} strokeWidth={2.5} />
      Expires in {formatRemaining(remainingMs)}
    </span>
  );
}

function formatRemaining(ms: number): string {
  const totalMinutes = Math.floor(ms / 60_000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours >= 1) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}
