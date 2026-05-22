"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { AlertTriangle, ArrowRight, Check } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { logReturn } from "@/app/staff/actions";
import type { OpenBorrowRow } from "@/lib/supabase/queries/staff-requests";

type Props = {
  open: boolean;
  onClose: () => void;
  sku: { qr_code: string; name: string };
  openBorrows: OpenBorrowRow[];
};

function formatBorrowed(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function formatDue(iso: string): {
  text: string;
  alert: boolean;
} {
  const todayMid = new Date();
  todayMid.setHours(0, 0, 0, 0);
  const due = new Date(`${iso}T00:00:00`);
  const days = Math.round((due.getTime() - todayMid.getTime()) / 86_400_000);
  if (days < 0) return { text: `${Math.abs(days)}d overdue`, alert: true };
  if (days === 0) return { text: "Due today", alert: true };
  if (days === 1) return { text: "Due tomorrow", alert: false };
  return {
    text: `Due ${due.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    })} · ${days}d`,
    alert: false,
  };
}

export function ReturnModal({ open, onClose, sku, openBorrows }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(
    openBorrows.length === 1 ? openBorrows[0].id : null,
  );

  // Reset on re-open.
  useEffect(() => {
    if (!open) return;
    setError(null);
    setSelectedId(openBorrows.length === 1 ? openBorrows[0].id : null);
  }, [open, openBorrows]);

  const selected = openBorrows.find((b) => b.id === selectedId) ?? null;
  const canSubmit = !pending && !!selected;

  function handleConfirm() {
    if (!canSubmit || !selected) return;
    setError(null);
    startTransition(async () => {
      const res = await logReturn({ transaction_id: selected.id });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      onClose();
      router.refresh();
    });
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      eyebrow="LOG RETURN"
      title={`Return ${sku.qr_code}`}
      status={pending ? "WORKING" : "READY"}
      size={openBorrows.length > 1 ? "wide" : "default"}
      footer={
        <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="text-navy text-[15px] font-bold hover:underline underline-offset-4 decoration-teal decoration-2 sm:px-3"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!canSubmit}
            className="inline-flex items-center justify-center gap-2 bg-teal text-white font-mono uppercase text-[15px] tracking-[0.12em] font-bold px-6 py-3.5 rounded transition-colors hover:bg-teal-deep active:bg-navy-deep disabled:opacity-40 disabled:pointer-events-none"
          >
            {pending ? "Working…" : "Confirm return"}
            <ArrowRight size={18} strokeWidth={2} />
          </button>
        </div>
      }
    >
      <div className="flex flex-col gap-5">
        <div className="flex items-center gap-3 text-[14px] text-slate">
          <span className="font-mono uppercase text-caps-sm font-semibold tracking-[0.08em] text-navy">
            {sku.qr_code}
          </span>
          <span aria-hidden className="size-1 rounded-full bg-slate/40" />
          <span className="truncate text-navy font-semibold">{sku.name}</span>
        </div>

        {openBorrows.length === 0 ? (
          <div className="flex items-start gap-3 border-l-4 border-amber bg-paper rounded px-4 py-3 text-[14px] text-slate">
            <AlertTriangle size={18} strokeWidth={2} className="mt-0.5 shrink-0 text-amber" />
            <span>No open borrows for this item.</span>
          </div>
        ) : openBorrows.length === 1 && selected ? (
          <SingleBorrowSummary borrow={selected} />
        ) : (
          <div className="flex flex-col gap-2">
            <p className="font-mono uppercase text-caps-sm text-slate font-semibold tracking-[0.1em]">
              Pick the borrow being returned
            </p>
            <ul role="radiogroup" className="flex flex-col gap-2">
              {openBorrows.map((b) => (
                <li key={b.id}>
                  <BorrowRow
                    borrow={b}
                    selected={b.id === selectedId}
                    onSelect={() => setSelectedId(b.id)}
                  />
                </li>
              ))}
            </ul>
          </div>
        )}

        {error && (
          <div className="flex items-start gap-3 border-l-4 border-red bg-paper rounded px-4 py-3 text-[14px] text-red-deep">
            <AlertTriangle size={18} strokeWidth={2} className="mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}
      </div>
    </Modal>
  );
}

function SingleBorrowSummary({ borrow }: { borrow: OpenBorrowRow }) {
  const due = formatDue(borrow.expected_return_date);
  return (
    <div className="border-l-[3px] border-teal pl-4 py-1">
      <p className="font-display italic font-extrabold text-[20px] text-navy leading-tight">
        {borrow.student.full_name}
      </p>
      <p className="text-[13px] text-slate font-mono mt-0.5">
        {borrow.student.email}
        {borrow.student.year_section && (
          <span className="ml-2 uppercase">· {borrow.student.year_section}</span>
        )}
      </p>
      <p className="mt-2 font-mono uppercase text-caps-sm tracking-[0.08em] text-slate">
        Borrowed {formatBorrowed(borrow.borrowed_at)}
        <span aria-hidden className="mx-2">·</span>
        Qty {borrow.quantity}
        <span aria-hidden className="mx-2">·</span>
        <span className={due.alert ? "text-red-deep font-bold" : ""}>
          {due.text}
        </span>
      </p>
    </div>
  );
}

function BorrowRow({
  borrow,
  selected,
  onSelect,
}: {
  borrow: OpenBorrowRow;
  selected: boolean;
  onSelect: () => void;
}) {
  const due = formatDue(borrow.expected_return_date);
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      className={[
        "w-full text-left rounded border-[1.5px] px-4 py-3 transition-colors",
        selected
          ? "border-teal bg-teal/5"
          : "border-rule bg-paper hover:border-slate/60",
      ].join(" ")}
    >
      <div className="flex items-start gap-3">
        <span
          aria-hidden
          className={[
            "shrink-0 mt-1 size-4 rounded-full border-[1.5px] flex items-center justify-center",
            selected ? "border-teal bg-teal text-white" : "border-rule",
          ].join(" ")}
        >
          {selected && <Check size={11} strokeWidth={3} />}
        </span>
        <div className="flex-1 min-w-0">
          <p className="font-display italic font-extrabold text-[17px] text-navy leading-tight">
            {borrow.student.full_name}
          </p>
          <p className="text-[12.5px] text-slate font-mono mt-0.5 truncate">
            {borrow.student.email}
            {borrow.student.year_section && (
              <span className="ml-2 uppercase">
                · {borrow.student.year_section}
              </span>
            )}
          </p>
          <p className="mt-1.5 font-mono uppercase text-caps-sm tracking-[0.06em] text-slate">
            Borrowed {formatBorrowed(borrow.borrowed_at)}
            <span aria-hidden className="mx-2">·</span>
            Qty {borrow.quantity}
            <span aria-hidden className="mx-2">·</span>
            <span className={due.alert ? "text-red-deep font-bold" : ""}>
              {due.text}
            </span>
          </p>
        </div>
      </div>
    </button>
  );
}
