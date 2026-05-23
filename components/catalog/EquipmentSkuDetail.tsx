import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  MapPin,
  AlertTriangle,
  Activity,
  QrCode,
} from "lucide-react";
import {
  type EquipmentSku,
  type EquipmentActivity,
  equipmentRowStatus,
} from "@/lib/supabase/queries/equipment";
import { MonoId } from "@/components/ui/MonoId";
import { StatusText } from "@/components/ui/StatusText";
import { SpeedLines } from "@/components/SpeedLines";
import { PhotoFrame } from "@/components/catalog/PhotoFrame";
import { StaffEquipmentActions } from "@/components/staff/StaffEquipmentActions";
import { EquipmentCountActions } from "@/components/inventory/EquipmentCountActions";
import { EquipmentStaffEditActions } from "@/components/inventory/EquipmentStaffEditActions";
import type {
  OpenBorrowRow,
  StaffPendingRequestRow,
} from "@/lib/supabase/queries/staff-requests";

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

export function EquipmentSkuDetail({
  sku,
  backHref,
  role,
  lastActivity,
  openBorrows,
  pendingRequests,
}: {
  sku: EquipmentSku;
  backHref: string;
  role: "student" | "staff";
  lastActivity?: EquipmentActivity | null;
  openBorrows?: OpenBorrowRow[];
  pendingRequests?: StaffPendingRequestRow[];
}) {
  const status = equipmentRowStatus(sku);
  const isAlert = status === "LOW STOCK" || status === "LOST";
  const isLowStock = sku.available_units <= sku.low_stock_threshold;
  const heroTone =
    sku.available_units === 0
      ? "text-slate"
      : isLowStock
      ? "text-red-deep"
      : "text-navy";

  return (
    <article className="flex flex-col gap-10">
      {/* Top bar */}
      <div>
        <Link
          href={backHref}
          className="inline-flex items-center gap-2 font-mono uppercase text-caps-sm text-slate hover:text-navy tracking-[0.1em] font-semibold"
        >
          <ArrowLeft size={16} strokeWidth={1.75} />
          Back
        </Link>
      </div>

      {/* HEADER ROW: title block (left) + photo (right) — stacks on mobile */}
      <header className="grid gap-8 md:grid-cols-[1fr_minmax(0,_320px)] md:items-start">
        <div>
          <div className="flex items-center gap-3">
            <SpeedLines className="w-12 h-5" />
            <p className="font-mono uppercase text-caps-sm text-teal font-semibold">
              Equipment
            </p>
          </div>
          <div className="mt-1 flex items-baseline justify-between gap-3 flex-wrap">
            <MonoId id={sku.qr_code} />
            <StatusText status={status} emphatic={isAlert} />
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

      {/* MAIN ROW: hero numeral + buckets (left) + aside (right) */}
      <div className="grid gap-10 md:grid-cols-[1fr_minmax(0,_320px)] md:items-start">
        {/* Left — inventory composition */}
        <section className="flex flex-col gap-8">
          <div>
            <p className="font-mono uppercase text-caps-sm font-semibold tracking-[0.1em] text-slate">
              Available units
            </p>
            <div className="mt-3 flex items-baseline gap-5 flex-wrap">
              <span
                className={`font-display italic font-extrabold leading-none text-[88px] md:text-[112px] tracking-[-0.02em] ${heroTone}`}
              >
                {sku.available_units}
              </span>
              <span className="font-mono uppercase text-caps-md text-slate tracking-[0.08em] font-semibold">
                of {sku.total_units} total
              </span>
            </div>
          </div>

          <div className="grid grid-cols-4 divide-x divide-rule border-y border-rule">
            <BucketCell label="Out" value={sku.borrowed_units} />
            <BucketCell label="Res" value={sku.reserved_units} />
            <BucketCell label="Maint" value={sku.maintenance_units} />
            <BucketCell
              label="Lost"
              value={sku.lost_units}
              alert={sku.lost_units > 0}
            />
          </div>
        </section>

        {/* Right — context aside */}
        <aside className="flex flex-col gap-6">
          {role === "student" && <StudentActions sku={sku} />}
          {role === "staff" && (
            <>
              <StaffEquipmentActions
                sku={sku}
                openBorrows={openBorrows}
                pendingRequests={pendingRequests}
              />
              <EquipmentCountActions sku={sku} />
              <EquipmentStaffEditActions sku={sku} />
              <StaffActions
                lastActivity={lastActivity ?? null}
                qrCode={sku.qr_code}
              />
            </>
          )}

          {sku.location && (
            <MetaBlock label="Location">
              <p className="inline-flex items-center gap-2 text-[17px] text-navy">
                <MapPin size={18} strokeWidth={1.75} className="text-teal" />
                {sku.location}
              </p>
            </MetaBlock>
          )}

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
              Triggers below {sku.low_stock_threshold + 1} units
            </p>
          </MetaBlock>
        </aside>
      </div>
    </article>
  );
}

function BucketCell({
  label,
  value,
  alert,
}: {
  label: string;
  value: number;
  alert?: boolean;
}) {
  const tone = alert
    ? "text-red-deep"
    : value === 0
    ? "text-slate/60"
    : "text-navy";
  return (
    <div className="flex flex-col items-center justify-center py-5 px-2 text-center">
      <span
        className={`font-display italic font-extrabold text-[28px] leading-none ${tone}`}
      >
        {value}
      </span>
      <span className="mt-2 font-mono uppercase text-caps-sm font-semibold tracking-[0.1em] text-slate">
        {label}
      </span>
    </div>
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

function StudentActions({ sku }: { sku: EquipmentSku }) {
  if (sku.available_units > 0) {
    return (
      <Link
        href={`/student/requests/new?type=equipment&sku=${encodeURIComponent(sku.qr_code)}`}
        className="inline-flex items-center justify-center gap-2 bg-teal text-white font-mono uppercase text-[15px] tracking-[0.12em] font-bold px-6 py-4 rounded transition-colors hover:bg-teal-deep active:bg-navy-deep w-full"
      >
        Request to borrow
        <ArrowRight size={18} strokeWidth={2} />
      </Link>
    );
  }
  return (
    <div className="border-[1.5px] border-dashed border-rule rounded p-4 text-center">
      <p className="font-mono uppercase text-caps-sm text-slate font-semibold tracking-[0.1em]">
        None available
      </p>
      <p className="mt-1 text-[14px] text-slate">
        Check back later or pre-request when a unit returns.
      </p>
    </div>
  );
}

function StaffActions({
  lastActivity,
  qrCode,
}: {
  lastActivity: EquipmentActivity | null;
  qrCode: string;
}) {
  return (
    <div className="flex flex-col gap-5">
      <div>
        <p className="font-mono uppercase text-caps-sm font-semibold tracking-[0.1em] text-slate mb-2 inline-flex items-center gap-1.5">
          <Activity size={14} strokeWidth={2} />
          Last activity
        </p>
        {lastActivity ? (
          <div className="border-l-[3px] border-teal pl-3 py-1">
            <p className="font-mono uppercase text-caps-sm font-semibold tracking-[0.08em] text-navy">
              {lastActivity.status === "RETURNED" ||
              lastActivity.status === "RETURNED_LATE"
                ? "Returned"
                : lastActivity.status === "BORROWED"
                ? "Borrowed"
                : lastActivity.status === "OVERDUE"
                ? "Overdue"
                : "Lost"}
            </p>
            <p className="text-[15px] text-navy mt-0.5">
              {lastActivity.student_name}
              {lastActivity.quantity > 1 && (
                <span className="text-slate"> · {lastActivity.quantity} units</span>
              )}
            </p>
            <p className="font-mono uppercase text-caps-sm text-slate tracking-[0.08em] mt-0.5">
              {timeAgo(lastActivity.when)}
            </p>
          </div>
        ) : (
          <p className="text-[14px] text-slate italic">No activity yet.</p>
        )}
      </div>

      <Link
        href={`/print/equipment/${encodeURIComponent(qrCode)}`}
        target="_blank"
        rel="noopener"
        className="inline-flex items-center justify-center gap-2 bg-transparent text-navy border-[1.5px] border-navy font-mono uppercase text-[14px] tracking-[0.12em] font-bold px-5 py-3 rounded transition-colors hover:bg-paper hover:border-teal hover:text-teal-deep"
      >
        <QrCode size={16} strokeWidth={1.75} />
        Print QR
      </Link>
    </div>
  );
}
