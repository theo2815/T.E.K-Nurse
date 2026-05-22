import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  AlertTriangle,
  Activity,
  Pencil,
  Clock,
} from "lucide-react";
import {
  type ConsumableActivity,
  type ConsumableLot,
  type ConsumableSkuWithStock,
  consumableRowStatus,
} from "@/lib/supabase/queries/consumables";
import { MonoId } from "@/components/ui/MonoId";
import { StatusText } from "@/components/ui/StatusText";
import { SpeedLines } from "@/components/SpeedLines";
import { PhotoFrame } from "@/components/catalog/PhotoFrame";
import { StaffConsumableActions } from "@/components/staff/StaffConsumableActions";

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

function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(ms / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function ConsumableSkuDetail({
  sku,
  lots,
  backHref,
  role,
  lastActivity,
}: {
  sku: ConsumableSkuWithStock;
  lots: ConsumableLot[];
  backHref: string;
  role: "student" | "staff";
  lastActivity?: ConsumableActivity | null;
}) {
  const status = consumableRowStatus(sku);
  const isLowStock = status === "LOW STOCK" || status === "OUT";
  const warningDays = sku.expiration_warning_days;
  const heroTone =
    sku.total_remaining === 0
      ? "text-slate"
      : isLowStock
      ? "text-red-deep"
      : "text-navy";

  const activeLots = lots
    .filter((l) => !l.is_depleted)
    .sort((a, b) => a.expiration_date.localeCompare(b.expiration_date));

  return (
    <article className="flex flex-col gap-10">
      <div>
        <Link
          href={backHref}
          className="inline-flex items-center gap-2 font-mono uppercase text-caps-sm text-slate hover:text-navy tracking-[0.1em] font-semibold"
        >
          <ArrowLeft size={16} strokeWidth={1.75} />
          Back
        </Link>
      </div>

      {/* HEADER ROW: title block (left) + photo (right) */}
      <header className="grid gap-8 md:grid-cols-[1fr_minmax(0,_320px)] md:items-start">
        <div>
          <div className="flex items-center gap-3">
            <SpeedLines className="w-12 h-5" />
            <p className="font-mono uppercase text-caps-sm text-teal font-semibold">
              Consumable
            </p>
          </div>
          <div className="mt-1 flex items-baseline justify-between gap-3 flex-wrap">
            <MonoId id={sku.qr_code} />
            <StatusText status={status} emphatic={isLowStock} />
          </div>
          <h1 className="mt-3 font-display italic font-extrabold text-display md:text-[56px] text-navy leading-[1.05]">
            {sku.name}
          </h1>
          {sku.description && (
            <p className="mt-4 text-[17px] text-slate max-w-xl leading-relaxed">
              {sku.description}
            </p>
          )}
        </div>
        <PhotoFrame src={sku.photo_url} alt={sku.name} />
      </header>

      <hr className="border-rule" />

      {/* MAIN ROW: stock+lots (left) + aside (right) */}
      <div className="grid gap-10 md:grid-cols-[1fr_minmax(0,_320px)] md:items-start">
        <section className="flex flex-col gap-8">
          {/* Hero stock numeral */}
          <div>
            <p className="font-mono uppercase text-caps-sm font-semibold tracking-[0.1em] text-slate">
              In stock
            </p>
            <div className="mt-3 flex items-baseline gap-5 flex-wrap">
              <span
                className={`font-display italic font-extrabold leading-none text-[88px] md:text-[112px] tracking-[-0.02em] ${heroTone}`}
              >
                {sku.total_remaining}
              </span>
              <div>
                <p className="font-mono uppercase text-caps-md text-slate tracking-[0.08em] font-semibold">
                  {sku.unit}
                </p>
                <p className="font-mono uppercase text-caps-sm text-slate tracking-[0.08em] mt-0.5">
                  across {activeLots.length} active{" "}
                  {activeLots.length === 1 ? "lot" : "lots"}
                </p>
              </div>
            </div>
          </div>

          {/* Lots table */}
          <div>
            <p className="font-mono uppercase text-caps-sm font-semibold tracking-[0.1em] text-slate mb-3">
              Lots (FIFO order)
            </p>
            {activeLots.length === 0 ? (
              <p className="text-[15px] text-slate italic">
                No active lots. Stock is fully depleted.
              </p>
            ) : (
              <div className="border border-rule rounded overflow-hidden">
                <table className="w-full text-left">
                  <thead className="bg-mist">
                    <tr className="font-mono uppercase text-caps-sm font-semibold tracking-[0.08em] text-slate">
                      <th className="px-4 py-3">Lot</th>
                      <th className="px-4 py-3">Expires</th>
                      <th className="px-4 py-3 text-right">Remaining</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-rule">
                    {activeLots.map((lot) => {
                      const dDays = daysUntil(lot.expiration_date);
                      const isExpiring = dDays <= warningDays;
                      const isExpired = dDays < 0;
                      return (
                        <tr key={lot.id} className="bg-paper">
                          <td className="px-4 py-3 font-mono text-[14px] text-navy">
                            {lot.lot_number ?? "—"}
                          </td>
                          <td className="px-4 py-3 text-[15px]">
                            <div className="text-navy">
                              {formatDate(lot.expiration_date)}
                            </div>
                            {isExpired ? (
                              <div className="inline-flex items-center gap-1.5 mt-0.5 font-mono uppercase text-caps-sm font-semibold text-red-deep tracking-[0.08em]">
                                <AlertTriangle size={12} strokeWidth={2} />
                                Expired {Math.abs(dDays)}d ago
                              </div>
                            ) : isExpiring ? (
                              <div className="inline-flex items-center gap-1.5 mt-0.5 font-mono uppercase text-caps-sm font-semibold text-red-deep tracking-[0.08em]">
                                <AlertTriangle size={12} strokeWidth={2} />
                                In {dDays}d
                              </div>
                            ) : (
                              <div className="mt-0.5 font-mono uppercase text-caps-sm text-slate tracking-[0.08em]">
                                In {dDays}d
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <span className="font-display italic font-extrabold text-[22px] text-navy">
                              {lot.quantity_remaining}
                            </span>
                            <span className="ml-1 font-mono text-caps-sm text-slate tracking-[0.08em]">
                              /{lot.quantity_received}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>

        <aside className="flex flex-col gap-6">
          {role === "student" && <StudentActions sku={sku} />}
          {role === "staff" && (
            <>
              <StaffConsumableActions sku={sku} />
              <StaffActions lastActivity={lastActivity ?? null} unit={sku.unit} />
            </>
          )}

          <MetaBlock label="Per-request limit">
            <p className="text-[15px] text-navy">
              Up to{" "}
              <span className="font-display italic font-extrabold text-[18px]">
                {sku.per_request_max_quantity}
              </span>{" "}
              {sku.unit} per request
            </p>
          </MetaBlock>

          <MetaBlock label="Low-stock alert">
            <p
              className={`text-[15px] ${
                isLowStock ? "text-red-deep font-semibold" : "text-slate"
              }`}
            >
              {isLowStock && (
                <AlertTriangle
                  size={14}
                  strokeWidth={2}
                  className="inline mr-1.5 -mt-0.5"
                />
              )}
              Triggers below {sku.low_stock_threshold} {sku.unit}
            </p>
          </MetaBlock>

          <MetaBlock label="Expiry warning">
            <p className="text-[15px] text-slate">
              Flag lots within {warningDays} days
            </p>
          </MetaBlock>
        </aside>
      </div>
    </article>
  );
}

function MetaBlock({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="font-mono uppercase text-caps-sm font-semibold tracking-[0.1em] text-slate mb-2">
        {label}
      </p>
      {children}
    </div>
  );
}

function StudentActions({ sku }: { sku: ConsumableSkuWithStock }) {
  if (sku.total_remaining > 0) {
    return (
      <Link
        href={`/student/requests/new?type=consumable&sku=${encodeURIComponent(sku.qr_code)}`}
        className="inline-flex items-center justify-center gap-2 bg-teal text-white font-mono uppercase text-[15px] tracking-[0.12em] font-bold px-6 py-4 rounded transition-colors hover:bg-teal-deep active:bg-navy-deep w-full"
      >
        Request supply
        <ArrowRight size={18} strokeWidth={2} />
      </Link>
    );
  }
  return (
    <div className="border-[1.5px] border-dashed border-rule rounded p-4 text-center">
      <p className="font-mono uppercase text-caps-sm text-slate font-semibold tracking-[0.1em]">
        Out of stock
      </p>
      <p className="mt-1 text-[14px] text-slate">
        Wait for new lots before requesting.
      </p>
    </div>
  );
}

function StaffActions({
  lastActivity,
  unit,
}: {
  lastActivity: ConsumableActivity | null;
  unit: string;
}) {
  return (
    <div className="flex flex-col gap-5">
      <div>
        <p className="font-mono uppercase text-caps-sm font-semibold tracking-[0.1em] text-slate mb-2 inline-flex items-center gap-1.5">
          <Activity size={14} strokeWidth={2} />
          Last usage
        </p>
        {lastActivity ? (
          <div className="border-l-[3px] border-teal pl-3 py-1">
            <p className="font-mono uppercase text-caps-sm font-semibold tracking-[0.08em] text-navy">
              Used
            </p>
            <p className="text-[15px] text-navy mt-0.5">
              {lastActivity.student_name}
              <span className="text-slate">
                {" "}
                · {lastActivity.quantity_used} {unit}
              </span>
            </p>
            <p className="font-mono uppercase text-caps-sm text-slate tracking-[0.08em] mt-0.5">
              {timeAgo(lastActivity.when)}
            </p>
          </div>
        ) : (
          <p className="text-[14px] text-slate italic">No usage yet.</p>
        )}
      </div>

      <button
        type="button"
        disabled
        title="Inventory editing arrives in Phase 7"
        className="inline-flex items-center justify-center gap-2 bg-transparent text-slate border-[1.5px] border-rule font-mono uppercase text-[14px] tracking-[0.12em] font-bold px-5 py-3 rounded opacity-60 cursor-not-allowed"
      >
        <Pencil size={16} strokeWidth={1.75} />
        Edit SKU
        <span className="inline-flex items-center gap-1 ml-1 font-mono text-caps-sm normal-case tracking-normal text-slate/80">
          <Clock size={12} strokeWidth={2} /> Phase 7
        </span>
      </button>
    </div>
  );
}
