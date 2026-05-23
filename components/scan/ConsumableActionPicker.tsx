"use client";

import { ArrowRight, Beaker, Ticket } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { PhotoFrame } from "@/components/catalog/PhotoFrame";
import type { ConsumableScanTarget } from "@/lib/supabase/queries/scan";

type Props = {
  open: boolean;
  onClose: () => void;
  target: ConsumableScanTarget;
  /** Required — caller decides whether to show the tile based on
   *  `target.canVerify`. Hidden when no awaiting pickups. */
  onPickVerify: () => void;
  /** Required — caller decides whether to show the tile based on stock.
   *  Hidden when `total_remaining === 0`. */
  onPickUsage: () => void;
};

/**
 * Mirror of ActionPicker for consumables. Surfaced on /staff/scan when a
 * scanned consumable SKU has BOTH approved pickups awaiting AND stock left
 * to walk-in-dispense — so staff has to choose: am I releasing a reserved
 * batch to a specific student, or just dispensing supplies to a walk-in?
 *
 * The shell skips this picker when only one option is valid (auto-routes).
 */
export function ConsumableActionPicker({
  open,
  onClose,
  target,
  onPickVerify,
  onPickUsage,
}: Props) {
  const { sku, awaitingPickup } = target;
  const showVerify = awaitingPickup.length > 0;
  const showUsage = sku.total_remaining > 0;
  const tileCount = (showVerify ? 1 : 0) + (showUsage ? 1 : 0);
  const gridCols = tileCount >= 2 ? "sm:grid-cols-2" : "";

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
          This item has an approved pickup waiting AND stock available for
          walk-in dispensing. Pick what&apos;s happening at the counter right now.
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
                Student is here with a pickup code. Verify and release the
                approved units.
              </p>
            </button>
          )}

          {showUsage && (
            <button
              type="button"
              onClick={onPickUsage}
              className="group text-left rounded border-[1.5px] border-teal bg-teal/5 hover:bg-teal/10 transition-colors px-5 py-5 flex flex-col gap-3"
            >
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 font-mono uppercase text-caps-sm font-bold tracking-[0.1em] text-teal-deep">
                  <Beaker size={13} strokeWidth={2} />
                  Log walk-in usage
                </span>
                <ArrowRight
                  size={16}
                  strokeWidth={2}
                  className="text-teal group-hover:translate-x-0.5 transition-transform"
                />
              </div>
              <div>
                <p className="font-display italic font-extrabold text-[44px] text-navy leading-none">
                  {sku.total_remaining}
                </p>
                <p className="mt-1 font-mono uppercase text-caps-sm text-slate tracking-[0.08em]">
                  {sku.unit ?? "units"} in stock
                </p>
              </div>
              <p className="text-[13.5px] text-slate leading-snug">
                Dispense to a student without a pending request. Deducts from
                the oldest active lot (FIFO).
              </p>
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
}
