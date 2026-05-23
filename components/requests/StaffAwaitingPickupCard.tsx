import Link from "next/link";
import { ChevronRight, CheckCircle2 } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { MonoId } from "@/components/ui/MonoId";
import { PhotoFrame } from "@/components/catalog/PhotoFrame";
import type { StaffPendingRequestRow } from "@/lib/supabase/queries/staff-requests";

type Props = {
  request: StaffPendingRequestRow;
};

function formatExpiry(iso: string | null, nowMs: number): {
  text: string;
  alert: boolean;
} {
  if (!iso) return { text: "NO EXPIRY", alert: false };
  const diffMs = new Date(iso).getTime() - nowMs;
  if (diffMs <= 0) {
    const past = Math.abs(diffMs);
    const hours = Math.floor(past / 3_600_000);
    if (hours < 24) return { text: `EXPIRED ${hours}h ago`, alert: true };
    return { text: `EXPIRED ${Math.floor(hours / 24)}d ago`, alert: true };
  }
  const hours = Math.floor(diffMs / 3_600_000);
  if (hours < 1) {
    const mins = Math.max(1, Math.floor(diffMs / 60_000));
    return { text: `EXPIRES IN ${mins}m`, alert: true };
  }
  if (hours < 24) return { text: `EXPIRES IN ${hours}h`, alert: hours <= 6 };
  return { text: `EXPIRES IN ${Math.floor(hours / 24)}d`, alert: false };
}

function timeAgo(iso: string, nowMs: number): string {
  const minutes = Math.floor((nowMs - new Date(iso).getTime()) / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function formatCode(code: string | null): string {
  if (!code) return "—";
  const clean = code.replace(/[^0-9A-Z]/gi, "").toUpperCase();
  if (clean.length === 6) return `${clean.slice(0, 3)}-${clean.slice(3)}`;
  return clean;
}

export function StaffAwaitingPickupCard({ request: r }: Props) {
  const now = Date.now();
  const expiry = formatExpiry(r.pickup_expires_at, now);
  const unitLabel = r.sku.unit ?? (r.quantity === 1 ? "unit" : "units");
  const href = `/staff/requests/${r.id}?type=${r.type}`;

  return (
    <Link
      href={href}
      className="group block focus:outline-none focus-visible:[&>*]:border-teal"
    >
      <Card
        variant="default"
        className={`cursor-pointer border-l-4 ${
          expiry.alert ? "border-l-red" : "border-l-amber"
        }`}
      >
        <div className="flex flex-col gap-3">
          {/* Top row: QR + expiry chip */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <span
                aria-hidden
                className="relative inline-flex shrink-0 size-2 rounded-full bg-amber"
              >
                <span className="absolute inset-0 rounded-full bg-amber opacity-60 animate-ping" />
              </span>
              <MonoId id={r.sku.qr_code} />
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <span
                className={`font-mono uppercase text-caps-sm font-semibold tracking-[0.06em] ${
                  expiry.alert ? "text-red-deep" : "text-amber-700"
                }`}
              >
                {expiry.text}
              </span>
              <ChevronRight
                size={20}
                strokeWidth={1.75}
                className="text-slate/70 transition-colors group-hover:text-teal"
                aria-hidden
              />
            </div>
          </div>

          {/* Student lead */}
          <div>
            <p className="font-mono uppercase text-caps-xs text-slate/60 tracking-[0.08em]">
              Student
            </p>
            <h3 className="mt-0.5 font-display italic font-extrabold text-[22px] leading-tight text-navy line-clamp-1">
              {r.student.full_name}
            </h3>
            {r.student.year_section && (
              <p className="text-[13px] text-slate/80">{r.student.year_section}</p>
            )}
          </div>

          {/* Item row */}
          <div className="flex items-center gap-3 pt-1 border-t border-rule/60">
            <PhotoFrame
              src={r.sku.photo_url}
              alt={r.sku.name}
              size="thumb"
              className="shrink-0"
            />
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-navy text-[15px] leading-tight line-clamp-1">
                {r.sku.name}
              </p>
              <p className="text-[13px] text-slate mt-0.5">
                Qty {r.quantity} {unitLabel}
              </p>
            </div>
          </div>

          {/* Pickup code + approver */}
          <div className="flex items-center justify-between gap-4 pt-2 border-t border-rule/60 flex-wrap">
            <div className="min-w-0">
              <p className="font-mono uppercase text-caps-xs text-slate/60 tracking-[0.1em]">
                Pickup code
              </p>
              <p className="font-mono font-bold text-[22px] md:text-[26px] tracking-[0.12em] text-navy leading-none tabular-nums mt-1">
                {formatCode(r.pickup_code)}
              </p>
            </div>
            {r.approved_by_name && r.approved_at && (
              <p className="inline-flex items-center gap-1.5 font-mono uppercase text-[11px] tracking-[0.1em] font-semibold text-green text-right">
                <CheckCircle2 size={12} strokeWidth={2.5} />
                <span className="text-slate font-normal normal-case tracking-normal">
                  Approved by{" "}
                  <span className="font-semibold text-navy">
                    {r.approved_by_name}
                  </span>{" "}
                  · {timeAgo(r.approved_at, now)}
                </span>
              </p>
            )}
          </div>
        </div>
      </Card>
    </Link>
  );
}
