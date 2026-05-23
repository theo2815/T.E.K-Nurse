"use client";

import { useProgressRouter } from "@/lib/use-progress-router";
import { useEffect, useState, useTransition } from "react";
import {
  AlertTriangle,
  ArrowRight,
  Check,
  CircleCheck,
  Wrench,
  CircleX,
} from "lucide-react";
import { toast } from "sonner";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { PhotoFrame } from "@/components/catalog/PhotoFrame";
import { logReturn, type ReturnCondition } from "@/app/staff/actions";
import type { OpenBorrowRow } from "@/lib/supabase/queries/staff-requests";

export type ReturnSuccessActivity = {
  kind: "return";
  sku: { qr_code: string; name: string; photo_url: string | null };
  student: { full_name: string };
  quantity: number;
  condition: ReturnCondition;
  at: number;
};

type Props = {
  open: boolean;
  onClose: () => void;
  /** When provided, renders the modal's chevron-left back affordance — used
   *  when this modal was opened from the equipment ActionPicker. */
  onBack?: () => void;
  sku: { qr_code: string; name: string; photo_url: string | null };
  openBorrows: OpenBorrowRow[];
  onSuccess?: (activity: ReturnSuccessActivity) => void;
};

const CONDITIONS: Array<{
  value: ReturnCondition;
  label: string;
  hint: string;
  Icon: typeof CircleCheck;
  tone: "good" | "warn" | "alert";
}> = [
  {
    value: "GOOD",
    label: "Good",
    hint: "Back on the shelf, ready to lend again.",
    Icon: CircleCheck,
    tone: "good",
  },
  {
    value: "DAMAGED",
    label: "Damaged",
    hint: "Flag for maintenance — pulled from the lendable shelf.",
    Icon: Wrench,
    tone: "warn",
  },
  {
    value: "LOST_ON_RETURN",
    label: "Lost or missing",
    hint: "Student didn't bring it back. Counted as lost.",
    Icon: CircleX,
    tone: "alert",
  },
];

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

export function ReturnModal({
  open,
  onClose,
  onBack,
  sku,
  openBorrows,
  onSuccess,
}: Props) {
  const router = useProgressRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(
    openBorrows.length === 1 ? openBorrows[0].id : null,
  );
  const [condition, setCondition] = useState<ReturnCondition>("GOOD");

  // Reset on re-open.
  useEffect(() => {
    if (!open) return;
    setError(null);
    setSelectedId(openBorrows.length === 1 ? openBorrows[0].id : null);
    setCondition("GOOD");
  }, [open, openBorrows]);

  const selected = openBorrows.find((b) => b.id === selectedId) ?? null;
  const canSubmit = !pending && !!selected;
  const isLost = condition === "LOST_ON_RETURN";
  const confirmLabel =
    condition === "DAMAGED"
      ? "Confirm return · damaged"
      : isLost
      ? "Mark as lost"
      : "Confirm return";

  function handleConfirm() {
    if (!canSubmit || !selected) return;
    setError(null);
    startTransition(async () => {
      const res = await logReturn({
        transaction_id: selected.id,
        condition,
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      const qty = selected.quantity;
      const studentName = selected.student.full_name;
      const toastTitle =
        condition === "DAMAGED"
          ? `Returned ${sku.qr_code} (damaged)`
          : condition === "LOST_ON_RETURN"
          ? `Reported ${sku.qr_code} lost`
          : `Returned ${sku.qr_code}`;
      const toastDesc =
        condition === "DAMAGED"
          ? `From ${studentName} · ${qty} unit${qty === 1 ? "" : "s"} → maintenance`
          : condition === "LOST_ON_RETURN"
          ? `From ${studentName} · ${qty} unit${qty === 1 ? "" : "s"} → lost`
          : `From ${studentName} · ${qty} unit${qty === 1 ? "" : "s"}`;
      if (condition === "LOST_ON_RETURN") {
        toast.warning(toastTitle, { description: toastDesc });
      } else {
        toast.success(toastTitle, { description: toastDesc });
      }
      onSuccess?.({
        kind: "return",
        sku: {
          qr_code: sku.qr_code,
          name: sku.name,
          photo_url: sku.photo_url,
        },
        student: { full_name: studentName },
        quantity: qty,
        condition,
        at: Date.now(),
      });
      onClose();
      router.refresh();
    });
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      onBack={onBack}
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
          <Button
            type="button"
            variant={isLost ? "danger" : "primary"}
            onClick={handleConfirm}
            disabled={!canSubmit}
            loading={pending}
            className="!py-3.5"
          >
            {confirmLabel}
            <ArrowRight size={18} strokeWidth={2} />
          </Button>
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

        {openBorrows.length > 0 && (
          <ConditionPicker value={condition} onChange={setCondition} />
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

function ConditionPicker({
  value,
  onChange,
}: {
  value: ReturnCondition;
  onChange: (v: ReturnCondition) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <p className="font-mono uppercase text-caps-sm text-slate font-semibold tracking-[0.1em]">
        Condition
      </p>
      <ul role="radiogroup" aria-label="Return condition" className="flex flex-col gap-2">
        {CONDITIONS.map(({ value: v, label, hint, Icon, tone }) => {
          const selected = v === value;
          const borderClass = selected
            ? tone === "alert"
              ? "border-red-deep bg-red-deep/5"
              : tone === "warn"
              ? "border-amber bg-amber/10"
              : "border-teal bg-teal/5"
            : "border-rule bg-paper hover:border-slate/60";
          const iconClass = selected
            ? tone === "alert"
              ? "text-red-deep"
              : tone === "warn"
              ? "text-amber"
              : "text-teal"
            : "text-slate/60";
          const dotClass = selected
            ? tone === "alert"
              ? "border-red-deep bg-red-deep text-white"
              : tone === "warn"
              ? "border-amber bg-amber text-white"
              : "border-teal bg-teal text-white"
            : "border-rule";
          return (
            <li key={v}>
              <button
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => onChange(v)}
                className={`w-full text-left rounded border-[1.5px] px-4 py-3 transition-colors flex items-start gap-3 ${borderClass}`}
              >
                <span
                  aria-hidden
                  className={`shrink-0 mt-1 size-4 rounded-full border-[1.5px] flex items-center justify-center ${dotClass}`}
                >
                  {selected && <Check size={11} strokeWidth={3} />}
                </span>
                <Icon
                  size={18}
                  strokeWidth={1.75}
                  className={`shrink-0 mt-0.5 ${iconClass}`}
                />
                <div className="flex-1 min-w-0">
                  <p className="font-display italic font-extrabold text-[17px] text-navy leading-tight">
                    {label}
                  </p>
                  <p className="text-[13px] text-slate leading-snug mt-0.5">
                    {hint}
                  </p>
                </div>
              </button>
            </li>
          );
        })}
      </ul>
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
