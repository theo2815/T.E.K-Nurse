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
import type { ConsumableSku } from "@/lib/supabase/queries/consumables";
import {
  createConsumableSku,
  updateConsumableSku,
} from "@/app/staff/inventory/actions";

type CreateProps = { mode: "create" };
type EditProps = { mode: "edit"; sku: ConsumableSku };
type Props = CreateProps | EditProps;

const INITIAL = { error: undefined as string | undefined };

export function ConsumableSkuForm(props: Props) {
  const isEdit = props.mode === "edit";

  const action = isEdit
    ? updateConsumableSku.bind(null, props.sku.id)
    : createConsumableSku;

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
              ? `/staff/inventory/consumables/${encodeURIComponent(props.sku.qr_code)}`
              : "/staff/inventory?type=consumables"
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
            Consumable · {isEdit ? "Edit" : "New"}
          </p>
        </div>
        {isEdit && (
          <div className="mt-1 flex items-baseline gap-3 flex-wrap">
            <MonoId id={props.sku.qr_code} />
          </div>
        )}
        <h1 className="mt-3 font-display italic font-extrabold text-display md:text-[48px] text-navy leading-[1.05]">
          {isEdit ? "Edit SKU" : "Add new consumable"}
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
            placeholder="e.g. Cotton balls"
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
              placeholder="e.g. CTN"
              className="font-mono uppercase tracking-[0.06em]"
            />
          )}

          <div className="grid gap-5 md:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Input
                label="Unit of measure"
                name="unit"
                required
                requiredMark
                defaultValue={isEdit ? props.sku.unit : ""}
                placeholder="e.g. pads, pieces, boxes, mL"
              />
              <p className="text-[12px] text-slate leading-snug">
                What you&apos;re counting in — <span className="font-semibold">not a quantity</span>. Stock comes from lots, added on the SKU detail page.
              </p>
            </div>
            <div className="flex flex-col gap-1.5">
              <Input
                label="Per-request max"
                name="per_request_max_quantity"
                type="number"
                min={1}
                step={1}
                required
                requiredMark
                defaultValue={
                  isEdit ? String(props.sku.per_request_max_quantity) : "20"
                }
              />
              <p className="text-[12px] text-slate leading-snug">
                The most a student can request in one submission. Caps prevent a single request from draining stock.
              </p>
            </div>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Input
                label="Low-stock threshold"
                name="low_stock_threshold"
                type="number"
                min={0}
                step={1}
                required
                requiredMark
                defaultValue={
                  isEdit ? String(props.sku.low_stock_threshold) : "10"
                }
              />
              <p className="text-[12px] text-slate leading-snug">
                Flags the SKU as <span className="font-semibold">LOW STOCK</span> when total remaining drops below this number. Set higher for items you want reorder lead time on.
              </p>
            </div>
            <div className="flex flex-col gap-1.5">
              <Input
                label="Expiration warning days"
                name="expiration_warning_days"
                type="number"
                min={0}
                step={1}
                required
                requiredMark
                defaultValue={
                  isEdit ? String(props.sku.expiration_warning_days) : "30"
                }
              />
              <p className="text-[12px] text-slate leading-snug">
                How many days before a lot&apos;s expiration to mark it as <span className="font-semibold">EXPIRING</span>. Higher = more lead time to use up old stock first.
              </p>
            </div>
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
                  ? `/staff/inventory/consumables/${encodeURIComponent(props.sku.qr_code)}`
                  : "/staff/inventory?type=consumables"
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
