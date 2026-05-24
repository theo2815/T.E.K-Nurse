"use client";

import { useState } from "react";
import { useProgressRouter } from "@/lib/use-progress-router";
import {
  ArrowRightLeft,
  Wrench,
  AlertTriangle,
  Undo2,
  PackagePlus,
} from "lucide-react";
import type { EquipmentSku } from "@/lib/supabase/queries/equipment";
import { CountAdjustModal } from "./CountAdjustModal";
import { ReceiveStockModal } from "./ReceiveStockModal";

type Preset =
  | "free"
  | "mark-maintenance"
  | "recover-maintenance"
  | "mark-lost"
  | "recover-lost";

export function EquipmentCountActions({ sku }: { sku: EquipmentSku }) {
  const [openPreset, setOpenPreset] = useState<Preset | null>(null);
  const [receiveOpen, setReceiveOpen] = useState(false);
  const router = useProgressRouter();

  const canMaintain = sku.available_units > 0;
  const canRecoverMaintenance = sku.maintenance_units > 0;
  const canMarkLost = sku.available_units > 0;
  const canRecoverLost = sku.lost_units > 0;

  return (
    <>
      <div>
        <p className="font-mono uppercase text-caps-sm font-semibold tracking-[0.1em] text-slate mb-2 inline-flex items-center gap-1.5">
          <PackagePlus size={14} strokeWidth={2} />
          Stock
        </p>

        <button
          type="button"
          onClick={() => setReceiveOpen(true)}
          className="inline-flex items-center justify-center gap-2 bg-navy text-white font-mono uppercase text-[14px] tracking-[0.12em] font-bold px-5 py-3 rounded transition-colors hover:bg-navy-deep active:bg-navy-deep w-full"
        >
          <PackagePlus size={15} strokeWidth={2} />
          Receive new stock…
        </button>
      </div>

      <div>
        <p className="font-mono uppercase text-caps-sm font-semibold tracking-[0.1em] text-slate mb-2 inline-flex items-center gap-1.5">
          <ArrowRightLeft size={14} strokeWidth={2} />
          Move units
        </p>

        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={() => setOpenPreset("free")}
            className="inline-flex items-center justify-center gap-2 bg-teal text-white font-mono uppercase text-[14px] tracking-[0.12em] font-bold px-5 py-3 rounded transition-colors hover:bg-teal-deep active:bg-navy-deep w-full"
          >
            <ArrowRightLeft size={15} strokeWidth={2} />
            Move units…
          </button>

          {canMaintain && (
            <ShortcutButton
              icon={<Wrench size={14} strokeWidth={2} />}
              label="Mark 1 maintenance"
              onClick={() => setOpenPreset("mark-maintenance")}
            />
          )}
          {canRecoverMaintenance && (
            <ShortcutButton
              icon={<Undo2 size={14} strokeWidth={2} />}
              label={`Recover ${sku.maintenance_units} from maintenance`}
              onClick={() => setOpenPreset("recover-maintenance")}
            />
          )}
          {canMarkLost && (
            <ShortcutButton
              icon={<AlertTriangle size={14} strokeWidth={2} />}
              label="Mark 1 lost"
              onClick={() => setOpenPreset("mark-lost")}
              danger
            />
          )}
          {canRecoverLost && (
            <ShortcutButton
              icon={<Undo2 size={14} strokeWidth={2} />}
              label={`Recover ${sku.lost_units} from lost`}
              onClick={() => setOpenPreset("recover-lost")}
            />
          )}
        </div>
      </div>

      {openPreset && (
        <CountAdjustModal
          open={openPreset !== null}
          onClose={() => setOpenPreset(null)}
          sku={sku}
          preset={openPreset}
          onSuccess={() => router.refresh()}
        />
      )}
      {receiveOpen && (
        <ReceiveStockModal
          open={receiveOpen}
          onClose={() => setReceiveOpen(false)}
          sku={sku}
          onSuccess={() => router.refresh()}
        />
      )}
    </>
  );
}

function ShortcutButton({
  icon,
  label,
  onClick,
  danger,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  const tone = danger
    ? "text-red-deep border-red-deep/40 hover:border-red-deep hover:bg-red-deep/5"
    : "text-navy border-rule hover:border-teal hover:text-teal-deep hover:bg-paper";
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-2 bg-transparent border-[1.5px] font-mono uppercase text-[12.5px] tracking-[0.1em] font-bold px-3 py-2 rounded transition-colors text-left ${tone}`}
    >
      {icon}
      {label}
    </button>
  );
}
