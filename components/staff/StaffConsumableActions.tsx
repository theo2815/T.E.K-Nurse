"use client";

import { useState } from "react";
import { ArrowRight, Inbox } from "lucide-react";
import { LogUsageModal } from "@/components/staff/LogUsageModal";
import type { ConsumableSkuWithStock } from "@/lib/supabase/queries/consumables";

type Props = {
  sku: Pick<
    ConsumableSkuWithStock,
    | "id"
    | "qr_code"
    | "name"
    | "photo_url"
    | "unit"
    | "total_remaining"
    | "per_request_max_quantity"
  >;
};

export function StaffConsumableActions({ sku }: Props) {
  const [open, setOpen] = useState(false);
  const noStock = sku.total_remaining === 0;

  return (
    <div className="flex flex-col gap-3">
      <button
        type="button"
        onClick={() => setOpen(true)}
        disabled={noStock}
        className="inline-flex items-center justify-center gap-2 bg-teal text-white font-mono uppercase text-[15px] tracking-[0.12em] font-bold px-6 py-4 rounded transition-colors hover:bg-teal-deep active:bg-navy-deep disabled:opacity-40 disabled:pointer-events-none w-full"
      >
        Log usage
        {!noStock && <ArrowRight size={18} strokeWidth={2} />}
      </button>

      {noStock && (
        <p className="inline-flex items-center gap-2 text-[13px] text-slate italic">
          <Inbox size={14} strokeWidth={1.75} />
          Stock is depleted.
        </p>
      )}

      <LogUsageModal
        mode="walk-in"
        open={open}
        onClose={() => setOpen(false)}
        sku={sku}
      />
    </div>
  );
}
