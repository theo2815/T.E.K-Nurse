"use client";

import { useEffect, useState } from "react";
import { ArrowRight, Clock, GraduationCap, Mail } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { PhotoFrame } from "@/components/catalog/PhotoFrame";
import type { StaffPendingRequestRow } from "@/lib/supabase/queries/staff-requests";

type Props = {
  open: boolean;
  onClose: () => void;
  /** Provided when this picker was opened from the equipment ActionPicker;
   *  renders the chevron-left "back" affordance. */
  onBack?: () => void;
  awaitingPickup: StaffPendingRequestRow[];
  onPick: (req: StaffPendingRequestRow) => void;
};

/**
 * Shown on /staff/scan when the scanned SKU has 2+ students with approved
 * pickups (equipment or consumable). Lets staff pick which student is
 * actually at the counter rather than force-routing to the oldest-approved
 * request.
 */
export function PickupVerifyPicker({
  open,
  onClose,
  onBack,
  awaitingPickup,
  onPick,
}: Props) {
  const first = awaitingPickup[0];
  const sku = first?.sku;

  return (
    <Modal
      open={open}
      onClose={onClose}
      onBack={onBack}
      eyebrow="PICKUP · CHOOSE STUDENT"
      title={
        sku ? `${sku.qr_code} · who's at the counter?` : "Choose a student"
      }
      size="wide"
      footer={
        <div className="flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="text-navy text-[15px] font-bold hover:underline underline-offset-4 decoration-teal decoration-2 px-3"
          >
            Cancel
          </button>
        </div>
      }
    >
      <div className="flex flex-col gap-5">
        {sku && (
          <div className="flex items-center gap-4 border-l-[3px] border-teal pl-4">
            <PhotoFrame
              src={sku.photo_url}
              alt={sku.name}
              size="thumb"
              className="shrink-0"
            />
            <div className="flex-1 min-w-0">
              <p className="font-mono uppercase text-caps-sm font-semibold tracking-[0.08em] text-navy">
                {sku.qr_code}
              </p>
              <p className="text-[15px] text-navy font-semibold truncate">
                {sku.name}
              </p>
            </div>
          </div>
        )}

        <p className="text-[15px] text-slate leading-relaxed">
          {awaitingPickup.length} students have approved pickups for this
          item. Tap the one standing at the counter.
        </p>

        <ul className="flex flex-col gap-3">
          {awaitingPickup.map((r) => (
            <li key={r.id}>
              <StudentRow req={r} onPick={onPick} />
            </li>
          ))}
        </ul>
      </div>
    </Modal>
  );
}

function StudentRow({
  req,
  onPick,
}: {
  req: StaffPendingRequestRow;
  onPick: (req: StaffPendingRequestRow) => void;
}) {
  const unitLabel =
    req.sku.unit ?? (req.quantity === 1 ? "unit" : "units");
  const code = req.pickup_code ?? "";
  return (
    <button
      type="button"
      onClick={() => onPick(req)}
      className="group w-full text-left rounded border-[1.5px] border-rule hover:border-teal hover:bg-teal/5 transition-colors overflow-hidden"
    >
      {/* Top: avatar + student details + arrow */}
      <div className="flex items-start gap-3 sm:gap-4 px-4 sm:px-5 pt-4 pb-3">
        <Avatar name={req.student.full_name} />
        <div className="flex-1 min-w-0">
          <p className="font-display italic font-extrabold text-[17px] sm:text-[18px] text-navy leading-tight">
            {req.student.full_name}
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12.5px] text-slate">
            <span className="inline-flex items-center gap-1 min-w-0 max-w-full">
              <Mail
                size={11}
                strokeWidth={1.75}
                className="shrink-0 text-slate/60"
              />
              <span className="font-mono truncate">
                {req.student.email}
              </span>
            </span>
            {req.student.year_section && (
              <span className="inline-flex items-center gap-1 shrink-0">
                <GraduationCap
                  size={11}
                  strokeWidth={1.75}
                  className="text-slate/60"
                />
                <span className="font-mono uppercase tracking-[0.06em]">
                  {req.student.year_section}
                </span>
              </span>
            )}
          </div>
          <p className="mt-1.5 inline-flex items-center gap-1.5 font-mono uppercase text-[10.5px] text-slate/70 tracking-[0.1em]">
            <Clock size={10} strokeWidth={2} />
            Approved <TimeAgo iso={req.approved_at} />
          </p>
        </div>
        <ArrowRight
          size={16}
          strokeWidth={2}
          className="shrink-0 mt-1 text-slate/40 group-hover:text-teal group-hover:translate-x-0.5 transition-all"
        />
      </div>
      {/* Bottom strip: pickup code + qty */}
      <div className="border-t border-rule/50 bg-amber/5 px-4 sm:px-5 py-2.5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <span className="font-mono uppercase text-[10px] tracking-[0.12em] font-bold text-amber-700 shrink-0">
            Code
          </span>
          <span className="font-mono font-bold text-[18px] sm:text-[20px] tracking-[0.14em] text-navy tabular-nums truncate">
            {formatCode(code)}
          </span>
        </div>
        <span className="font-mono uppercase text-[11px] text-slate/70 tracking-[0.08em] shrink-0">
          {req.quantity} {unitLabel}
        </span>
      </div>
    </button>
  );
}

function Avatar({ name }: { name: string }) {
  return (
    <div
      aria-hidden
      className="shrink-0 size-11 rounded-full border-[1.5px] border-rule bg-mist flex items-center justify-center font-display italic font-extrabold text-[15px] text-navy"
    >
      {initials(name)}
    </div>
  );
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() ?? "").join("") || "?";
}

function formatCode(code: string): string {
  const clean = code.replace(/[^0-9A-Z]/gi, "").toUpperCase();
  if (clean.length === 6) return `${clean.slice(0, 3)}-${clean.slice(3)}`;
  return clean;
}

/** Live-updating "approved 5m ago" — the picker may stay open for several
 *  minutes while staff handles other students at the counter. */
function TimeAgo({ iso }: { iso: string | null }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);
  if (!iso) return <>—</>;
  const ms = now - new Date(iso).getTime();
  const minutes = Math.floor(ms / 60_000);
  if (minutes < 1) return <>just now</>;
  if (minutes < 60) return <>{minutes}m ago</>;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return <>{hours}h ago</>;
  const days = Math.floor(hours / 24);
  return <>{days}d ago</>;
}
