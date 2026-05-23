import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { MonoId } from "@/components/ui/MonoId";
import { PhotoFrame } from "@/components/catalog/PhotoFrame";

export type StaffRequestCardProps = {
  href: string;
  type: "equipment" | "consumable";
  qr: string;
  studentName: string;
  /** e.g. year_section "4 CS-A" (optional). */
  studentDetail?: string | null;
  itemName: string;
  itemPhotoUrl?: string | null;
  /** e.g. "Pickup today · Qty 1 unit". */
  itemMeta: string;
  /** ISO timestamp of created_at — drives the WAITING chip. */
  createdAt: string;
  /** ISO timestamp of expires_at — drives the EXPIRES chip. */
  expiresAt: string;
};

function formatWait(createdIso: string, nowMs: number): {
  text: string;
  alert: boolean;
} {
  const created = new Date(createdIso).getTime();
  const diffMin = Math.max(0, Math.round((nowMs - created) / 60_000));
  const hours = Math.floor(diffMin / 60);
  const days = Math.floor(hours / 24);
  if (diffMin < 1) return { text: "JUST NOW", alert: false };
  if (diffMin < 60) return { text: `${diffMin}m`, alert: false };
  if (hours < 24) {
    const restMin = diffMin - hours * 60;
    return {
      text: restMin === 0 ? `${hours}h` : `${hours}h ${restMin}m`,
      alert: false,
    };
  }
  return { text: `${days}d`, alert: true };
}

function formatExpiry(iso: string, nowMs: number): {
  text: string;
  alert: boolean;
} {
  const t = new Date(iso).getTime();
  const diffMs = t - nowMs;
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

export function StaffRequestCard({
  href,
  qr,
  studentName,
  studentDetail,
  itemName,
  itemPhotoUrl,
  itemMeta,
  createdAt,
  expiresAt,
}: StaffRequestCardProps) {
  const now = Date.now();
  const wait = formatWait(createdAt, now);
  const expiry = formatExpiry(expiresAt, now);

  return (
    <Link
      href={href}
      className="group block focus:outline-none focus-visible:[&>*]:border-teal"
    >
      <Card
        variant={expiry.alert ? "alert" : "default"}
        className="cursor-pointer"
      >
        <div className="flex flex-col gap-3">
          {/* Top row: LED + QR ID on the left, wait/expiry chips on the right */}
          <div className="flex items-center justify-between gap-3 text-caps-sm">
            <div className="flex items-center gap-2 min-w-0">
              <span
                aria-hidden
                className="relative inline-flex shrink-0 size-2 rounded-full bg-teal"
              >
                <span className="absolute inset-0 rounded-full bg-teal opacity-60 animate-ping" />
              </span>
              <MonoId id={qr} />
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <span
                className={`font-mono uppercase text-caps-sm font-semibold tracking-[0.06em] ${
                  wait.alert ? "text-red-deep" : "text-slate/80"
                }`}
              >
                WAITING · {wait.text}
              </span>
              <ChevronRight
                size={20}
                strokeWidth={1.75}
                className="text-slate/70 transition-colors group-hover:text-teal"
                aria-hidden
              />
            </div>
          </div>

          {/* Student lead — the headline of the card */}
          <div>
            <p className="font-mono uppercase text-caps-xs text-slate/60 tracking-[0.08em]">
              Student
            </p>
            <h3 className="mt-0.5 font-display italic font-extrabold text-[22px] leading-tight text-navy line-clamp-1">
              {studentName}
            </h3>
            {studentDetail && (
              <p className="text-[13px] text-slate/80">{studentDetail}</p>
            )}
          </div>

          {/* Item row */}
          <div className="flex items-center gap-3 pt-1 border-t border-rule/60">
            <PhotoFrame
              src={itemPhotoUrl}
              alt={itemName}
              size="thumb"
              className="shrink-0"
            />
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-navy text-[15px] leading-tight line-clamp-1">
                {itemName}
              </p>
              <p className="text-[13px] text-slate mt-0.5">
                {itemMeta}
                <span
                  className={`ml-2 font-mono uppercase text-caps-xs font-semibold tracking-[0.06em] ${
                    expiry.alert ? "text-red-deep" : "text-slate/70"
                  }`}
                >
                  · {expiry.text}
                </span>
              </p>
            </div>
          </div>
        </div>
      </Card>
    </Link>
  );
}
