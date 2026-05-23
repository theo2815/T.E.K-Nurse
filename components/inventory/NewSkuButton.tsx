"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { NewSkuChooserModal } from "@/components/inventory/NewSkuChooserModal";

export function NewSkuButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={open}
        className="inline-flex items-center justify-center gap-2 bg-teal text-white font-mono uppercase text-[14px] tracking-[0.12em] font-bold px-5 py-3 rounded transition-colors hover:bg-teal-deep active:bg-navy-deep"
      >
        <Plus size={16} strokeWidth={2} />
        New SKU
      </button>
      <NewSkuChooserModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}
