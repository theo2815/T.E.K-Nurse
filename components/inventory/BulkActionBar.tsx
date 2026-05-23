"use client";

import { Trash2, X } from "lucide-react";

export function BulkActionBar({
  count,
  onClear,
  onDelete,
}: {
  count: number;
  onClear: () => void;
  onDelete: () => void;
}) {
  if (count === 0) return null;

  return (
    <div
      role="region"
      aria-label="Bulk actions"
      className="fixed left-0 right-0 z-30 bg-paper border-t-[1.5px] border-rule bottom-[calc(4rem+env(safe-area-inset-bottom,0px))] md:bottom-0"
    >
      <div className="mx-auto max-w-5xl px-4 md:px-12 py-3 flex items-center justify-between gap-3">
        <p
          aria-live="polite"
          className="font-mono uppercase text-caps-sm tracking-[0.1em] font-bold text-navy"
        >
          {count} selected
        </p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onClear}
            className="inline-flex items-center gap-1.5 text-navy text-[14px] font-semibold px-3 py-2 rounded hover:underline underline-offset-4 decoration-teal decoration-2"
          >
            <X size={14} strokeWidth={2} aria-hidden />
            Clear
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="inline-flex items-center justify-center gap-2 bg-red-deep text-white font-mono uppercase text-[13px] md:text-[14px] tracking-[0.1em] font-bold px-4 md:px-5 py-2.5 md:py-3 rounded transition-colors hover:bg-red active:bg-red-deep"
          >
            <Trash2 size={14} strokeWidth={2} aria-hidden />
            Delete {count}
          </button>
        </div>
      </div>
    </div>
  );
}
