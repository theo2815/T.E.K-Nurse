"use client";

import { useProgressRouter } from "@/lib/use-progress-router";
import { useEffect, useState, useTransition } from "react";
import { AlertTriangle, X as XIcon } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import {
  declineBorrowRequest,
  declineConsumableRequest,
} from "@/app/staff/actions";

const MIN_REASON = 3;
const MAX_REASON = 280;

type Props = {
  open: boolean;
  onClose: () => void;
  type: "equipment" | "consumable";
  request_id: string;
  /** Shown in the item summary line for confirmation context. */
  sku: { qr_code: string; name: string };
  student_name: string;
};

export function DeclineRequestModal({
  open,
  onClose,
  type,
  request_id,
  sku,
  student_name,
}: Props) {
  const router = useProgressRouter();
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!open) {
      setReason("");
      setError(null);
    }
  }, [open]);

  const trimmedLen = reason.trim().length;
  const tooShort = trimmedLen < MIN_REASON;
  const tooLong = trimmedLen > MAX_REASON;
  const canSubmit = !tooShort && !tooLong && !pending;

  function handleConfirm() {
    if (!canSubmit) return;
    setError(null);
    startTransition(async () => {
      const action =
        type === "equipment" ? declineBorrowRequest : declineConsumableRequest;
      const result = await action({ request_id, reason: reason.trim() });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      onClose();
      router.refresh();
    });
  }

  const counterTone = tooLong
    ? "text-red-deep font-semibold"
    : trimmedLen >= MIN_REASON
    ? "text-slate"
    : "text-slate/60";

  return (
    <Modal
      open={open}
      onClose={onClose}
      eyebrow="DECLINE REQUEST"
      title="Decline this request?"
      status={pending ? "WORKING" : "READY"}
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
            variant="danger"
            onClick={handleConfirm}
            disabled={!canSubmit}
            loading={pending}
            className="!py-3.5"
          >
            {!pending && <XIcon size={18} strokeWidth={2} />}
            Decline request
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-5">
        {/* Item + student summary */}
        <div className="flex flex-col gap-1 text-[14px]">
          <div className="flex items-center gap-3 text-slate">
            <span className="font-mono uppercase text-caps-sm font-semibold tracking-[0.08em] text-navy">
              {sku.qr_code}
            </span>
            <span aria-hidden className="size-1 rounded-full bg-slate/40" />
            <span className="truncate text-navy font-semibold">{sku.name}</span>
          </div>
          <p className="text-slate">
            Student:{" "}
            <span className="font-display italic font-extrabold text-[17px] text-navy">
              {student_name}
            </span>
          </p>
        </div>

        {/* Warning callout */}
        <div className="border-l-4 border-red-deep bg-paper rounded-r p-4 flex gap-3">
          <AlertTriangle
            size={18}
            strokeWidth={2}
            className="text-red-deep shrink-0 mt-0.5"
          />
          <p className="text-[14px] text-slate leading-relaxed">
            This is final. The reservation will be released, and the student
            will be notified by email + in-app with the reason you write below.
          </p>
        </div>

        {/* Reason textarea */}
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="decline-reason"
            className="text-[15px] text-slate font-bold uppercase tracking-[0.08em]"
          >
            Reason
            <span aria-hidden className="text-teal ml-1">
              *
            </span>
          </label>
          <textarea
            id="decline-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            maxLength={MAX_REASON + 40}
            rows={3}
            placeholder="e.g. Item reserved for class demo on Friday — please re-request next week."
            className="w-full rounded border-[1.5px] border-rule bg-white py-3 px-4 text-[15px] text-navy placeholder:text-slate/50 transition-colors focus:outline-none focus:border-teal resize-y"
          />
          <div className="flex items-center justify-between gap-3">
            <p className="text-[13px] text-slate">
              At least {MIN_REASON} characters. Visible to the student.
            </p>
            <p
              className={`font-mono text-[12px] tracking-[0.04em] ${counterTone}`}
            >
              {trimmedLen}/{MAX_REASON}
            </p>
          </div>
        </div>

        {error && (
          <div className="border-l-[3px] border-red-deep pl-3 py-1">
            <p className="text-[14px] text-red-deep font-medium">{error}</p>
          </div>
        )}
      </div>
    </Modal>
  );
}
