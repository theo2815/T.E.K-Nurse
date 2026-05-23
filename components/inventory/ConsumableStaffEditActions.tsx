"use client";

import Link from "next/link";
import { useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import type { ConsumableSku } from "@/lib/supabase/queries/consumables";
import { DeleteSkuModal } from "./DeleteSkuModal";

export function ConsumableStaffEditActions({ sku }: { sku: ConsumableSku }) {
  const [deleteOpen, setDeleteOpen] = useState(false);

  return (
    <>
      <div className="flex flex-col gap-2">
        <Link
          href={`/staff/inventory/consumables/${encodeURIComponent(sku.qr_code)}/edit`}
          className="inline-flex items-center justify-center gap-2 bg-transparent text-navy border-[1.5px] border-navy font-mono uppercase text-[14px] tracking-[0.12em] font-bold px-5 py-3 rounded transition-colors hover:bg-paper hover:border-teal hover:text-teal-deep"
        >
          <Pencil size={16} strokeWidth={1.75} />
          Edit SKU
        </Link>
        <button
          type="button"
          onClick={() => setDeleteOpen(true)}
          className="inline-flex items-center justify-center gap-2 bg-transparent text-red-deep border-[1.5px] border-red-deep/50 font-mono uppercase text-[14px] tracking-[0.12em] font-bold px-5 py-3 rounded transition-colors hover:bg-red-deep/5 hover:border-red-deep"
        >
          <Trash2 size={16} strokeWidth={1.75} />
          Delete SKU…
        </button>
      </div>

      <DeleteSkuModal
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        type="consumable"
        skuId={sku.id}
        skuName={sku.name}
      />
    </>
  );
}
