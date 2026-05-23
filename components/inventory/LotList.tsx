"use client";

import { useState } from "react";
import { useProgressRouter } from "@/lib/use-progress-router";
import {
  Plus,
  Pencil,
  XCircle,
  Trash2,
  AlertTriangle,
} from "lucide-react";
import type { ConsumableLot } from "@/lib/supabase/queries/consumables";
import { LotFormModal } from "./LotFormModal";
import { MarkLotDepletedModal } from "./MarkLotDepletedModal";
import { DeleteLotModal } from "./DeleteLotModal";

type ModalState =
  | { kind: "closed" }
  | { kind: "create" }
  | { kind: "edit"; lot: ConsumableLot }
  | { kind: "deplete"; lot: ConsumableLot }
  | { kind: "delete"; lot: ConsumableLot };

function formatDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`);
  return d.toLocaleDateString("en-US", {
    timeZone: "UTC",
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function daysUntil(iso: string): number {
  const today = new Date();
  const start = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
  const target = new Date(`${iso}T00:00:00Z`).getTime();
  return Math.round((target - start) / 86_400_000);
}

export function LotList({
  skuId,
  skuName,
  lots,
  warningDays,
}: {
  skuId: string;
  skuName: string;
  lots: ConsumableLot[];
  warningDays: number;
}) {
  const router = useProgressRouter();
  const [modal, setModal] = useState<ModalState>({ kind: "closed" });

  const sorted = [...lots].sort((a, b) => {
    if (a.is_depleted !== b.is_depleted) return a.is_depleted ? 1 : -1;
    return a.expiration_date.localeCompare(b.expiration_date);
  });

  const onSuccess = () => router.refresh();
  const close = () => setModal({ kind: "closed" });

  return (
    <div>
      <div className="flex items-center justify-between gap-3 mb-3">
        <p className="font-mono uppercase text-caps-sm font-semibold tracking-[0.1em] text-slate">
          All lots
        </p>
        <button
          type="button"
          onClick={() => setModal({ kind: "create" })}
          className="inline-flex items-center gap-2 bg-teal text-white font-mono uppercase text-[12.5px] tracking-[0.1em] font-bold px-3 py-2 rounded hover:bg-teal-deep active:bg-navy-deep"
        >
          <Plus size={14} strokeWidth={2} />
          New lot
        </button>
      </div>

      {sorted.length === 0 ? (
        <div className="border-[1.5px] border-dashed border-rule rounded p-6 text-center bg-mist/50">
          <p className="font-mono uppercase text-caps-sm text-slate tracking-[0.1em] font-semibold">
            No lots yet
          </p>
          <p className="mt-1.5 text-[14px] text-slate">
            Add a lot to start tracking stock and expirations.
          </p>
        </div>
      ) : (
        <div className="border border-rule rounded overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-mist">
              <tr className="font-mono uppercase text-caps-sm font-semibold tracking-[0.08em] text-slate">
                <th className="px-4 py-3">Lot</th>
                <th className="px-4 py-3">Received</th>
                <th className="px-4 py-3">Expires</th>
                <th className="px-4 py-3 text-right">Remaining</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-rule">
              {sorted.map((lot) => {
                const dDays = daysUntil(lot.expiration_date);
                const expired = dDays < 0;
                const expiringSoon = !lot.is_depleted && dDays >= 0 && dDays <= warningDays;
                return (
                  <tr
                    key={lot.id}
                    className={lot.is_depleted ? "bg-mist/40" : "bg-paper"}
                  >
                    <td className="px-4 py-3 font-mono text-[14px] uppercase tracking-[0.06em] text-navy">
                      {lot.lot_number ?? "—"}
                      {lot.is_depleted && (
                        <span className="ml-2 inline-flex items-center gap-1 font-mono text-caps-sm normal-case tracking-normal text-slate">
                          <XCircle size={11} strokeWidth={2} />
                          Depleted
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-[15px] text-slate">
                      {formatDate(lot.received_date)}
                    </td>
                    <td className="px-4 py-3 text-[15px]">
                      <div className={lot.is_depleted ? "text-slate" : "text-navy"}>
                        {formatDate(lot.expiration_date)}
                      </div>
                      {expired && !lot.is_depleted ? (
                        <div className="inline-flex items-center gap-1.5 mt-0.5 font-mono uppercase text-caps-sm font-semibold text-red-deep tracking-[0.08em]">
                          <AlertTriangle size={12} strokeWidth={2} />
                          Expired {Math.abs(dDays)}d ago
                        </div>
                      ) : expiringSoon ? (
                        <div className="inline-flex items-center gap-1.5 mt-0.5 font-mono uppercase text-caps-sm font-semibold text-red-deep tracking-[0.08em]">
                          <AlertTriangle size={12} strokeWidth={2} />
                          In {dDays}d
                        </div>
                      ) : (
                        <div className="mt-0.5 font-mono uppercase text-caps-sm text-slate tracking-[0.08em]">
                          {lot.is_depleted ? "—" : `In ${dDays}d`}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span
                        className={`font-display italic font-extrabold text-[22px] ${
                          lot.is_depleted ? "text-slate/60" : "text-navy"
                        }`}
                      >
                        {lot.quantity_remaining}
                      </span>
                      <span className="ml-1 font-mono text-caps-sm text-slate tracking-[0.08em]">
                        /{lot.quantity_received}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        {!lot.is_depleted && (
                          <RowAction
                            label="Edit"
                            onClick={() => setModal({ kind: "edit", lot })}
                            icon={<Pencil size={14} strokeWidth={2} />}
                          />
                        )}
                        {!lot.is_depleted && (
                          <RowAction
                            label="Deplete"
                            onClick={() => setModal({ kind: "deplete", lot })}
                            icon={<XCircle size={14} strokeWidth={2} />}
                          />
                        )}
                        <RowAction
                          label="Delete"
                          onClick={() => setModal({ kind: "delete", lot })}
                          icon={<Trash2 size={14} strokeWidth={2} />}
                          danger
                        />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {modal.kind === "create" && (
        <LotFormModal
          open
          onClose={close}
          mode="create"
          skuId={skuId}
          skuName={skuName}
          onSuccess={onSuccess}
        />
      )}
      {modal.kind === "edit" && (
        <LotFormModal
          open
          onClose={close}
          mode="edit"
          skuName={skuName}
          lot={modal.lot}
          onSuccess={onSuccess}
        />
      )}
      {modal.kind === "deplete" && (
        <MarkLotDepletedModal
          open
          onClose={close}
          lot={modal.lot}
          onSuccess={onSuccess}
        />
      )}
      {modal.kind === "delete" && (
        <DeleteLotModal open onClose={close} lot={modal.lot} />
      )}
    </div>
  );
}

function RowAction({
  label,
  onClick,
  icon,
  danger,
}: {
  label: string;
  onClick: () => void;
  icon: React.ReactNode;
  danger?: boolean;
}) {
  const tone = danger
    ? "text-red-deep hover:bg-red-deep/10"
    : "text-navy hover:text-teal-deep hover:bg-paper";
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      className={`inline-flex items-center gap-1.5 font-mono uppercase text-caps-sm tracking-[0.1em] font-bold px-2 py-1.5 rounded transition-colors ${tone}`}
    >
      {icon}
      <span className="hidden md:inline">{label}</span>
    </button>
  );
}
