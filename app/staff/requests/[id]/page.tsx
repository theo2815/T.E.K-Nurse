import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  Package,
  Beaker,
  CheckCircle2,
  User as UserIcon,
  Mail,
  GraduationCap,
  XCircle,
  Ticket,
} from "lucide-react";
import {
  getPendingRequestById,
  type RequestType,
} from "@/lib/supabase/queries/staff-requests";
import { getEquipmentSkuByQr } from "@/lib/supabase/queries/equipment";
import { getConsumableSkuByQr } from "@/lib/supabase/queries/consumables";
import { MonoId } from "@/components/ui/MonoId";
import { StatusText, type Status } from "@/components/ui/StatusText";
import { SpeedLines } from "@/components/SpeedLines";
import { ApproveRequestAction } from "@/components/staff/ApproveRequestAction";
import { DeclineRequestAction } from "@/components/staff/DeclineRequestAction";
import { VerifyAtPickupAction } from "@/components/staff/VerifyAtPickupAction";
import { CancelReservationAction } from "@/components/staff/CancelReservationAction";

function parseType(v: string | undefined): RequestType {
  return v === "consumable" ? "consumable" : "equipment";
}

function formatDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  return d.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function formatExpiresAt(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
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

function formatCode(code: string): string {
  const clean = code.replace(/[^0-9A-Z]/gi, "").toUpperCase();
  if (clean.length === 6) return `${clean.slice(0, 3)}-${clean.slice(3)}`;
  return clean;
}

const STATUS_LABEL: Record<string, Status> = {
  PENDING_PICKUP: "PENDING PICKUP",
  APPROVED: "READY TO COLLECT",
  RELEASED: "PICKED UP",
  EXPIRED: "EXPIRED",
  SKIPPED: "SKIPPED",
  CANCELLED: "CANCELLED",
  DECLINED: "DECLINED",
};

export default async function StaffRequestDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ type?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const type = parseType(sp.type);

  const req = await getPendingRequestById({ id, type });
  if (!req) notFound();

  const TypeIcon = req.type === "equipment" ? Package : Beaker;
  const eyebrow =
    req.type === "equipment" ? "EQUIPMENT · REQUEST" : "CONSUMABLE · REQUEST";
  const statusLabel = STATUS_LABEL[req.status];
  const shortId = req.id.slice(0, 4).toUpperCase();
  const isPending = req.status === "PENDING_PICKUP";
  const isAwaitingPickup = req.status === "APPROVED";

  // Fetch live SKU stock for the approve modal.
  let approveBlock: React.ReactNode = null;
  if (isPending) {
    if (req.type === "equipment") {
      const sku = await getEquipmentSkuByQr(req.sku.qr_code);
      if (sku) {
        approveBlock = (
          <ApproveRequestAction
            type="equipment"
            request_id={req.id}
            student={req.student}
            quantity={req.quantity}
            expected_return_date={req.expected_return_date ?? ""}
            sku={{
              id: sku.id,
              qr_code: sku.qr_code,
              name: sku.name,
              photo_url: sku.photo_url,
              location: sku.location,
              total_units: sku.total_units,
              available_units: sku.available_units,
              reserved_units: sku.reserved_units,
              borrowed_units: sku.borrowed_units,
            }}
          />
        );
      }
    } else {
      const result = await getConsumableSkuByQr(req.sku.qr_code);
      if (result) {
        approveBlock = (
          <ApproveRequestAction
            type="consumable"
            request_id={req.id}
            student={req.student}
            quantity={req.quantity}
            sku={{
              id: result.sku.id,
              qr_code: result.sku.qr_code,
              name: result.sku.name,
              photo_url: result.sku.photo_url,
              unit: result.sku.unit,
              total_remaining: result.sku.total_remaining,
              per_request_max_quantity: result.sku.per_request_max_quantity,
            }}
          />
        );
      }
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-6 md:px-12 py-12 md:py-16">
      <article className="flex flex-col gap-10">
        <div>
          <Link
            href="/staff/requests"
            className="inline-flex items-center gap-2 font-mono uppercase text-caps-sm text-slate hover:text-navy tracking-[0.1em] font-semibold"
          >
            <ArrowLeft size={16} strokeWidth={1.75} />
            Back to queue
          </Link>

          <div className="mt-6 flex items-center gap-3">
            <SpeedLines className="w-12 h-5" />
            <p className="font-mono uppercase text-caps-sm text-teal font-semibold">
              {eyebrow} · #{shortId}
            </p>
          </div>

          <div className="mt-1 flex items-baseline justify-between gap-3 flex-wrap">
            <MonoId id={req.sku.qr_code} />
            <StatusText
              status={statusLabel}
              emphatic={isPending || isAwaitingPickup}
            />
          </div>

          {/* Student lead — the headline */}
          <p className="mt-6 font-mono uppercase text-caps-sm text-slate/70 tracking-[0.1em]">
            Student
          </p>
          <h1 className="mt-1 font-display italic font-extrabold text-display md:text-[48px] text-navy leading-tight">
            {req.student.full_name}
          </h1>

          <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-[14px] text-slate">
            <span className="inline-flex items-center gap-1.5">
              <Mail size={14} strokeWidth={1.75} className="text-slate/60" />
              <span className="font-mono">{req.student.email}</span>
            </span>
            {req.student.year_section && (
              <span className="inline-flex items-center gap-1.5">
                <GraduationCap
                  size={14}
                  strokeWidth={1.75}
                  className="text-slate/60"
                />
                <span className="font-mono uppercase tracking-[0.06em]">
                  {req.student.year_section}
                </span>
              </span>
            )}
          </div>

          <p className="mt-2 font-mono uppercase text-caps-sm text-slate/70 tracking-[0.08em]">
            Submitted {timeAgo(req.created_at)}
          </p>
        </div>

        <hr className="border-rule" />

        {/* Item block */}
        <section>
          <p className="font-mono uppercase text-caps-sm text-slate font-semibold tracking-[0.1em] mb-3">
            Requested item
          </p>
          <div className="flex items-center gap-4">
            <div className="shrink-0 size-14 rounded border-[1.5px] border-rule flex items-center justify-center text-teal">
              <TypeIcon size={26} strokeWidth={1.75} />
            </div>
            <div>
              <h2 className="font-display italic font-extrabold text-[26px] text-navy leading-tight">
                {req.sku.name}
              </h2>
              {req.sku.description && (
                <p className="mt-1 text-[15px] text-slate max-w-xl">
                  {req.sku.description}
                </p>
              )}
            </div>
          </div>
        </section>

        {/* Dates / qty / notes */}
        <div className="grid gap-x-8 gap-y-6 md:grid-cols-[200px_1fr] md:items-baseline">
          <SectionLabel>Pickup date</SectionLabel>
          <p className="text-[17px] text-navy">{formatDate(req.borrow_date)}</p>

          {req.expected_return_date && (
            <>
              <SectionLabel>Expected return</SectionLabel>
              <p className="text-[17px] text-navy">
                {formatDate(req.expected_return_date)}
              </p>
            </>
          )}

          <SectionLabel>Quantity</SectionLabel>
          <p className="inline-flex items-center gap-2 text-navy">
            <UserIcon size={18} strokeWidth={1.75} className="text-teal" />
            <span className="font-display italic font-extrabold text-[24px]">
              {req.quantity}
            </span>
            <span className="text-[15px] text-slate">
              {req.sku.unit ?? (req.quantity === 1 ? "unit" : "units")}
            </span>
          </p>

          <SectionLabel>Expires</SectionLabel>
          <p className="text-[17px] text-navy">
            {formatExpiresAt(req.expires_at)}
          </p>

          {req.notes && (
            <>
              <SectionLabel>Student notes</SectionLabel>
              <p className="text-[16px] text-slate italic max-w-xl leading-relaxed border-l-[3px] border-teal pl-4">
                &ldquo;{req.notes}&rdquo;
              </p>
            </>
          )}
        </div>

        <hr className="border-rule" />

        {/* Action / status section */}
        {isPending && approveBlock && (
          <section className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <p className="text-[14px] text-slate">
              Approving sends a pickup code to the student. The borrow
              transaction is created when you verify the code and release the
              item at the counter.
            </p>
            <div className="flex flex-col-reverse sm:flex-row sm:items-center gap-3">
              <DeclineRequestAction
                type={req.type}
                request_id={req.id}
                sku={{ qr_code: req.sku.qr_code, name: req.sku.name }}
                student_name={req.student.full_name}
              />
              {approveBlock}
            </div>
          </section>
        )}

        {isPending && !approveBlock && (
          <section className="border-l-4 border-red bg-paper rounded p-5">
            <p className="font-mono uppercase text-caps-sm text-red-deep font-semibold tracking-[0.1em]">
              Item not found
            </p>
            <p className="mt-1 text-[15px] text-slate">
              The SKU for this request was removed from inventory. The request
              cannot be approved.
            </p>
          </section>
        )}

        {isAwaitingPickup && (
          <section className="flex flex-col gap-5">
            <div className="border-[1.5px] border-amber rounded bg-paper overflow-hidden">
              <header className="bg-amber/15 px-5 py-3 flex items-center justify-between border-b border-amber/40">
                <p className="inline-flex items-center gap-2 font-mono uppercase text-[11px] tracking-[0.16em] font-bold text-amber-700">
                  <Ticket size={13} strokeWidth={2} />
                  Awaiting pickup
                </p>
                {req.approved_by_name && req.approved_at && (
                  <p className="font-mono uppercase text-[10.5px] tracking-[0.12em] font-semibold text-slate">
                    Approved by {req.approved_by_name} ·{" "}
                    {timeAgo(req.approved_at)}
                  </p>
                )}
              </header>
              <div className="px-5 py-5 flex flex-col items-center gap-2 text-center">
                <p className="font-mono uppercase text-caps-sm text-slate tracking-[0.12em] font-semibold">
                  Pickup code
                </p>
                <p className="font-mono font-bold text-[36px] md:text-[44px] tracking-[0.14em] text-navy leading-none tabular-nums">
                  {formatCode(req.pickup_code ?? "")}
                </p>
                <p className="text-[14px] text-slate max-w-md leading-relaxed">
                  Student should show this code at the counter. Tap{" "}
                  <span className="font-semibold text-navy">
                    Verify &amp; release
                  </span>{" "}
                  to compare and hand over the item.
                </p>
              </div>
            </div>

            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
              <CancelReservationAction
                type={req.type}
                request_id={req.id}
                student_name={req.student.full_name}
                sku={{ qr_code: req.sku.qr_code, name: req.sku.name }}
              />
              <VerifyAtPickupAction request={req} />
            </div>
          </section>
        )}

        {req.status === "RELEASED" && (
          <section className="border-l-4 border-green bg-paper rounded p-5 flex flex-col gap-2">
            <p className="inline-flex items-center gap-2 font-mono uppercase text-caps-sm text-green font-semibold tracking-[0.1em]">
              <CheckCircle2 size={16} strokeWidth={2} />
              Released to student
            </p>
            <p className="text-[15px] text-slate">
              {req.released_at && (
                <>
                  Picked up{" "}
                  {new Date(req.released_at).toLocaleString("en-US", {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </>
              )}
              {req.released_by_name && <> · by {req.released_by_name}</>}
            </p>
            {req.type === "equipment" && (
              <p className="text-[14px] text-slate">
                See the open borrow under the student&apos;s history.
              </p>
            )}
          </section>
        )}

        {(req.status === "EXPIRED" ||
          req.status === "SKIPPED" ||
          req.status === "CANCELLED") && (
          <section className="border-l-4 border-rule bg-paper rounded p-5">
            <p className="font-mono uppercase text-caps-sm text-slate font-semibold tracking-[0.1em]">
              {statusLabel}
            </p>
            <p className="mt-1 text-[15px] text-slate">
              {req.status === "EXPIRED" &&
                "Pickup window passed before the student arrived."}
              {req.status === "SKIPPED" &&
                "Units were issued to a walk-in instead."}
              {req.status === "CANCELLED" && "The student cancelled this request."}
            </p>
          </section>
        )}

        {req.status === "DECLINED" && (
          <section className="border-l-4 border-red-deep bg-paper rounded p-5 flex flex-col gap-2">
            <p className="inline-flex items-center gap-2 font-mono uppercase text-caps-sm text-red-deep font-semibold tracking-[0.1em]">
              <XCircle size={16} strokeWidth={2} />
              Declined
            </p>
            {req.decline_reason && (
              <p className="text-[16px] text-slate italic leading-relaxed border-l-[3px] border-red-deep pl-4 max-w-xl">
                &ldquo;{req.decline_reason}&rdquo;
              </p>
            )}
            <p className="text-[14px] text-slate">
              Student was notified by email + in-app with this reason.
            </p>
          </section>
        )}
      </article>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="font-mono uppercase text-caps-sm text-slate font-semibold tracking-[0.1em]">
      {children}
    </p>
  );
}
