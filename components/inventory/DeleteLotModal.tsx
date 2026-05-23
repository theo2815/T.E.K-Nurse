"use client";

import { useState } from "react";
import { useProgressRouter } from "@/lib/use-progress-router";
import { AlertTriangle } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import type { ConsumableLot } from "@/lib/supabase/queries/consumables";
import { deleteConsumableLot } from "@/app/staff/inventory/actions";

export function DeleteLotModal({
  open,
  onClose,
  lot,
}: {
  open: boolean;
  onClose: () => void;
  lot: ConsumableLot;
}) {
  const router = useProgressRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onConfirm() {
    setError(null);
    setSubmitting(true);
    const res = await deleteConsumableLot(lot.id);
    setSubmitting(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    router.refresh();
    onClose();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Delete this lot?"
      eyebrow="DELETE LOT"
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
            variant="danger"
            onClick={onConfirm}
            loading={submitting}
          >
            Delete lot
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-4">
        <div className="border-l-[3px] border-red-deep bg-red-deep/5 px-4 py-3 rounded text-[14px] text-red-deep">
          Deletes lot{" "}
          <strong className="font-mono uppercase tracking-[0.06em]">
            {lot.lot_number ?? lot.id.slice(0, 8)}
          </strong>{" "}
          permanently. Allowed only when no usage record references it; otherwise mark it depleted instead.
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
