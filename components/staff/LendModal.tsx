"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { AlertTriangle, ArrowRight } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { DateField } from "@/components/ui/DateField";
import { QtyStepper } from "@/components/ui/QtyStepper";
import { StudentPicker } from "@/components/staff/StudentPicker";
import {
  walkInBorrow,
  approveBorrowRequest,
} from "@/app/staff/actions";
import type { StudentSearchRow } from "@/lib/supabase/queries/staff-requests";

function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
    2,
    "0",
  )}-${String(d.getDate()).padStart(2, "0")}`;
}

function addDays(iso: string, days: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const next = new Date(y, m - 1, d + days);
  return `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(
    2,
    "0",
  )}-${String(next.getDate()).padStart(2, "0")}`;
}

type SkuShape = {
  id: string;
  qr_code: string;
  name: string;
  available_units: number;
  reserved_units: number;
  borrowed_units: number;
};

type WalkInProps = {
  mode: "walk-in";
  sku: SkuShape;
  /** Called when the user requests the override flow (5g). */
  onOverrideRequest?: () => void;
};

type ApproveProps = {
  mode: "approve";
  sku: SkuShape;
  request_id: string;
  prefill: {
    student: StudentSearchRow;
    quantity: number;
    expected_return_date: string;
  };
  onApproved?: () => void;
};

type Props = (WalkInProps | ApproveProps) & {
  open: boolean;
  onClose: () => void;
};

export function LendModal(props: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const isApprove = props.mode === "approve";

  // Form state
  const initialStudent = isApprove ? props.prefill.student : null;
  const initialReturn = isApprove
    ? props.prefill.expected_return_date
    : addDays(todayIso(), 7);
  const initialQty = isApprove
    ? props.prefill.quantity
    : 1;

  const [student, setStudent] = useState<StudentSearchRow | null>(
    initialStudent,
  );
  const [returnDate, setReturnDate] = useState(initialReturn);
  const [quantity, setQuantity] = useState(initialQty);

  // Reset when re-opened with new context
  useEffect(() => {
    if (!props.open) return;
    setError(null);
    if (isApprove) {
      setStudent(props.prefill.student);
      setReturnDate(props.prefill.expected_return_date);
      setQuantity(props.prefill.quantity);
    } else {
      setStudent(null);
      setReturnDate(addDays(todayIso(), 7));
      setQuantity(1);
    }
    // The deps are intentionally narrow — we reset on open transitions only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.open]);

  const maxQty = isApprove
    ? props.prefill.quantity
    : Math.max(1, props.sku.available_units);

  const fullyReserved =
    !isApprove &&
    props.sku.available_units === 0 &&
    props.sku.reserved_units > 0;

  const noStock =
    !isApprove &&
    props.sku.available_units === 0 &&
    props.sku.reserved_units === 0;

  const canSubmit =
    !pending &&
    !!student &&
    quantity >= 1 &&
    (isApprove || quantity <= props.sku.available_units) &&
    !!returnDate &&
    returnDate >= todayIso();

  function handleConfirm() {
    if (!canSubmit) return;
    setError(null);

    startTransition(async () => {
      if (isApprove) {
        const res = await approveBorrowRequest({
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
        const res = await walkInBorrow({
          equipment_sku_id: props.sku.id,
          student_id: student.id,
          quantity,
          expected_return_date: returnDate,
        });
        if (!res.ok) {
          setError(res.error);
          return;
        }
        props.onClose();
        router.refresh();
      }
    });
  }

  const eyebrow = isApprove ? "APPROVE PICKUP" : "LEND · WALK-IN";
  const title = isApprove
    ? `Approve ${props.sku.qr_code}`
    : `Lend ${props.sku.qr_code}`;

  return (
    <Modal
      open={props.open}
      onClose={props.onClose}
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
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!canSubmit}
            className="inline-flex items-center justify-center gap-2 bg-teal text-white font-mono uppercase text-[15px] tracking-[0.12em] font-bold px-6 py-3.5 rounded transition-colors hover:bg-teal-deep active:bg-navy-deep disabled:opacity-40 disabled:pointer-events-none"
          >
            {pending
              ? "Working…"
              : isApprove
              ? "Confirm pickup"
              : "Confirm lend"}
            <ArrowRight size={18} strokeWidth={2} />
          </button>
        </div>
      }
    >
      <div className="flex flex-col gap-5">
        {/* Item summary line */}
        <div className="flex items-center gap-3 text-[14px] text-slate">
          <span className="font-mono uppercase text-caps-sm font-semibold tracking-[0.08em] text-navy">
            {props.sku.qr_code}
          </span>
          <span aria-hidden className="size-1 rounded-full bg-slate/40" />
          <span className="truncate text-navy font-semibold">
            {props.sku.name}
          </span>
        </div>

        {/* Stock-state notices for walk-in only */}
        {fullyReserved && (
          <div className="flex items-start gap-3 border-l-4 border-amber bg-paper rounded px-4 py-3 text-[14px] text-slate">
            <AlertTriangle
              size={18}
              strokeWidth={2}
              className="mt-0.5 shrink-0 text-amber"
            />
            <div>
              <p className="font-mono uppercase text-caps-sm font-semibold tracking-[0.08em] text-navy mb-1">
                All units reserved
              </p>
              <p>
                {props.sku.reserved_units} unit
                {props.sku.reserved_units === 1 ? "" : "s"} held for pending
                requests.
              </p>
              {props.mode === "walk-in" && props.onOverrideRequest && (
                <button
                  type="button"
                  onClick={props.onOverrideRequest}
                  className="mt-2 inline-flex items-center gap-1.5 font-mono uppercase text-caps-sm font-bold tracking-[0.1em] text-amber hover:text-red-deep"
                >
                  Open override
                  <ArrowRight size={14} strokeWidth={2} />
                </button>
              )}
            </div>
          </div>
        )}

        {noStock && (
          <div className="flex items-start gap-3 border-l-4 border-red bg-paper rounded px-4 py-3 text-[14px] text-red-deep">
            <AlertTriangle size={18} strokeWidth={2} className="mt-0.5 shrink-0" />
            <span>
              No units available. {props.sku.borrowed_units} unit
              {props.sku.borrowed_units === 1 ? "" : "s"} out on borrow.
            </span>
          </div>
        )}

        <StudentPicker
          value={student}
          onChange={setStudent}
          required
          locked={isApprove}
        />

        <div className="grid sm:grid-cols-2 gap-5">
          <DateField
            label="Return by"
            value={returnDate}
            onChange={setReturnDate}
            min={todayIso()}
            required
          />
          <div>
            <p className="text-[15px] text-slate font-bold uppercase tracking-[0.08em] mb-1.5">
              Quantity
              <span aria-hidden className="text-teal ml-1">
                *
              </span>
            </p>
            <QtyStepper
              value={quantity}
              min={1}
              max={maxQty}
              onChange={setQuantity}
              disabled={isApprove || maxQty < 1}
            />
            {!isApprove && (
              <p className="mt-2 text-[13px] text-slate">
                {props.sku.available_units} available
              </p>
            )}
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
