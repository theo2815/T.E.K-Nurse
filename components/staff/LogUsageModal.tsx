"use client";

import { useProgressRouter } from "@/lib/use-progress-router";
import { useEffect, useState, useTransition } from "react";
import { AlertTriangle, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { QtyStepper } from "@/components/ui/QtyStepper";
import { PhotoFrame } from "@/components/catalog/PhotoFrame";
import { StudentPicker } from "@/components/staff/StudentPicker";
import {
  walkInConsumableUsage,
  approveConsumableRequest,
} from "@/app/staff/actions";
import type { StudentSearchRow } from "@/lib/supabase/queries/staff-requests";

export type UsageSuccessActivity = {
  kind: "usage";
  sku: { qr_code: string; name: string; photo_url: string | null; unit: string };
  student: { full_name: string };
  quantity: number;
  at: number;
};

type SkuShape = {
  id: string;
  qr_code: string;
  name: string;
  photo_url: string | null;
  unit: string;
  total_remaining: number;
  per_request_max_quantity: number;
};

type WalkInProps = {
  mode: "walk-in";
  sku: SkuShape;
  onSuccess?: (activity: UsageSuccessActivity) => void;
};

type ApproveProps = {
  mode: "approve";
  sku: SkuShape;
  request_id: string;
  prefill: {
    student: StudentSearchRow;
    quantity: number;
  };
  onApproved?: () => void;
};

type Props = (WalkInProps | ApproveProps) & {
  open: boolean;
  onClose: () => void;
  /** When provided, renders the modal's chevron-left back affordance — used
   *  when this modal was opened from the consumable ActionPicker. */
  onBack?: () => void;
};

export function LogUsageModal(props: Props) {
  const router = useProgressRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const isApprove = props.mode === "approve";

  const [student, setStudent] = useState<StudentSearchRow | null>(
    isApprove ? props.prefill.student : null,
  );
  const [quantity, setQuantity] = useState(
    isApprove ? props.prefill.quantity : 1,
  );

  useEffect(() => {
    if (!props.open) return;
    setError(null);
    if (isApprove) {
      setStudent(props.prefill.student);
      setQuantity(props.prefill.quantity);
    } else {
      setStudent(null);
      setQuantity(1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.open]);

  const maxQty = isApprove
    ? props.prefill.quantity
    : Math.max(
        1,
        Math.min(props.sku.per_request_max_quantity, props.sku.total_remaining),
      );

  const noStock = !isApprove && props.sku.total_remaining === 0;
  const shortStock =
    !isApprove && props.sku.total_remaining < props.sku.per_request_max_quantity;

  const overdueCount = student?.overdue_count ?? 0;
  const overdueBlocked = !isApprove && overdueCount > 0;

  const canSubmit =
    !pending &&
    !!student &&
    !overdueBlocked &&
    quantity >= 1 &&
    (isApprove || quantity <= props.sku.total_remaining);

  function handleConfirm() {
    if (!canSubmit) return;
    setError(null);

    startTransition(async () => {
      if (isApprove) {
        const res = await approveConsumableRequest({
          request_id: props.request_id,
        });
        if (!res.ok) {
          setError(res.error);
          return;
        }
        props.onApproved?.();
        props.onClose();
        router.refresh();
      } else {
        if (!student) return;
        const res = await walkInConsumableUsage({
          consumable_sku_id: props.sku.id,
          student_id: student.id,
          quantity_used: quantity,
        });
        if (!res.ok) {
          setError(res.error);
          return;
        }
        const qty = quantity;
        toast.success(`Logged ${props.sku.qr_code}`, {
          description: `To ${student.full_name} · ${qty} ${props.sku.unit}`,
        });
        props.onSuccess?.({
          kind: "usage",
          sku: {
            qr_code: props.sku.qr_code,
            name: props.sku.name,
            photo_url: props.sku.photo_url,
            unit: props.sku.unit,
          },
          student: { full_name: student.full_name },
          quantity: qty,
          at: Date.now(),
        });
        props.onClose();
        router.refresh();
      }
    });
  }

  const eyebrow = isApprove ? "APPROVE PICKUP" : "LOG USAGE · WALK-IN";
  const title = isApprove
    ? `Approve ${props.sku.qr_code}`
    : `Log usage of ${props.sku.qr_code}`;

  return (
    <Modal
      open={props.open}
      onClose={props.onClose}
      onBack={props.onBack}
      eyebrow={eyebrow}
      title={title}
      status={pending ? "WORKING" : "READY"}
      footer={
        <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-3">
          <button
            type="button"
            onClick={props.onClose}
            className="text-navy text-[15px] font-bold hover:underline underline-offset-4 decoration-teal decoration-2 sm:px-3"
          >
            Cancel
          </button>
          <Button
            type="button"
            onClick={handleConfirm}
            disabled={!canSubmit}
            loading={pending}
            className="!py-3.5"
          >
            {isApprove ? "Confirm pickup" : "Confirm usage"}
            <ArrowRight size={18} strokeWidth={2} />
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-5">
        <div className="flex items-center gap-4">
          <PhotoFrame
            src={props.sku.photo_url}
            alt={props.sku.name}
            size="thumb"
            className="shrink-0"
          />
          <div className="flex flex-col gap-1 min-w-0">
            <p className="font-mono uppercase text-caps-sm font-semibold tracking-[0.08em] text-navy">
              {props.sku.qr_code}
            </p>
            <p className="text-[15px] text-navy font-semibold truncate">
              {props.sku.name}
            </p>
            <p className="font-mono uppercase text-caps-sm text-slate tracking-[0.08em]">
              {props.sku.total_remaining} {props.sku.unit} on hand
            </p>
          </div>
        </div>

        {noStock && (
          <div className="flex items-start gap-3 border-l-4 border-red bg-paper rounded px-4 py-3 text-[14px] text-red-deep">
            <AlertTriangle size={18} strokeWidth={2} className="mt-0.5 shrink-0" />
            <span>Out of stock. No active lots.</span>
          </div>
        )}

        <StudentPicker
          value={student}
          onChange={setStudent}
          required
          locked={isApprove}
        />

        {overdueBlocked && student && (
          <div className="flex items-start gap-3 border-l-4 border-red-deep bg-paper rounded px-4 py-3 text-[14px] text-red-deep">
            <AlertTriangle size={18} strokeWidth={2} className="mt-0.5 shrink-0" />
            <div>
              <p className="font-mono uppercase text-caps-sm font-semibold tracking-[0.08em] mb-1">
                Student is blocked
              </p>
              <p className="text-slate">
                <span className="font-semibold text-navy">
                  {student.full_name}
                </span>{" "}
                has {overdueCount} overdue item
                {overdueCount === 1 ? "" : "s"}. They can&apos;t use consumables
                until returned.
              </p>
            </div>
          </div>
        )}

        <div>
          <p className="text-[15px] text-slate font-bold uppercase tracking-[0.08em] mb-1.5">
            Quantity
            <span aria-hidden className="text-teal ml-1">
              *
            </span>
          </p>
          <div className="flex items-center gap-4">
            <QtyStepper
              value={quantity}
              min={1}
              max={maxQty}
              onChange={setQuantity}
              disabled={isApprove || maxQty < 1}
            />
            <p className="text-[13px] text-slate">
              {props.sku.unit}
              {!isApprove && (
                <>
                  {" "}
                  · max {props.sku.per_request_max_quantity} per request
                  {shortStock && (
                    <>
                      {" "}·{" "}
                      <span className="text-red-deep font-semibold">
                        {props.sku.total_remaining} on hand
                      </span>
                    </>
                  )}
                </>
              )}
            </p>
          </div>
        </div>

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
