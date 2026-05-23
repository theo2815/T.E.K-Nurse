"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { ArrowLeft, AlertTriangle, Save, Lock } from "lucide-react";
import { useProgressTracking } from "@/lib/use-progress-router";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { SpeedLines } from "@/components/SpeedLines";
import { MonoId } from "@/components/ui/MonoId";
import { PhotoUploader } from "@/components/inventory/PhotoUploader";
import type { EquipmentSku } from "@/lib/supabase/queries/equipment";
import {
  createEquipmentSku,
  updateEquipmentSku,
} from "@/app/staff/inventory/actions";

type CreateProps = {
  mode: "create";
};
type EditProps = {
  mode: "edit";
  sku: EquipmentSku;
};
type Props = CreateProps | EditProps;

const INITIAL = { error: undefined as string | undefined };

export function EquipmentSkuForm(props: Props) {
  const isEdit = props.mode === "edit";

  const action = isEdit
    ? updateEquipmentSku.bind(null, props.sku.id)
    : createEquipmentSku;

  const [state, formAction, pending] = useActionState(action, INITIAL);
  useProgressTracking(pending);

  const [photoUrl, setPhotoUrl] = useState<string | null>(
    isEdit ? props.sku.photo_url : null,
  );

  return (
    <article className="flex flex-col gap-10">
      <div>
        <Link
          href={
            isEdit
              ? `/staff/inventory/equipment/${encodeURIComponent(props.sku.qr_code)}`
              : "/staff/inventory"
          }
          className="inline-flex items-center gap-2 font-mono uppercase text-caps-sm text-slate hover:text-navy tracking-[0.1em] font-semibold"
        >
          <ArrowLeft size={16} strokeWidth={1.75} />
          {isEdit ? "Back to SKU" : "Back to inventory"}
        </Link>
      </div>

      <header>
        <div className="flex items-center gap-3">
          <SpeedLines className="w-12 h-5" />
          <p className="font-mono uppercase text-caps-sm text-teal font-semibold">
            Equipment · {isEdit ? "Edit" : "New"}
          </p>
        </div>
        {isEdit && (
          <div className="mt-1 flex items-baseline gap-3 flex-wrap">
            <MonoId id={props.sku.qr_code} />
          </div>
        )}
        <h1 className="mt-3 font-display italic font-extrabold text-display md:text-[48px] text-navy leading-[1.05]">
          {isEdit ? "Edit SKU" : "Add new equipment"}
        </h1>
      </header>

      <hr className="border-rule" />

      <form action={formAction} className="grid gap-8 md:grid-cols-[1fr_minmax(0,_320px)] md:items-start">
        <div className="flex flex-col gap-5">
          <Input
            label="Name"
            name="name"
            required
            requiredMark
            defaultValue={isEdit ? props.sku.name : ""}
            placeholder="e.g. Stethoscope"
          />

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="description"
              className="text-[15px] text-slate font-bold uppercase tracking-[0.08em]"
            >
              Description
            </label>
            <textarea
              id="description"
              name="description"
              rows={3}
              defaultValue={isEdit ? props.sku.description ?? "" : ""}
              placeholder="What it is, when it's used."
              className="w-full rounded border-[1.5px] border-rule bg-white py-3 px-4 text-navy placeholder:text-slate/60 focus:outline-none focus:border-teal text-[15px] leading-relaxed"
            />
          </div>

          {isEdit ? (
            <div className="flex flex-col gap-1.5">
              <span className="text-[15px] text-slate font-bold uppercase tracking-[0.08em]">
                QR code
              </span>
              <div className="inline-flex items-center gap-3 rounded border-[1.5px] border-rule bg-mist py-3 px-4 text-navy">
                <Lock size={14} strokeWidth={2} className="text-slate" />
                <span className="font-mono text-[15px] tracking-[0.06em] font-semibold uppercase">
                  {props.sku.qr_code}
                </span>
                <span className="ml-auto font-mono text-caps-sm text-slate tracking-[0.08em]">
                  Identity is locked
                </span>
              </div>
            </div>
          ) : (
            <Input
              label="QR code"
              name="qr_code"
              required
              requiredMark
              placeholder="e.g. STH-001"
              className="font-mono uppercase tracking-[0.06em]"
            />
          )}

          <Input
            label={isEdit ? "Total units (locked — use count moves)" : "Total units"}
            name="total_units"
            type="number"
            min={0}
            step={1}
            required={!isEdit}
            requiredMark={!isEdit}
            defaultValue={isEdit ? String(props.sku.total_units) : "1"}
            readOnly={isEdit}
            disabled={isEdit}
            placeholder="0"
          />
          {isEdit && (
            <p className="-mt-3 text-[13px] text-slate">
              The total count grows or shrinks only via bucket moves on the SKU detail page. This keeps the count invariant safe.
            </p>
          )}

          <div className="grid gap-5 md:grid-cols-2">
            <Input
              label="Low-stock threshold"
              name="low_stock_threshold"
              type="number"
              min={0}
              step={1}
              required
              requiredMark
              defaultValue={isEdit ? String(props.sku.low_stock_threshold) : "1"}
            />
            <Input
              label="Location"
              name="location"
              defaultValue={isEdit ? props.sku.location ?? "" : ""}
              placeholder="Cabinet A · Drawer 3"
            />
          </div>

          {state?.error && (
            <div className="border-l-[3px] border-red-deep bg-red-deep/5 px-4 py-3 rounded inline-flex items-start gap-2.5 text-red-deep">
              <AlertTriangle size={16} strokeWidth={2} className="mt-0.5 shrink-0" />
              <p className="text-[14px] font-medium">{state.error}</p>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <Button type="submit" variant="primary" loading={pending}>
              {!pending && <Save size={16} strokeWidth={2} />}
              {isEdit ? "Save changes" : "Create SKU"}
            </Button>
            <Link
              href={
                isEdit
                  ? `/staff/inventory/equipment/${encodeURIComponent(props.sku.qr_code)}`
                  : "/staff/inventory"
              }
              className="text-navy text-[15px] font-bold px-1 py-0.5 hover:underline underline-offset-4 decoration-teal decoration-2"
            >
              Cancel
            </Link>
          </div>
        </div>

        <aside className="flex flex-col gap-6">
          <PhotoUploader
            value={photoUrl}
            onChange={setPhotoUrl}
            name="photo_url"
            label="Photo"
          />
        </aside>
      </form>
    </article>
  );
}
