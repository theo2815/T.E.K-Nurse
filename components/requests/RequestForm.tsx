"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { AlertTriangle, ArrowRight } from "lucide-react";
import {
  submitEquipmentRequest,
  submitConsumableRequest,
} from "@/app/student/requests/actions";
import { DateField } from "@/components/ui/DateField";
import { QtyStepper } from "@/components/ui/QtyStepper";

function todayIso(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

function addDays(iso: string, days: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const next = new Date(y, m - 1, d + days);
  const yy = next.getFullYear();
  const mm = String(next.getMonth() + 1).padStart(2, "0");
  const dd = String(next.getDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

function dayDelta(from: string, to: string): string {
  if (!from || !to) return "";
  const [fy, fm, fd] = from.split("-").map(Number);
  const [ty, tm, td] = to.split("-").map(Number);
  const a = Date.UTC(fy, fm - 1, fd);
  const b = Date.UTC(ty, tm - 1, td);
  const days = Math.round((b - a) / 86_400_000);
  if (days < 0) return "Return is before pickup";
  if (days === 0) return "Same-day return";
  if (days === 1) return "1 day from pickup";
  return `${days} days from pickup`;
}

type EquipmentMode = {
  mode: "equipment";
  sku: {
    qr_code: string;
    name: string;
    available_units: number;
  };
};

type ConsumableMode = {
  mode: "consumable";
  sku: {
    qr_code: string;
    name: string;
    unit: string;
    per_request_max_quantity: number;
    total_remaining: number;
  };
};

type Props = (EquipmentMode | ConsumableMode) & {
  cancelHref: string;
};

export function RequestForm(props: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const today = todayIso();
  const [borrowDate, setBorrowDate] = useState(today);
  const [returnDate, setReturnDate] = useState(addDays(today, 7));
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState("");

  const maxQty =
    props.mode === "equipment"
      ? props.sku.available_units
      : Math.min(props.sku.per_request_max_quantity, props.sku.total_remaining);

  const unitLabel =
    props.mode === "equipment"
      ? quantity === 1
        ? "unit"
        : "units"
      : props.sku.unit;

  const canSubmit =
    !pending &&
    maxQty >= 1 &&
    quantity >= 1 &&
    quantity <= maxQty &&
    !!borrowDate &&
    (props.mode === "consumable" || (!!returnDate && returnDate >= borrowDate));

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    startTransition(async () => {
      const result =
        props.mode === "equipment"
          ? await submitEquipmentRequest({
              sku_qr: props.sku.qr_code,
              borrow_date: borrowDate,
              expected_return_date: returnDate,
              quantity,
              notes: notes.trim() || null,
            })
          : await submitConsumableRequest({
              sku_qr: props.sku.qr_code,
              borrow_date: borrowDate,
              quantity,
              notes: notes.trim() || null,
            });

      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.push(`/student/requests/${result.id}?type=${props.mode}`);
    });
  }

  function handleBorrowDateChange(next: string) {
    setBorrowDate(next);
    // Keep the return date sane: bump forward if pickup outruns it.
    if (props.mode === "equipment" && next > returnDate) {
      setReturnDate(next);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-8">
      <div className="grid gap-8 md:grid-cols-[200px_1fr] md:items-baseline">
        <SectionLabel>Pickup date</SectionLabel>
        <div className="md:max-w-[320px]">
          <DateField
            value={borrowDate}
            onChange={handleBorrowDateChange}
            min={today}
            required
            caption={borrowDate === today ? "Today" : undefined}
          />
        </div>

        {props.mode === "equipment" && (
          <>
            <SectionLabel>Expected return</SectionLabel>
            <div className="md:max-w-[320px]">
              <DateField
                value={returnDate}
                onChange={setReturnDate}
                min={borrowDate}
                required
                caption={dayDelta(borrowDate, returnDate)}
              />
            </div>
          </>
        )}

        <SectionLabel>Quantity</SectionLabel>
        <div>
          <QtyStepper
            value={quantity}
            min={1}
            max={Math.max(1, maxQty)}
            onChange={setQuantity}
            disabled={maxQty < 1}
          />
          <p className="mt-2 text-[14px] text-slate">
            {props.mode === "equipment" ? (
              <>Up to {maxQty} available</>
            ) : (
              <>
                Max {props.sku.per_request_max_quantity} per request ·{" "}
                {props.sku.total_remaining} {props.sku.unit} in stock
              </>
            )}
          </p>
          {quantity > maxQty && (
            <p className="mt-1.5 text-[14px] text-red-deep font-medium">
              Only {maxQty} {unitLabel} available.
            </p>
          )}
        </div>

        <SectionLabel>
          Notes{" "}
          <span className="font-mono normal-case font-medium text-slate/70 tracking-normal text-[12px] ml-1">
            optional
          </span>
        </SectionLabel>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          maxLength={500}
          placeholder="Anything staff should know? e.g. 'for OSCE practice Friday'"
          className="w-full rounded border-[1.5px] border-rule bg-white py-3 px-4 text-navy placeholder:text-slate/60 focus:outline-none focus:border-teal resize-none"
        />
      </div>

      <hr className="border-rule" />

      {error && (
        <div className="flex items-start gap-3 border-l-4 border-red bg-paper rounded px-4 py-3 text-[15px] text-red-deep">
          <AlertTriangle size={18} strokeWidth={2} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="flex flex-col md:flex-row md:items-center md:justify-end gap-4">
        <a
          href={props.cancelHref}
          className="text-navy text-[15px] font-bold hover:underline underline-offset-4 decoration-teal decoration-2 text-center md:text-left"
        >
          Cancel
        </a>
        <button
          type="submit"
          disabled={!canSubmit}
          className="inline-flex items-center justify-center gap-2 bg-teal text-white font-mono uppercase text-[15px] tracking-[0.12em] font-bold px-6 py-4 rounded transition-colors hover:bg-teal-deep active:bg-navy-deep disabled:opacity-40 disabled:pointer-events-none"
        >
          {pending ? "Submitting…" : "Submit request"}
          <ArrowRight size={18} strokeWidth={2} />
        </button>
      </div>
    </form>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="font-mono uppercase text-caps-sm text-slate font-semibold tracking-[0.1em]">
      {children}
    </p>
  );
}

