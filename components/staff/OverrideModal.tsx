"use client";

import { useProgressRouter } from "@/lib/use-progress-router";
import { useEffect, useState, useTransition } from "react";
import { AlertTriangle, ArrowRight, Check } from "lucide-react";
import { toast } from "sonner";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { DateField } from "@/components/ui/DateField";
import { PhotoFrame } from "@/components/catalog/PhotoFrame";
import { StudentPicker } from "@/components/staff/StudentPicker";
import { overrideBorrow } from "@/app/staff/actions";
import type {
  StaffPendingRequestRow,
  StudentSearchRow,
} from "@/lib/supabase/queries/staff-requests";

export type OverrideSuccessActivity = {
  kind: "override";
  sku: { qr_code: string; name: string; photo_url: string | null };
  student: { full_name: string };
  skippedStudent: { full_name: string };
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

type Props = {
  open: boolean;
  onClose: () => void;
  sku: { id: string; qr_code: string; name: string; photo_url: string | null };
  pendingRequests: StaffPendingRequestRow[];
  onSuccess?: (activity: OverrideSuccessActivity) => void;
};

function formatDueShort(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  return d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export function OverrideModal({
  open,
  onClose,
  sku,
  pendingRequests,
  onSuccess,
}: Props) {
  const router = useProgressRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [skipId, setSkipId] = useState<string | null>(
    pendingRequests.length === 1 ? pendingRequests[0].id : null,
  );
  const [student, setStudent] = useState<StudentSearchRow | null>(null);
  const [returnDate, setReturnDate] = useState(addDays(todayIso(), 7));

  useEffect(() => {
    if (!open) return;
    setError(null);
    setSkipId(pendingRequests.length === 1 ? pendingRequests[0].id : null);
    setStudent(null);
    setReturnDate(addDays(todayIso(), 7));
  }, [open, pendingRequests]);

  const skipped = pendingRequests.find((r) => r.id === skipId) ?? null;
  const quantity = skipped?.quantity ?? 1;
  const canSubmit =
    !pending && !!skipped && !!student && !!returnDate;

  function handleConfirm() {
    if (!canSubmit || !skipped || !student) return;
    setError(null);
    startTransition(async () => {
      const skippedStudent = skipped.student.full_name;
      const newStudent = student.full_name;
      const due = returnDate;
      const qty = quantity;
      const res = await overrideBorrow({
        skip_request_id: skipped.id,
        equipment_sku_id: sku.id,
        student_id: student.id,
        quantity,
        expected_return_date: returnDate,
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      toast.success(`Override lent ${sku.qr_code}`, {
        description: `To ${newStudent} · Skipped ${skippedStudent} · Due ${formatDueShort(due)}`,
      });
      onSuccess?.({
        kind: "override",
        sku: {
          qr_code: sku.qr_code,
          name: sku.name,
          photo_url: sku.photo_url,
        },
        student: { full_name: newStudent },
        skippedStudent: { full_name: skippedStudent },
        quantity: qty,
        expected_return_date: due,
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
      eyebrow="OVERRIDE · WALK-IN"
      title={`Override reservation · ${sku.qr_code}`}
      status={pending ? "WORKING" : "READY"}
      size="wide"
      footer={
        <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3">
          <p className="text-[12.5px] text-slate italic">
            The original requester will be notified that their reservation was
            skipped.
          </p>
          <div className="flex flex-col-reverse sm:flex-row gap-3 sm:items-center">
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
              Override &amp; lend
              <ArrowRight size={18} strokeWidth={2} />
            </Button>
          </div>
        </div>
      }
    >
      <div className="flex flex-col gap-6">
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

        <div className="flex items-start gap-3 border-l-4 border-amber bg-paper rounded px-4 py-3 text-[14px] text-slate">
          <AlertTriangle
            size={18}
            strokeWidth={2}
            className="mt-0.5 shrink-0 text-amber"
          />
          <span>
            All units are held for pending requests. Pick one reservation to
            release, then lend the freed units to your walk-in.
          </span>
        </div>

        {/* Skip selector */}
        <section>
          <p className="font-mono uppercase text-caps-sm text-slate font-semibold tracking-[0.1em] mb-2">
            Release reservation
          </p>
          {pendingRequests.length === 0 ? (
            <p className="text-[14px] text-slate italic">
              No pending requests on this SKU. (You shouldn&apos;t be here — try the
              regular Lend button.)
            </p>
          ) : (
            <ul role="radiogroup" className="flex flex-col gap-2">
              {pendingRequests.map((r) => (
                <li key={r.id}>
                  <ReservationRow
                    request={r}
                    selected={r.id === skipId}
                    onSelect={() => setSkipId(r.id)}
                  />
                </li>
              ))}
            </ul>
          )}
        </section>

        <hr className="border-rule" />

        {/* New borrower */}
        <section className="flex flex-col gap-5">
          <p className="font-mono uppercase text-caps-sm text-slate font-semibold tracking-[0.1em]">
            Lend to walk-in
          </p>
          <StudentPicker value={student} onChange={setStudent} required />
          <div className="grid sm:grid-cols-2 gap-5">
            <DateField
              label="Return by"
              value={returnDate}
              onChange={setReturnDate}
              min={todayIso()}
              required
            />
            <div className="flex flex-col gap-1.5">
              <p className="text-[15px] text-slate font-bold uppercase tracking-[0.08em]">
                Quantity
              </p>
              <p className="inline-flex items-baseline gap-2 text-navy mt-1">
                <span className="font-display italic font-extrabold text-[28px]">
                  {quantity}
                </span>
                <span className="text-[14px] text-slate">
                  {quantity === 1 ? "unit" : "units"} · matches released reservation
                </span>
              </p>
            </div>
          </div>
        </section>

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

function ReservationRow({
  request,
  selected,
  onSelect,
}: {
  request: StaffPendingRequestRow;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      className={[
        "w-full text-left rounded border-[1.5px] px-4 py-3 transition-colors",
        selected
          ? "border-amber bg-amber/10"
          : "border-rule bg-paper hover:border-slate/60",
      ].join(" ")}
    >
      <div className="flex items-start gap-3">
        <span
          aria-hidden
          className={[
            "shrink-0 mt-1 size-4 rounded-full border-[1.5px] flex items-center justify-center",
            selected ? "border-amber bg-amber text-white" : "border-rule",
          ].join(" ")}
        >
          {selected && <Check size={11} strokeWidth={3} />}
        </span>
        <div className="flex-1 min-w-0">
          <p className="font-display italic font-extrabold text-[17px] text-navy leading-tight">
            {request.student.full_name}
          </p>
          <p className="text-[12.5px] text-slate font-mono mt-0.5 truncate">
            {request.student.email}
            {request.student.year_section && (
              <span className="ml-2 uppercase">
                · {request.student.year_section}
              </span>
            )}
          </p>
          <p className="mt-1.5 font-mono uppercase text-caps-sm tracking-[0.06em] text-slate">
            Qty {request.quantity}
            <span aria-hidden className="mx-2">·</span>
            Pickup {request.borrow_date}
          </p>
        </div>
      </div>
    </button>
  );
}
