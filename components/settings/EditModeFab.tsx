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
 * Fixed positioning with mobile bottom-nav clearance (the lab uses a PWA
 * with BottomNav on mobile; bottom-24 keeps the FAB above it). z-30 keeps
 * it above page content but below modals + toasts.
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
        className="fixed bottom-24 md:bottom-8 right-6 md:right-8 z-30 size-14 md:size-16 rounded-fab bg-teal text-white shadow-[0_4px_20px_-2px_rgba(31,58,110,0.25)] hover:bg-teal-deep transition-colors flex items-center justify-center"
      >
        <Pencil size={22} strokeWidth={2.25} />
      </button>
    );
  }

  return (
    <div
      role="group"
      aria-label="Edit actions"
      className="fixed bottom-24 md:bottom-8 right-6 md:right-8 z-30 flex items-stretch rounded-fab bg-paper border-[1.5px] border-navy shadow-[0_4px_20px_-2px_rgba(31,58,110,0.25)] overflow-hidden"
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
