"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { AlertTriangle, X as XIcon } from "lucide-react";
import { toast } from "sonner";
import { Modal } from "@/components/ui/Modal";
import {
  expireBorrowRequest,
  expireConsumableRequest,
} from "@/app/staff/actions";

type Props = {
  type: "equipment" | "consumable";
  request_id: string;
  student_name: string;
  sku: { qr_code: string; name: string };
};

/**
 * Destructive action to manually expire an APPROVED request when a student
 * no-shows. Flips status APPROVED → EXPIRED, which (via DB trigger) frees the
 * equipment reservation, audits, and notifies the student.
 *
 * Lives on /staff/requests/[id] alongside the Verify & Release button until
 * the Phase 9 auto-expire cron is in place.
 */
export function CancelReservationAction({
  type,
  request_id,
  student_name,
  sku,
}: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleConfirm() {
    setError(null);
    startTransition(async () => {
      const res =
        type === "equipment"
          ? await expireBorrowRequest({ request_id })
          : await expireConsumableRequest({ request_id });

      if (!res.ok) {
        setError(res.error);
        return;
      }

      toast.success("Reservation released", {
        description: `${sku.qr_code} · ${student_name} was notified.`,
      });
      router.refresh();
      setOpen(false);
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center justify-center gap-2 border-[1.5px] border-rule bg-paper text-red-deep font-mono uppercase text-[15px] tracking-[0.12em] font-bold px-7 py-4 rounded whitespace-nowrap transition-colors hover:border-red-deep hover:bg-red-deep/5 w-full md:w-auto"
      >
        <XIcon size={18} strokeWidth={2} />
        Cancel reservation
      </button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        eyebrow="PICKUP · CANCEL"
        title="Cancel this reservation?"
        size="default"
        footer={
          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-navy text-[15px] font-bold hover:underline underline-offset-4 decoration-teal decoration-2 px-3 py-2"
            >
              Keep reservation
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={pending}
              className="inline-flex items-center justify-center gap-2 bg-red-deep text-white font-mono uppercase text-[15px] tracking-[0.12em] font-bold px-7 py-4 rounded whitespace-nowrap transition-colors hover:bg-red-deep/90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {pending ? "Cancelling…" : "Cancel reservation"}
            </button>
          </div>
        }
      >
        <div className="flex flex-col gap-4">
          <div className="border-l-[3px] border-amber bg-amber/5 px-4 py-3 flex items-start gap-3">
            <AlertTriangle
              size={18}
              strokeWidth={2}
              className="text-amber-700 shrink-0 mt-0.5"
            />
            <div className="text-[14px] text-slate leading-relaxed">
              <p className="font-semibold text-navy">
                {student_name} will lose this pickup code.
              </p>
              <p className="mt-1">
                Use this when the student no-shows and you need the units back
                on the shelf. They&apos;ll be notified that their reservation
                was released and can submit a new request.
              </p>
            </div>
          </div>

          <ul className="text-[14px] text-slate leading-relaxed space-y-1.5 pl-1">
            <li>
              <span className="font-semibold text-navy">{sku.qr_code}</span> ·{" "}
              {sku.name}
            </li>
            {type === "equipment" && (
              <li>Reserved units return to the lendable shelf immediately.</li>
            )}
            <li>The student is notified in-app.</li>
            <li>This action cannot be undone.</li>
          </ul>

          {error && (
            <p className="border-l-[3px] border-red-deep bg-red-deep/5 px-4 py-3 text-[14px] text-red-deep">
              {error}
            </p>
          )}
        </div>
      </Modal>
    </>
  );
}
