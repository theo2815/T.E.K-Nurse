"use client";

import { useState } from "react";
import { AlertTriangle } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import type { ConsumableLot } from "@/lib/supabase/queries/consumables";
import { markLotDepleted } from "@/app/staff/inventory/actions";

const MIN = 3;
const MAX = 280;

export function MarkLotDepletedModal({
  open,
  onClose,
  lot,
  onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  lot: ConsumableLot;
  onSuccess?: () => void;
}) {
  // Parent unmounts/remounts on open/close (LotList conditionally renders us),
  // so initial state is fresh on every open.
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const trimmed = reason.trim();
  const tooShort = trimmed.length < MIN;
  const tooLong = trimmed.length > MAX;
  const canSubmit = !submitting && !tooShort && !tooLong;

  async function onSubmit() {
    setError(null);
    setSubmitting(true);
    const res = await markLotDepleted({ lot_id: lot.id, reason: trimmed });
    setSubmitting(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    onSuccess?.();
    onClose();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Mark lot depleted"
      eyebrow="MARK DEPLETED"
      status={submitting ? "WORKING" : "READY"}
      footer={
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="text-navy text-[15px] font-bold px-1 py-0.5 hover:underline underline-offset-4 decoration-teal decoration-2"
          >
            Cancel
          </button>
          <Button
            type="button"
            variant="primary"
            disabled={!canSubmit}
            loading={submitting}
            onClick={onSubmit}
          >
            Mark depleted
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-5">
        <div className="border-l-[3px] border-red-deep bg-red-deep/5 px-4 py-3 rounded text-[14px] text-red-deep">
          Flushes <strong>{lot.quantity_remaining}</strong> remaining {lot.quantity_remaining === 1 ? "unit" : "units"} to zero and marks the lot depleted. The FIFO trigger will skip this lot going forward.
        </div>

        <div className="text-[14px] text-slate">
          <span className="font-mono uppercase text-caps-sm font-semibold tracking-[0.1em]">
            Lot
          </span>
          <span className="ml-2 font-mono text-[14px] text-navy uppercase tracking-[0.06em] font-semibold">
            {lot.lot_number ?? lot.id.slice(0, 8)}
          </span>
          <span className="ml-2 text-slate">
            · expires {lot.expiration_date}
          </span>
        </div>

        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="depletion-reason"
            className="text-[15px] text-slate font-bold uppercase tracking-[0.08em]"
          >
            Reason
            <span aria-hidden className="text-teal ml-1">*</span>
          </label>
          <textarea
            id="depletion-reason"
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Spilled, expired in place, written off, etc."
            className="w-full rounded border-[1.5px] border-rule bg-white py-3 px-4 text-navy placeholder:text-slate/60 focus:outline-none focus:border-teal text-[15px] leading-relaxed"
          />
          <p className="font-mono uppercase text-caps-sm text-slate tracking-[0.08em]">
            {trimmed.length}/{MAX}
          </p>
        </div>

        {error && (
          <div className="border-l-[3px] border-red-deep bg-red-deep/5 px-4 py-3 rounded inline-flex items-start gap-2.5 text-red-deep">
            <AlertTriangle size={16} strokeWidth={2} className="mt-0.5 shrink-0" />
            <p className="text-[14px] font-medium">{error}</p>
          </div>
        )}
      </div>
    </Modal>
  );
}
