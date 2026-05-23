"use client";

import { useMemo, useState } from "react";
import { ArrowRight, AlertTriangle } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { QtyStepper } from "@/components/ui/QtyStepper";
import type { EquipmentSku } from "@/lib/supabase/queries/equipment";
import {
  adjustEquipmentCount,
  type EquipmentBucket,
} from "@/app/staff/inventory/actions";

type Preset =
  | "free"
  | "mark-maintenance"
  | "recover-maintenance"
  | "mark-lost"
  | "recover-lost";

const PRESETS: Record<
  Exclude<Preset, "free">,
  {
    from: EquipmentBucket;
    to: EquipmentBucket;
    title: string;
    eyebrow: string;
    cta: string;
  }
> = {
  "mark-maintenance": {
    from: "available",
    to: "maintenance",
    title: "Send units to maintenance",
    eyebrow: "MARK MAINTENANCE",
    cta: "Send to maintenance",
  },
  "recover-maintenance": {
    from: "maintenance",
    to: "available",
    title: "Return units from maintenance",
    eyebrow: "RECOVER",
    cta: "Recover to available",
  },
  "mark-lost": {
    from: "available",
    to: "lost",
    title: "Write off lost units",
    eyebrow: "MARK LOST",
    cta: "Mark lost",
  },
  "recover-lost": {
    from: "lost",
    to: "available",
    title: "Restore previously lost units",
    eyebrow: "RECOVER",
    cta: "Recover to available",
  },
};

function bucketLabel(b: EquipmentBucket): string {
  return b === "available" ? "Available" : b === "maintenance" ? "Maintenance" : "Lost";
}

function bucketAvailable(sku: EquipmentSku, b: EquipmentBucket): number {
  if (b === "available") return sku.available_units;
  if (b === "maintenance") return sku.maintenance_units;
  return sku.lost_units;
}

export function CountAdjustModal({
  open,
  onClose,
  sku,
  preset = "free",
  onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  sku: EquipmentSku;
  preset?: Preset;
  onSuccess?: () => void;
}) {
  const presetCfg = preset !== "free" ? PRESETS[preset] : null;

  const [from, setFrom] = useState<EquipmentBucket>(presetCfg?.from ?? "available");
  const [to, setTo] = useState<EquipmentBucket>(presetCfg?.to ?? "maintenance");
  const [qty, setQty] = useState(1);
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isFree = preset === "free";
  const sourceAvailable = bucketAvailable(sku, from);
  const sameBucket = from === to;
  const overstock = qty > sourceAvailable;

  const eyebrow = presetCfg?.eyebrow ?? "MOVE UNITS";
  const title = presetCfg?.title ?? `Move units · ${sku.qr_code}`;
  const cta = presetCfg?.cta ?? "Move units";

  const canSubmit = useMemo(() => {
    if (submitting) return false;
    if (qty < 1) return false;
    if (sameBucket) return false;
    if (overstock) return false;
    return true;
  }, [submitting, qty, sameBucket, overstock]);

  async function onSubmit() {
    setError(null);
    setSubmitting(true);
    const res = await adjustEquipmentCount({
      sku_id: sku.id,
      from_bucket: from,
      to_bucket: to,
      quantity: qty,
      notes: notes.trim() || null,
    });
    setSubmitting(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    onSuccess?.();
    onClose();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      eyebrow={eyebrow}
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
            {cta}
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

        {isFree ? (
          <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-3">
            <BucketSelect
              label="From"
              value={from}
              onChange={setFrom}
              sku={sku}
              showCounts
            />
            <div className="text-teal pb-3">
              <ArrowRight size={20} strokeWidth={2} />
            </div>
            <BucketSelect
              label="To"
              value={to}
              onChange={setTo}
              sku={sku}
              showCounts
            />
          </div>
        ) : (
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 text-center">
            <FixedBucket label="From" bucket={from} count={bucketAvailable(sku, from)} />
            <div className="text-teal">
              <ArrowRight size={20} strokeWidth={2} />
            </div>
            <FixedBucket label="To" bucket={to} count={bucketAvailable(sku, to)} />
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          <span className="text-[15px] text-slate font-bold uppercase tracking-[0.08em]">
            Quantity
          </span>
          <QtyStepper
            value={qty}
            min={1}
            max={Math.max(1, sourceAvailable)}
            onChange={setQty}
          />
          <p className="font-mono uppercase text-caps-sm text-slate tracking-[0.08em] mt-0.5">
            Up to {sourceAvailable} from {bucketLabel(from)}
          </p>
        </div>

        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="adjust-notes"
            className="text-[15px] text-slate font-bold uppercase tracking-[0.08em]"
          >
            Notes
          </label>
          <textarea
            id="adjust-notes"
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Reason or remarks (optional)"
            className="w-full rounded border-[1.5px] border-rule bg-white py-3 px-4 text-navy placeholder:text-slate/60 focus:outline-none focus:border-teal text-[15px] leading-relaxed"
          />
        </div>

        {sameBucket && (
          <Callout>From and to must be different buckets.</Callout>
        )}
        {overstock && (
          <Callout>
            Only {sourceAvailable} in {bucketLabel(from)} — reduce the quantity.
          </Callout>
        )}
        {error && <Callout>{error}</Callout>}
      </div>
    </Modal>
  );
}

function BucketSelect({
  label,
  value,
  onChange,
  sku,
  showCounts,
}: {
  label: string;
  value: EquipmentBucket;
  onChange: (b: EquipmentBucket) => void;
  sku: EquipmentSku;
  showCounts?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[15px] text-slate font-bold uppercase tracking-[0.08em]">
        {label}
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as EquipmentBucket)}
        className="w-full rounded border-[1.5px] border-rule bg-white py-3 px-3 text-navy focus:outline-none focus:border-teal text-[15px] font-semibold"
      >
        <option value="available">
          {showCounts ? `Available · ${sku.available_units}` : "Available"}
        </option>
        <option value="maintenance">
          {showCounts ? `Maintenance · ${sku.maintenance_units}` : "Maintenance"}
        </option>
        <option value="lost">
          {showCounts ? `Lost · ${sku.lost_units}` : "Lost"}
        </option>
      </select>
    </div>
  );
}

function FixedBucket({
  label,
  bucket,
  count,
}: {
  label: string;
  bucket: EquipmentBucket;
  count: number;
}) {
  return (
    <div className="rounded border-[1.5px] border-rule bg-mist py-3 px-3 text-center">
      <p className="font-mono uppercase text-caps-sm text-slate tracking-[0.1em] font-semibold">
        {label}
      </p>
      <p className="mt-1 font-display italic font-extrabold text-[28px] text-navy leading-none">
        {count}
      </p>
      <p className="mt-1 font-mono uppercase text-caps-sm text-slate tracking-[0.08em]">
        {bucketLabel(bucket)}
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
