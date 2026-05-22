"use client";

import { useState } from "react";
import { ArrowRight, Inbox, Undo2 } from "lucide-react";
import { LendModal } from "@/components/staff/LendModal";
import { ReturnModal } from "@/components/staff/ReturnModal";
import { OverrideModal } from "@/components/staff/OverrideModal";
import type { EquipmentSku } from "@/lib/supabase/queries/equipment";
import type {
  OpenBorrowRow,
  StaffPendingRequestRow,
} from "@/lib/supabase/queries/staff-requests";

type Props = {
  sku: Pick<
    EquipmentSku,
    | "id"
    | "qr_code"
    | "name"
    | "photo_url"
    | "location"
    | "total_units"
    | "available_units"
    | "reserved_units"
    | "borrowed_units"
  >;
  openBorrows?: OpenBorrowRow[];
  pendingRequests?: StaffPendingRequestRow[];
};

export function StaffEquipmentActions({
  sku,
  openBorrows = [],
  pendingRequests = [],
}: Props) {
  const [lendOpen, setLendOpen] = useState(false);
  const [returnOpen, setReturnOpen] = useState(false);
  const [overrideOpen, setOverrideOpen] = useState(false);

  const noStock = sku.available_units === 0 && sku.reserved_units === 0;
  const fullyReserved = sku.available_units === 0 && sku.reserved_units > 0;
  const lendLabel = noStock
    ? "Lend"
    : fullyReserved
    ? "Lend · review reservations"
    : "Lend to student";

  const hasOpenBorrows = openBorrows.length > 0;

  function handleLendClick() {
    // When fully reserved + we have pendings, open Override directly.
    if (fullyReserved && pendingRequests.length > 0) {
      setOverrideOpen(true);
    } else {
      setLendOpen(true);
    }
  }

  function handleLendOverrideRequest() {
    // Fired from inside the Lend modal when user clicks "Open override".
    setLendOpen(false);
    requestAnimationFrame(() => setOverrideOpen(true));
  }

  return (
    <div className="flex flex-col gap-3">
      <button
        type="button"
        onClick={handleLendClick}
        disabled={noStock}
        className="inline-flex items-center justify-center gap-2 bg-teal text-white font-mono uppercase text-[15px] tracking-[0.12em] font-bold px-6 py-4 rounded transition-colors hover:bg-teal-deep active:bg-navy-deep disabled:opacity-40 disabled:pointer-events-none w-full"
      >
        {lendLabel}
        {!noStock && <ArrowRight size={18} strokeWidth={2} />}
      </button>

      {hasOpenBorrows && (
        <button
          type="button"
          onClick={() => setReturnOpen(true)}
          className="inline-flex items-center justify-center gap-2 bg-transparent text-navy border-[1.5px] border-navy font-mono uppercase text-[14px] tracking-[0.12em] font-bold px-6 py-3 rounded transition-colors hover:bg-navy hover:text-white w-full"
        >
          <Undo2 size={16} strokeWidth={2} />
          Log return ·{" "}
          <span className="font-display italic font-extrabold text-[16px] not-uppercase tracking-normal">
            {openBorrows.length}
          </span>{" "}
          out
        </button>
      )}

      {noStock && (
        <p className="inline-flex items-center gap-2 text-[13px] text-slate italic">
          <Inbox size={14} strokeWidth={1.75} />
          No units to lend right now.
        </p>
      )}

      <LendModal
        mode="walk-in"
        open={lendOpen}
        onClose={() => setLendOpen(false)}
        sku={sku}
        onOverrideRequest={
          pendingRequests.length > 0 ? handleLendOverrideRequest : undefined
        }
      />

      <ReturnModal
        open={returnOpen}
        onClose={() => setReturnOpen(false)}
        sku={sku}
        openBorrows={openBorrows}
      />

      <OverrideModal
        open={overrideOpen}
        onClose={() => setOverrideOpen(false)}
        sku={sku}
        pendingRequests={pendingRequests}
      />
    </div>
  );
}
