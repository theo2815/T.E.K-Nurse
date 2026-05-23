"use client";

import { useProgressRouter } from "@/lib/use-progress-router";
import { useEffect, useState, useTransition } from "react";
import { AlertTriangle, ArrowRight, MapPin } from "lucide-react";
import { toast } from "sonner";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { DateField } from "@/components/ui/DateField";
import { QtyStepper } from "@/components/ui/QtyStepper";
import { PhotoFrame } from "@/components/catalog/PhotoFrame";
import { StudentPicker } from "@/components/staff/StudentPicker";
import {
  walkInBorrow,
  approveBorrowRequest,
} from "@/app/staff/actions";
import type { StudentSearchRow } from "@/lib/supabase/queries/staff-requests";

const NOTES_MAX = 280;

export type LendSuccessActivity = {
  kind: "lend";
  sku: { qr_code: string; name: string; photo_url: string | null };
  student: { full_name: string };
  quantity: number;
  expected_return_date: string;
  at: number;
};

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

function formatDueShort(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  return d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

type SkuShape = {
  id: string;
  qr_code: string;
  name: string;
  photo_url: string | null;
  location: string | null;
  total_units: number;
  available_units: number;
  reserved_units: number;
  borrowed_units: number;
};

type WalkInProps = {
  mode: "walk-in";
  sku: SkuShape;
  /** Called when the user requests the override flow (5g). */
  onOverrideRequest?: () => void;
  /** Fires after a successful walk-in lend (before onClose). Used by the
   *  scan shell to record the activity into the Recent strip. */
  onSuccess?: (activity: LendSuccessActivity) => void;
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
  /** When provided, renders the modal's chevron-left back affordance — used
   *  when this modal was opened from the equipment ActionPicker. */
  onBack?: () => void;
};

export function LendModal(props: Props) {
  const router = useProgressRouter();
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
  const [notes, setNotes] = useState("");

  // Reset when re-opened with new context
  useEffect(() => {
    if (!props.open) return;
    setError(null);
    setNotes("");
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

  const overdueCount = student?.overdue_count ?? 0;
  const overdueBlocked = !isApprove && overdueCount > 0;

  const canSubmit =
    !pending &&
    !!student &&
    !overdueBlocked &&
    quantity >= 1 &&
    (isApprove || quantity <= props.sku.available_units) &&
    !!returnDate &&
    returnDate >= todayIso() &&
    (isApprove || notes.length <= NOTES_MAX);

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
        const trimmedNotes = notes.trim();
        const res = await walkInBorrow({
          equipment_sku_id: props.sku.id,
          student_id: student.id,
          quantity,
          expected_return_date: returnDate,
          notes: trimmedNotes.length > 0 ? trimmedNotes : null,
        });
        if (!res.ok) {
          setError(res.error);
          return;
        }
        const qty = quantity;
        const due = returnDate;
        toast.success(`Lent ${props.sku.qr_code}`, {
          description: `To ${student.full_name} · ${qty} unit${
            qty === 1 ? "" : "s"
          } · Due ${formatDueShort(due)}`,
        });
        props.onSuccess?.({
          kind: "lend",
          sku: {
            qr_code: props.sku.qr_code,
            name: props.sku.name,
            photo_url: props.sku.photo_url,
          },
          student: { full_name: student.full_name },
          quantity: qty,
          expected_return_date: due,
          at: Date.now(),
        });
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
            {isApprove ? "Confirm pickup" : "Confirm lend"}
            <ArrowRight size={18} strokeWidth={2} />
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-5">
        {/* Item identity — photo + qr + name, with location + stock readout */}
        <div className="border-[1.5px] border-rule rounded p-3 bg-mist/40">
          <div className="flex items-center gap-4">
            <PhotoFrame
              src={props.sku.photo_url}
              alt={props.sku.name}
              size="thumb"
              className="shrink-0"
            />
            <div className="flex flex-col gap-1 min-w-0 flex-1">
              <p className="font-mono uppercase text-caps-sm font-semibold tracking-[0.08em] text-navy">
                {props.sku.qr_code}
              </p>
              <p className="text-[15px] text-navy font-semibold truncate">
                {props.sku.name}
              </p>
            </div>
            <div className="text-right shrink-0">
              <p className="font-mono uppercase text-[10.5px] tracking-[0.14em] font-bold text-slate">
                Available
              </p>
              <p className="font-display italic font-extrabold text-[32px] leading-none text-navy mt-0.5">
                {props.sku.available_units}
                <span className="font-mono not-italic text-[14px] text-slate/70 font-semibold ml-0.5">
                  /{props.sku.total_units}
                </span>
              </p>
            </div>
          </div>
          {props.sku.location && (
            <p className="mt-3 pt-3 border-t border-rule inline-flex items-center gap-1.5 font-mono uppercase text-caps-sm tracking-[0.08em] text-slate w-full">
              <MapPin size={13} strokeWidth={1.75} className="text-teal shrink-0" />
              {props.sku.location}
            </p>
          )}
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
                {overdueCount === 1 ? "" : "s"}. They can&apos;t borrow until
                returned. Resolve the open return first.
              </p>
            </div>
          </div>
        )}

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
          </div>
        </div>

        {!isApprove && (
          <div>
            <label
              htmlFor="lend-notes"
              className="text-[15px] text-slate font-bold uppercase tracking-[0.08em] mb-1.5 flex items-center justify-between"
            >
              <span>
                Notes
                <span className="ml-2 font-mono normal-case text-[11px] tracking-[0.08em] text-slate/60 font-medium">
                  optional
                </span>
              </span>
              <span
                className={`font-mono text-[11px] tracking-[0.08em] tabular-nums ${
                  notes.length > NOTES_MAX
                    ? "text-red-deep font-bold"
                    : "text-slate/60"
                }`}
              >
                {notes.length}/{NOTES_MAX}
              </span>
            </label>
            <textarea
              id="lend-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              maxLength={NOTES_MAX + 50}
              placeholder="e.g. handed over with extra disinfecting wipes"
              className="w-full rounded border-[1.5px] bg-white p-3 text-[14px] text-navy placeholder:text-slate/50 border-rule focus:border-teal hover:border-slate/60 focus:outline-none transition-colors resize-y"
            />
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
