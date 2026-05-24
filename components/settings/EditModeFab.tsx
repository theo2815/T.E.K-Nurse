"use client";

import { Check, Loader2, Pencil, X } from "lucide-react";

type Props = {
  isEditing: boolean;
  pending: boolean;
  onEdit: () => void;
  onCancel: () => void;
  onSave: () => void;
};

/**
 * Floating action bar for /staff/settings + /student/settings.
 *
 * View mode  → single circular pencil FAB (teal) bottom-right.
 * Edit mode  → floating pill with [✕ Cancel] | [✓ Save changes].
 *
 * Mobile vertical math: BottomNav is `h-16` (64px) plus
 * `env(safe-area-inset-bottom)` (≈34px on iPhone with home indicator). A
 * hardcoded `bottom-24` (96px) ends up flush against — or inside — the
 * nav in installed-PWA mode. Safe-area-aware calc keeps the FAB exactly
 * 20px above the nav's visible top edge on every device:
 *   bottom = env(safe-area-inset-bottom) + 64 (nav) + 20 (breathing) = +84
 * Desktop has no BottomNav, just SideNav on the left — fixed 32px is fine.
 */
export function EditModeFab({
  isEditing,
  pending,
  onEdit,
  onCancel,
  onSave,
}: Props) {
  if (!isEditing) {
    return (
      <button
        type="button"
        onClick={onEdit}
        aria-label="Edit settings"
        className="fixed bottom-[calc(env(safe-area-inset-bottom,0px)+84px)] md:bottom-8 right-6 md:right-8 z-30 size-14 md:size-16 rounded-fab bg-teal text-white shadow-[0_4px_20px_-2px_rgba(31,58,110,0.25)] hover:bg-teal-deep transition-colors flex items-center justify-center"
      >
        <Pencil size={22} strokeWidth={2.25} />
      </button>
    );
  }

  return (
    <div
      role="group"
      aria-label="Edit actions"
      className="fixed bottom-[calc(env(safe-area-inset-bottom,0px)+84px)] md:bottom-8 right-6 md:right-8 z-30 flex items-stretch rounded-fab bg-paper border-[1.5px] border-navy shadow-[0_4px_20px_-2px_rgba(31,58,110,0.25)] overflow-hidden"
    >
      <button
        type="button"
        onClick={onCancel}
        disabled={pending}
        aria-label="Cancel edits"
        className="flex items-center gap-2 px-4 md:px-5 py-3 text-navy hover:bg-mist transition-colors disabled:opacity-40 disabled:pointer-events-none font-mono uppercase text-caps-sm tracking-[0.12em] font-bold"
      >
        <X size={16} strokeWidth={2.5} />
        Cancel
      </button>
      <button
        type="button"
        onClick={onSave}
        disabled={pending}
        aria-busy={pending || undefined}
        aria-label="Save changes"
        className="flex items-center gap-2 px-5 md:px-6 py-3 bg-teal text-white hover:bg-teal-deep transition-colors disabled:opacity-60 disabled:pointer-events-none font-mono uppercase text-caps-sm tracking-[0.12em] font-bold"
      >
        {pending ? (
          <Loader2 size={16} strokeWidth={2.5} className="animate-spin" />
        ) : (
          <Check size={16} strokeWidth={2.5} />
        )}
        Save changes
      </button>
    </div>
  );
}
