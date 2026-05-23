"use client";

import { useState } from "react";
import { useProgressRouter } from "@/lib/use-progress-router";
import { AlertTriangle } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import {
  deleteEquipmentSku,
  deleteConsumableSku,
} from "@/app/staff/inventory/actions";

type Props = {
  open: boolean;
  onClose: () => void;
  type: "equipment" | "consumable";
  skuId: string;
  skuName: string;
};

export function DeleteSkuModal({ open, onClose, type, skuId, skuName }: Props) {
  const router = useProgressRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onConfirm() {
    setError(null);
    setSubmitting(true);
    const res =
      type === "equipment"
        ? await deleteEquipmentSku(skuId)
        : await deleteConsumableSku(skuId);
    setSubmitting(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    router.push("/staff/inventory" + (type === "consumable" ? "?type=consumables" : ""));
    router.refresh();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Delete "${skuName}"?`}
      eyebrow="DELETE SKU"
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
            Delete permanently
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-4">
        <div className="border-l-[3px] border-red-deep bg-red-deep/5 px-4 py-3 rounded text-[14px] text-red-deep">
          This deletes the SKU permanently. It only succeeds when no requests, borrows, usage records, or active lots reference it.
        </div>
        <p className="text-[15px] text-slate leading-relaxed">
          For SKUs with history, the action will surface a friendly block message — nothing destructive happens to the audit trail.
        </p>
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
