"use client";

import { ArrowRight, Inbox, Ticket, Undo2 } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { PhotoFrame } from "@/components/catalog/PhotoFrame";
import type { EquipmentScanTarget } from "@/lib/supabase/queries/scan";

type Props = {
  open: boolean;
  onClose: () => void;
  target: EquipmentScanTarget;
  onPickBorrow: () => void;
  onPickReturn: () => void;
  onPickVerify?: () => void;
};

/**
 * Shown on /staff/scan when a scanned equipment item has multiple possible
 * actions at the counter (walk-in lend / log return / verify approved pickup).
 * Big tiles with live state context — verify takes priority position when
 * present since "student at counter with code" is the dominant scenario.
 */
export function ActionPicker({
  open,
  onClose,
  target,
  onPickBorrow,
  onPickReturn,
  onPickVerify,
}: Props) {
  const { sku, openBorrows, awaitingPickup } = target;
  const showVerify = !!onPickVerify && awaitingPickup.length > 0;
  const tileCount = (showVerify ? 1 : 0) + (target.canBorrow ? 1 : 0) + 1;
  const gridCols =
    tileCount >= 3
      ? "sm:grid-cols-2 lg:grid-cols-3"
      : "sm:grid-cols-2";

  return (
    <Modal
      open={open}
      onClose={onClose}
      eyebrow="CHOOSE ACTION"
      title={`${sku.qr_code} · which action?`}
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
        <div className="flex items-center gap-4">
          <PhotoFrame
            src={sku.photo_url}
            alt={sku.name}
            size="thumb"
            className="shrink-0"
          />
          <div className="flex flex-col gap-1 min-w-0">
            <p className="font-mono uppercase text-caps-sm font-semibold tracking-[0.08em] text-navy">
              {sku.qr_code}
            </p>
            <p className="text-[15px] text-navy font-semibold truncate">
              {sku.name}
            </p>
          </div>
        </div>

        <p className="text-[15px] text-slate leading-relaxed">
          {showVerify
            ? "This item has an approved pickup waiting, plus other activity. Pick what's happening at the counter right now."
            : "This item has both free stock and active borrows. Pick what's happening at the counter right now."}
        </p>

        <div className={`grid gap-4 ${gridCols}`}>
          {showVerify && (
            <button
              type="button"
              onClick={onPickVerify}
              className="group text-left rounded border-[1.5px] border-amber bg-amber/10 hover:bg-amber/15 transition-colors px-5 py-5 flex flex-col gap-3"
            >
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 font-mono uppercase text-caps-sm font-bold tracking-[0.1em] text-amber-700">
                  <Ticket size={13} strokeWidth={2} />
                  Verify pickup
                </span>
                <ArrowRight
                  size={16}
                  strokeWidth={2}
                  className="text-amber-700 group-hover:translate-x-0.5 transition-transform"
                />
              </div>
              <div>
                <p className="font-display italic font-extrabold text-[44px] text-navy leading-none">
                  {awaitingPickup.length}
                </p>
                <p className="mt-1 font-mono uppercase text-caps-sm text-slate tracking-[0.08em]">
                  {awaitingPickup.length === 1 ? "request" : "requests"} ready
                </p>
              </div>
              <p className="text-[13.5px] text-slate leading-snug">
                Student is here with a pickup code. Verify and release the item.
              </p>
            </button>
          )}

          {target.canBorrow && (
            <button
              type="button"
              onClick={onPickBorrow}
              className="group text-left rounded border-[1.5px] border-teal bg-teal/5 hover:bg-teal/10 transition-colors px-5 py-5 flex flex-col gap-3"
            >
              <div className="flex items-center justify-between">
                <span className="font-mono uppercase text-caps-sm font-bold tracking-[0.1em] text-teal-deep">
                  Walk-in lend
                </span>
                <ArrowRight
                  size={16}
                  strokeWidth={2}
                  className="text-teal group-hover:translate-x-0.5 transition-transform"
                />
              </div>
              <div>
                <p className="font-display italic font-extrabold text-[44px] text-navy leading-none">
                  {sku.available_units}
                </p>
                <p className="mt-1 font-mono uppercase text-caps-sm text-slate tracking-[0.08em]">
                  {sku.available_units === 1 ? "unit" : "units"} available
                </p>
              </div>
              <p className="text-[13.5px] text-slate leading-snug">
                Hand this item to a student. Records the borrow against their
                account.
              </p>
            </button>
          )}

          <button
            type="button"
            onClick={onPickReturn}
            className="group text-left rounded border-[1.5px] border-navy bg-paper hover:bg-navy/5 transition-colors px-5 py-5 flex flex-col gap-3"
          >
            <div className="flex items-center justify-between">
              <span className="font-mono uppercase text-caps-sm font-bold tracking-[0.1em] text-navy">
                Log return
              </span>
              <Undo2
                size={16}
                strokeWidth={2}
                className="text-navy group-hover:-rotate-12 transition-transform"
              />
            </div>
            <div>
              <p className="font-display italic font-extrabold text-[44px] text-navy leading-none">
                {openBorrows.length}
              </p>
              <p className="mt-1 font-mono uppercase text-caps-sm text-slate tracking-[0.08em]">
                {openBorrows.length === 1 ? "borrow" : "borrows"} out
              </p>
            </div>
            <p className="text-[13.5px] text-slate leading-snug">
              A student is returning this item. Closes the open borrow on their
              account.
            </p>
          </button>
        </div>

        {/* Optional context — units actually on the shelf */}
        {sku.maintenance_units + sku.lost_units > 0 && (
          <p className="inline-flex items-center gap-2 font-mono uppercase text-caps-sm text-slate/70 tracking-[0.08em]">
            <Inbox size={13} strokeWidth={1.75} />
            {sku.maintenance_units > 0 &&
              `${sku.maintenance_units} in maintenance`}
            {sku.maintenance_units > 0 && sku.lost_units > 0 && " · "}
            {sku.lost_units > 0 && `${sku.lost_units} lost`}
          </p>
        )}
      </div>
    </Modal>
  );
}
