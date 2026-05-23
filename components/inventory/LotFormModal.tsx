"use client";

import { useState } from "react";
import { AlertTriangle } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { QtyStepper } from "@/components/ui/QtyStepper";
import { DateField } from "@/components/ui/DateField";
import type { ConsumableLot } from "@/lib/supabase/queries/consumables";
import {
  createConsumableLot,
  updateConsumableLot,
} from "@/app/staff/inventory/actions";

type Props =
  | {
      open: boolean;
      onClose: () => void;
      mode: "create";
      skuId: string;
      skuName: string;
      onSuccess?: () => void;
    }
  | {
      open: boolean;
      onClose: () => void;
      mode: "edit";
      skuName: string;
      lot: ConsumableLot;
      onSuccess?: () => void;
    };

function todayIso(): string {
  const d = new Date();
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, "0"),
    String(d.getDate()).padStart(2, "0"),
  ].join("-");
}

export function LotFormModal(props: Props) {
  const isEdit = props.mode === "edit";

  // Parent unmounts/remounts on open/close, so prop-derived initial state is
  // fresh on every open — no useEffect reset needed.
  const [lotNumber, setLotNumber] = useState(
    isEdit ? props.lot.lot_number ?? "" : "",
  );
  const [receivedDate, setReceivedDate] = useState(
    isEdit ? props.lot.received_date : todayIso(),
  );
  const [expirationDate, setExpirationDate] = useState(
    isEdit ? props.lot.expiration_date : "",
  );
  const [quantity, setQuantity] = useState(isEdit ? props.lot.quantity_received : 1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const datesBad =
    Boolean(receivedDate) &&
    Boolean(expirationDate) &&
    expirationDate < receivedDate;

  const canSubmit =
    !submitting &&
    receivedDate !== "" &&
    expirationDate !== "" &&
    !datesBad &&
    (isEdit || quantity >= 1);

  async function onSubmit() {
    setError(null);
    setSubmitting(true);
    if (props.mode === "create") {
      const res = await createConsumableLot({
        consumable_sku_id: props.skuId,
        lot_number: lotNumber.trim() || null,
        received_date: receivedDate,
        expiration_date: expirationDate,
        quantity_received: quantity,
      });
      setSubmitting(false);
      if (!res.ok) {
        setError(res.error);
        return;
      }
    } else {
      const res = await updateConsumableLot({
        lot_id: props.lot.id,
        lot_number: lotNumber.trim() || null,
        received_date: receivedDate,
        expiration_date: expirationDate,
      });
      setSubmitting(false);
      if (!res.ok) {
        setError(res.error);
        return;
      }
    }
    props.onSuccess?.();
    props.onClose();
  }

  return (
    <Modal
      open={props.open}
      onClose={props.onClose}
      title={isEdit ? "Edit lot" : `New lot · ${props.skuName}`}
      eyebrow={isEdit ? "EDIT LOT" : "NEW LOT"}
      status={submitting ? "WORKING" : "READY"}
      footer={
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={props.onClose}
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
            {isEdit ? "Save changes" : "Create lot"}
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-5">
        <Input
          label="Lot number"
          value={lotNumber}
          onChange={(e) => setLotNumber(e.target.value)}
          placeholder="Vendor batch ID (optional)"
          className="font-mono uppercase tracking-[0.06em]"
        />

        <div className="grid gap-5 md:grid-cols-2">
          <DateField
            label="Received"
            value={receivedDate}
            onChange={setReceivedDate}
            required
          />
          <DateField
            label="Expires"
            value={expirationDate}
            onChange={setExpirationDate}
            min={receivedDate || undefined}
            required
            error={datesBad ? "Expires must be on or after received." : undefined}
          />
        </div>

        {!isEdit && (
          <div className="flex flex-col gap-1.5">
            <span className="text-[15px] text-slate font-bold uppercase tracking-[0.08em]">
              Quantity received
            </span>
            <QtyStepper value={quantity} min={1} max={100000} onChange={setQuantity} />
          </div>
        )}

        {isEdit && (
          <div className="border-l-[3px] border-teal bg-teal/5 px-4 py-3 rounded text-[13.5px] text-slate">
            <span className="font-mono uppercase text-caps-sm text-teal-deep tracking-[0.1em] font-bold">
              Note
            </span>
            <span className="ml-2">
              Quantity is owned by the FIFO ledger and cannot be edited. To remove this lot from active stock, use <strong>Mark depleted</strong>.
            </span>
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
