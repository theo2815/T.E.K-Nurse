"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, PackagePlus } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { QtyStepper } from "@/components/ui/QtyStepper";
import type { EquipmentSku } from "@/lib/supabase/queries/equipment";
import { receiveEquipmentStock } from "@/app/staff/inventory/actions";

const MIN_NOTES = 3;
const MAX_NOTES = 280;

export function ReceiveStockModal({
  open,
  onClose,
  sku,
  onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  sku: EquipmentSku;
  onSuccess?: () => void;
}) {
  const [qty, setQty] = useState(1);
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const trimmedNotes = notes.trim();
  const notesTooShort = trimmedNotes.length < MIN_NOTES;
  const notesTooLong = trimmedNotes.length > MAX_NOTES;

  const canSubmit = useMemo(() => {
    if (submitting) return false;
    if (qty < 1) return false;
    if (notesTooShort || notesTooLong) return false;
    return true;
  }, [submitting, qty, notesTooShort, notesTooLong]);

  async function onSubmit() {
    setError(null);
    setSubmitting(true);
    const res = await receiveEquipmentStock({
      sku_id: sku.id,
      quantity: qty,
      notes: trimmedNotes,
    });
    setSubmitting(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    onSuccess?.();
    onClose();
  }

  const projectedTotal = sku.total_units + qty;
  const projectedAvailable = sku.available_units + qty;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Receive new stock · ${sku.qr_code}`}
      eyebrow="RECEIVE STOCK"
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
            variant="primary"
            disabled={!canSubmit}
            loading={submitting}
            onClick={onSubmit}
          >
            {!submitting && <PackagePlus size={16} strokeWidth={2} />}
            Add to inventory
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-5">
        <div>
          <p className="font-mono uppercase text-caps-sm font-semibold tracking-[0.1em] text-slate">
            SKU
          </p>
          <p className="mt-1 font-display italic font-extrabold text-[20px] text-navy leading-tight">
            {sku.name}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Pill label="Total before" value={sku.total_units} />
          <Pill
            label="Total after"
            value={projectedTotal}
            tone={qty > 0 ? "accent" : "muted"}
          />
          <Pill label="Available before" value={sku.available_units} />
          <Pill
            label="Available after"
            value={projectedAvailable}
            tone={qty > 0 ? "accent" : "muted"}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <span className="text-[15px] text-slate font-bold uppercase tracking-[0.08em]">
            Quantity received
          </span>
          <QtyStepper value={qty} min={1} max={9999} onChange={setQty} />
          <p className="font-mono uppercase text-caps-sm text-slate tracking-[0.08em] mt-0.5">
            Adds to both Total and Available
          </p>
        </div>

        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="receive-notes"
            className="text-[15px] text-slate font-bold uppercase tracking-[0.08em]"
          >
            Notes <span className="text-red-deep">*</span>
          </label>
          <textarea
            id="receive-notes"
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. PO #1234, vendor delivery 2026-05-25"
            className="w-full rounded border-[1.5px] border-rule bg-white py-3 px-4 text-navy placeholder:text-slate/60 focus:outline-none focus:border-teal text-[15px] leading-relaxed"
          />
          <p
            className={`font-mono uppercase text-caps-sm tracking-[0.08em] mt-0.5 ${
              notesTooLong ? "text-red-deep" : "text-slate"
            }`}
          >
            {trimmedNotes.length}/{MAX_NOTES} · min {MIN_NOTES} chars
          </p>
        </div>

        {notesTooLong && (
          <Callout>Note is over {MAX_NOTES} characters — please shorten.</Callout>
        )}
        {error && <Callout>{error}</Callout>}
      </div>
    </Modal>
  );
}

function Pill({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: number;
  tone?: "default" | "accent" | "muted";
}) {
  const valueTone =
    tone === "accent"
      ? "text-teal-deep"
      : tone === "muted"
        ? "text-slate"
        : "text-navy";
  return (
    <div className="rounded border-[1.5px] border-rule bg-mist py-3 px-3">
      <p className="font-mono uppercase text-caps-sm text-slate tracking-[0.1em] font-semibold">
        {label}
      </p>
      <p
        className={`mt-1 font-display italic font-extrabold text-[24px] leading-none ${valueTone}`}
      >
        {value}
      </p>
    </div>
  );
}

function Callout({ children }: { children: React.ReactNode }) {
  return (
    <div className="border-l-[3px] border-red-deep bg-red-deep/5 px-4 py-3 rounded inline-flex items-start gap-2.5 text-red-deep">
      <AlertTriangle size={16} strokeWidth={2} className="mt-0.5 shrink-0" />
      <p className="text-[14px] font-medium">{children}</p>
    </div>
  );
}
