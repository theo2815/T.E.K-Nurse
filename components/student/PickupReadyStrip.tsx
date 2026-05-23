"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, Clock, Package, Beaker, Ticket } from "lucide-react";

export type PickupReadyItem = {
  /** borrow_request or consumable_request id — used in /student/requests/[id] link. */
  id: string;
  type: "equipment" | "consumable";
  sku_qr: string;
  sku_name: string;
  quantity: number;
  unit: string | null;
  pickup_code: string;
  pickup_expires_at: string;
};

/**
 * Hero call-to-action shown on /student/home when one or more requests are
 * APPROVED and have a live pickup code. Reuses the amber console palette and
 * monospace code typography from PickupCodeCard for visual parity with the
 * single-request hero on /student/requests/[id].
 *
 * Client component so the expiry chips can tick every minute without a server
 * round-trip.
 */
export function PickupReadyStrip({ items }: { items: PickupReadyItem[] }) {
  if (items.length === 0) return null;

  return (
    <section
      aria-label="Ready to collect"
      className="relative overflow-hidden border-[1.5px] border-amber rounded bg-paper"
    >
      <header className="bg-amber/15 px-5 py-3 flex items-center justify-between border-b border-amber/40 gap-3">
        <div className="flex items-center gap-2">
          <Ticket size={14} strokeWidth={2} className="text-amber-700" />
          <p className="font-mono uppercase text-[11px] tracking-[0.16em] font-bold text-amber-700">
            Ready to collect
          </p>
        </div>
        <p className="font-mono uppercase text-[10.5px] tracking-[0.12em] font-bold text-amber-700">
          {items.length} {items.length === 1 ? "request" : "requests"}
        </p>
      </header>

      <ol className="divide-y divide-amber/25">
        {items.map((item) => (
          <li key={item.id}>
            <PickupRow item={item} />
          </li>
        ))}
      </ol>

      <footer className="border-t border-amber/25 px-5 py-3 bg-amber/5">
        <p className="font-mono uppercase text-caps-sm text-slate tracking-[0.08em] flex items-center gap-2">
          <Clock size={11} strokeWidth={2} className="text-amber-700" />
          Bring the code to the lab counter — staff will verify it before
          handing you the item.
        </p>
      </footer>
    </section>
  );
}

function PickupRow({ item }: { item: PickupReadyItem }) {
  const TypeIcon = item.type === "equipment" ? Package : Beaker;
  return (
    <Link
      href={`/student/requests/${item.id}`}
      className="group flex flex-col md:flex-row md:items-center gap-3 md:gap-5 px-5 py-4 hover:bg-amber/5 transition-colors"
    >
      <div className="flex-1 min-w-0 flex flex-col gap-1">
        <div className="flex items-center gap-2.5">
          <TypeIcon
            size={13}
            strokeWidth={1.75}
            className="text-amber-700 shrink-0"
          />
          <span className="font-mono text-[13px] tracking-[0.04em] text-navy font-semibold">
            {item.sku_qr}
          </span>
          <span className="text-[15px] text-navy truncate">{item.sku_name}</span>
        </div>
        <p className="font-mono uppercase text-caps-sm text-slate tracking-[0.06em]">
          Qty {item.quantity}
          {item.unit ? ` ${item.unit}` : ""}
          <span aria-hidden className="mx-2">
            ·
          </span>
          <ExpiryChip expiresAt={item.pickup_expires_at} />
        </p>
      </div>

      <div className="flex items-center justify-between gap-3 md:gap-5 md:shrink-0">
        <p
          aria-label={`Pickup code ${item.pickup_code.split("").join(" ")}`}
          className="font-mono font-bold text-[22px] md:text-[26px] tracking-[0.14em] text-navy leading-none tabular-nums"
        >
          {formatCode(item.pickup_code)}
        </p>
        <ArrowRight
          size={16}
          strokeWidth={2}
          className="text-amber-700 group-hover:translate-x-0.5 transition-transform shrink-0"
          aria-hidden
        />
      </div>
    </Link>
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

  const remainingMs = new Date(expiresAt).getTime() - now;

  if (remainingMs <= 0) {
    return (
      <span className="font-mono uppercase text-caps-sm tracking-[0.08em] font-bold text-red-deep">
        Expired
      </span>
    );
  }

  return (
    <span className="font-mono uppercase text-caps-sm tracking-[0.08em] font-bold text-amber-700">
      Expires in {formatRemaining(remainingMs)}
    </span>
  );
}

function formatRemaining(ms: number): string {
  const totalMinutes = Math.floor(ms / 60_000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours >= 1) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}
