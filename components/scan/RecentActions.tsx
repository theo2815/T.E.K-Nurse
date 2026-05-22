"use client";

import { useEffect, useState } from "react";
import { ArrowRight, Undo2, Beaker, Zap, X, Check } from "lucide-react";
import { PhotoFrame } from "@/components/catalog/PhotoFrame";
import type { LendSuccessActivity } from "@/components/staff/LendModal";
import type { ReturnSuccessActivity } from "@/components/staff/ReturnModal";
import type { UsageSuccessActivity } from "@/components/staff/LogUsageModal";
import type { OverrideSuccessActivity } from "@/components/staff/OverrideModal";
import type { ReleaseSuccessActivity } from "@/components/staff/VerifyAtPickupModal";

export type RecentActivity =
  | (LendSuccessActivity & { id: string })
  | (ReturnSuccessActivity & { id: string })
  | (UsageSuccessActivity & { id: string })
  | (OverrideSuccessActivity & { id: string })
  | (ReleaseSuccessActivity & { id: string });

type Props = {
  items: RecentActivity[];
  onClear: () => void;
};

const MAX_VISIBLE = 3;

export function RecentActions({ items, onClear }: Props) {
  // Tick every 30s so relative times don't go stale while staff is idle.
  const [, setTick] = useState(0);
  useEffect(() => {
    if (items.length === 0) return;
    const id = setInterval(() => setTick((t) => t + 1), 30_000);
    return () => clearInterval(id);
  }, [items.length]);

  if (items.length === 0) return null;

  const visible = items.slice(0, MAX_VISIBLE);

  return (
    <section
      aria-label="Recent counter actions"
      className="border-[1.5px] border-rule rounded bg-paper overflow-hidden"
    >
      {/* Header strip — console readout chrome */}
      <header className="bg-navy-deep flex items-center justify-between px-4 py-2.5">
        <div className="flex items-center gap-2">
          <span className="relative inline-flex shrink-0 size-2 rounded-fab bg-teal">
            <span className="absolute inset-0 rounded-fab bg-teal opacity-60 animate-ping" />
          </span>
          <p className="font-mono uppercase text-[11px] tracking-[0.14em] font-bold text-cyan/90">
            Just done
          </p>
          <span className="font-mono uppercase text-[10.5px] tracking-[0.1em] text-cyan/50 ml-1">
            · {items.length} this session
          </span>
        </div>
        <button
          type="button"
          onClick={onClear}
          aria-label="Clear recent actions"
          className="inline-flex items-center gap-1 font-mono uppercase text-[10.5px] tracking-[0.12em] font-bold text-cyan/60 hover:text-cyan transition-colors"
        >
          Clear
          <X size={11} strokeWidth={2.5} />
        </button>
      </header>

      <ul className="divide-y divide-rule">
        {visible.map((a) => (
          <li key={a.id}>
            <ActivityRow activity={a} />
          </li>
        ))}
      </ul>

      {items.length > MAX_VISIBLE && (
        <p className="px-4 py-2 border-t border-rule font-mono uppercase text-[10.5px] tracking-[0.1em] text-slate/60 text-right bg-mist/40">
          + {items.length - MAX_VISIBLE} earlier · see audit log for full record
        </p>
      )}
    </section>
  );
}

function ActivityRow({ activity }: { activity: RecentActivity }) {
  const meta = formatMeta(activity);

  return (
    <div className="px-4 py-3 flex items-center gap-3">
      <PhotoFrame
        src={activity.sku.photo_url}
        alt={activity.sku.name}
        size="thumb"
        className="!w-12 !h-12 shrink-0"
      />

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <TypePill activity={activity} />
          <span className="font-mono uppercase text-[12px] font-semibold tracking-[0.06em] text-navy">
            {activity.sku.qr_code}
          </span>
          <ArrowGlyph kind={activity.kind} />
          <span className="font-display italic font-extrabold text-[16px] text-navy leading-none truncate">
            {activity.student.full_name}
          </span>
        </div>
        <p className="mt-1 font-mono uppercase text-caps-sm text-slate tracking-[0.06em] truncate">
          {meta}
        </p>
      </div>

      <p className="font-mono uppercase text-caps-sm text-slate/70 tracking-[0.08em] shrink-0 text-right">
        {relativeTime(activity.at)}
      </p>
    </div>
  );
}

function TypePill({ activity }: { activity: RecentActivity }) {
  // Returns vary by physical condition — DAMAGED + LOST get distinct pills
  // so the strip is glanceable at the counter.
  if (activity.kind === "return") {
    if (activity.condition === "DAMAGED") {
      return (
        <span className="font-mono uppercase text-[10px] font-bold tracking-[0.12em] bg-amber/20 text-amber-700 px-1.5 py-0.5 rounded">
          Damaged
        </span>
      );
    }
    if (activity.condition === "LOST_ON_RETURN") {
      return (
        <span className="font-mono uppercase text-[10px] font-bold tracking-[0.12em] bg-red-deep/15 text-red-deep px-1.5 py-0.5 rounded">
          Lost
        </span>
      );
    }
    return (
      <span className="font-mono uppercase text-[10px] font-bold tracking-[0.12em] bg-navy/10 text-navy px-1.5 py-0.5 rounded">
        Return
      </span>
    );
  }
  switch (activity.kind) {
    case "lend":
      return (
        <span className="font-mono uppercase text-[10px] font-bold tracking-[0.12em] bg-teal/15 text-teal-deep px-1.5 py-0.5 rounded">
          Lend
        </span>
      );
    case "usage":
      return (
        <span className="font-mono uppercase text-[10px] font-bold tracking-[0.12em] bg-cyan/25 text-navy px-1.5 py-0.5 rounded">
          Use
        </span>
      );
    case "override":
      return (
        <span className="font-mono uppercase text-[10px] font-bold tracking-[0.12em] bg-amber/20 text-amber-700 px-1.5 py-0.5 rounded">
          Override
        </span>
      );
    case "release":
      return (
        <span className="font-mono uppercase text-[10px] font-bold tracking-[0.12em] bg-green/15 text-green px-1.5 py-0.5 rounded">
          Release
        </span>
      );
  }
}

function ArrowGlyph({ kind }: { kind: RecentActivity["kind"] }) {
  if (kind === "return") {
    return (
      <Undo2
        size={12}
        strokeWidth={2.5}
        aria-hidden
        className="text-slate/60"
      />
    );
  }
  if (kind === "usage") {
    return (
      <Beaker
        size={12}
        strokeWidth={2.5}
        aria-hidden
        className="text-slate/60"
      />
    );
  }
  if (kind === "override") {
    return (
      <Zap
        size={12}
        strokeWidth={2.5}
        aria-hidden
        className="text-slate/60"
      />
    );
  }
  if (kind === "release") {
    return (
      <Check
        size={12}
        strokeWidth={2.5}
        aria-hidden
        className="text-green"
      />
    );
  }
  return (
    <ArrowRight
      size={12}
      strokeWidth={2.5}
      aria-hidden
      className="text-slate/60"
    />
  );
}

function formatMeta(a: RecentActivity): string {
  if (a.kind === "lend") {
    return `${a.quantity} unit${a.quantity === 1 ? "" : "s"} · Due ${formatDate(a.expected_return_date)}`;
  }
  if (a.kind === "return") {
    const units = `${a.quantity} unit${a.quantity === 1 ? "" : "s"}`;
    if (a.condition === "DAMAGED") return `${units} → maintenance`;
    if (a.condition === "LOST_ON_RETURN") return `${units} → lost`;
    return `${units} back on shelf`;
  }
  if (a.kind === "usage") {
    return `${a.quantity} ${a.sku.unit} consumed`;
  }
  if (a.kind === "release") {
    const units =
      a.variant === "equipment"
        ? `${a.quantity} unit${a.quantity === 1 ? "" : "s"}`
        : `${a.quantity} issued`;
    const code = formatCodeForMeta(a.pickup_code);
    return code ? `${units} · code ${code}` : units;
  }
  // override
  return `${a.quantity} unit${a.quantity === 1 ? "" : "s"} · Skipped ${a.skippedStudent.full_name} · Due ${formatDate(a.expected_return_date)}`;
}

function formatCodeForMeta(code: string): string {
  const clean = code.replace(/[^0-9A-Z]/gi, "").toUpperCase();
  if (clean.length === 6) return `${clean.slice(0, 3)}-${clean.slice(3)}`;
  return clean;
}

function formatDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  return d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function relativeTime(timestamp: number): string {
  const seconds = Math.round((Date.now() - timestamp) / 1000);
  if (seconds < 45) return "Just now";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return new Date(timestamp).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}
