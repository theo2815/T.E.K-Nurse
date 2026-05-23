"use client";

import { useState } from "react";
import { useProgressRouter } from "@/lib/use-progress-router";
import { AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import {
  bulkDeleteSkus,
  type BulkDeleteFailure,
} from "@/app/staff/inventory/actions";

const PREVIEW_LIMIT = 8;

type Props = {
  open: boolean;
  onClose: () => void;
  type: "equipment" | "consumable";
  items: { id: string; name: string }[];
  onSuccess: () => void;
};

export function BulkDeleteModal({ open, onClose, type, items, onSuccess }: Props) {
  const router = useProgressRouter();
  const [submitting, setSubmitting] = useState(false);
  const [failures, setFailures] = useState<BulkDeleteFailure[]>([]);
  const [error, setError] = useState<string | null>(null);

  const total = items.length;
  const preview = items.slice(0, PREVIEW_LIMIT);
  const overflow = total - preview.length;

  function handleClose() {
    if (submitting) return;
    setFailures([]);
    setError(null);
    onClose();
  }

  async function onConfirm() {
    setError(null);
    setFailures([]);
    setSubmitting(true);
    const res = await bulkDeleteSkus({ type, items });
    setSubmitting(false);

    if (!res.ok) {
      setError(res.error);
      return;
    }

    const { deleted, failed } = res.data;

    if (failed.length === 0) {
      toast.success(`${deleted.length} SKU${deleted.length === 1 ? "" : "s"} deleted.`);
      onSuccess();
      router.refresh();
      onClose();
      return;
    }

    if (deleted.length === 0) {
      // Total failure — stay open and surface each blocker inline.
      setFailures(failed);
      return;
    }

    // Partial — close + show a rich toast with the breakdown.
    toast(
      <div className="flex flex-col gap-2">
        <p className="font-mono uppercase text-[12px] tracking-[0.1em] font-bold text-navy">
          {deleted.length} deleted · {failed.length} couldn&apos;t be removed
        </p>
        <ul className="text-[13px] text-slate leading-snug flex flex-col gap-1">
          {failed.map((f) => (
            <li key={f.id} className="flex flex-col">
              <span className="font-semibold text-navy">{f.name}</span>
              <span>{f.reason}</span>
            </li>
          ))}
        </ul>
      </div>,
      { duration: 8000 },
    );
    onSuccess();
    router.refresh();
    onClose();
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={`Delete ${total} SKU${total === 1 ? "" : "s"}?`}
      eyebrow="BULK DELETE"
      status={submitting ? "WORKING" : "READY"}
      footer={
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleClose}
            disabled={submitting}
            className="text-navy text-[15px] font-bold px-1 py-0.5 hover:underline underline-offset-4 decoration-teal decoration-2 disabled:opacity-40"
          >
            Cancel
          </button>
          <Button
            type="button"
            variant="danger"
            onClick={onConfirm}
            disabled={total === 0}
            loading={submitting}
          >
            Delete permanently
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-4">
        <div className="border-l-[3px] border-red-deep bg-red-deep/5 px-4 py-3 rounded text-[14px] text-red-deep">
          This deletes the selected SKUs permanently. Each one only succeeds when no requests, borrows, usage records, or active lots reference it.
        </div>

        <div>
          <p className="font-mono uppercase text-caps-sm text-slate tracking-[0.1em] mb-2">
            Selected
          </p>
          <ul className="flex flex-col gap-1 text-[14px] text-navy">
            {preview.map((it) => (
              <li key={it.id} className="truncate">
                · {it.name}
              </li>
            ))}
            {overflow > 0 && (
              <li className="text-slate italic">
                + {overflow} more
              </li>
            )}
          </ul>
        </div>

        {failures.length > 0 && (
          <div className="border-l-[3px] border-red-deep bg-red-deep/5 px-4 py-3 rounded flex flex-col gap-2 text-red-deep">
            <div className="flex items-center gap-2">
              <AlertTriangle size={16} strokeWidth={2} className="shrink-0" />
              <p className="text-[14px] font-bold">
                Nothing was deleted — every selected SKU is still referenced.
              </p>
            </div>
            <ul className="text-[13px] flex flex-col gap-1.5 pl-6">
              {failures.map((f) => (
                <li key={f.id} className="flex flex-col">
                  <span className="font-semibold">{f.name}</span>
                  <span>{f.reason}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

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
