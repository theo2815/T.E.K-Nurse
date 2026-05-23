import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Package, Beaker, CheckCircle2, XCircle } from "lucide-react";
import {
  getMyRequestById,
  requestStatusLabel,
  type RequestType,
} from "@/lib/supabase/queries/requests";
import { MonoId } from "@/components/ui/MonoId";
import { StatusText, type Status } from "@/components/ui/StatusText";
import { SpeedLines } from "@/components/SpeedLines";
import { PhotoFrame } from "@/components/catalog/PhotoFrame";
import { CancelButton } from "@/components/requests/CancelButton";
import { PickupCodeCard } from "@/components/student/PickupCodeCard";

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

function formatApprovedAt(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default async function StudentRequestDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ type?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const type = parseType(sp.type);

  const req = await getMyRequestById({ id, type });
  if (!req) notFound();

  const isPending = req.status === "PENDING_PICKUP";
  const TypeIcon = req.type === "equipment" ? Package : Beaker;
  const eyebrow = req.type === "equipment" ? "EQUIPMENT · REQUEST" : "CONSUMABLE · REQUEST";
  const statusLabel = requestStatusLabel(req.status) as Status;
  const shortId = req.id.slice(0, 4).toUpperCase();

  return (
    <div className="mx-auto max-w-4xl px-6 md:px-12 py-12 md:py-16">
      <article className="flex flex-col gap-10">
        <div>
          <Link
            href="/student/requests"
            className="inline-flex items-center gap-2 font-mono uppercase text-caps-sm text-slate hover:text-navy tracking-[0.1em] font-semibold"
          >
            <ArrowLeft size={16} strokeWidth={1.75} />
            Back to requests
          </Link>

          <header className="mt-6 grid gap-8 md:grid-cols-[1fr_minmax(0,_280px)] md:items-start">
            <div>
              <div className="flex items-center gap-3">
                <SpeedLines className="w-12 h-5" />
                <p className="font-mono uppercase text-caps-sm text-teal font-semibold">
                  {eyebrow} · #{shortId}
                </p>
              </div>

              <div className="mt-1 flex items-baseline justify-between gap-3 flex-wrap">
                <MonoId id={req.sku.qr_code} />
                <StatusText
                  status={statusLabel}
                  emphatic={req.status === "PENDING_PICKUP" || req.status === "APPROVED"}
                />
              </div>

              <h1 className="mt-3 font-display italic font-extrabold text-display md:text-[48px] text-navy leading-tight">
                {req.sku.name}
              </h1>
              {req.sku.description && (
                <p className="mt-3 text-[17px] text-slate max-w-2xl leading-relaxed">
                  {req.sku.description}
                </p>
              )}
            </div>
            <PhotoFrame src={req.sku.photo_url} alt={req.sku.name} />
          </header>
        </div>

        <div className="grid gap-8 md:grid-cols-[200px_1fr] md:items-baseline">
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
            <TypeIcon size={18} strokeWidth={1.75} className="text-teal" />
            <span className="font-display italic font-extrabold text-[24px]">
              {req.quantity}
            </span>
            <span className="text-[15px] text-slate">
              {req.sku.unit ?? (req.quantity === 1 ? "unit" : "units")}
            </span>
          </p>

          <SectionLabel>Expires</SectionLabel>
          <p className="text-[17px] text-navy">{formatExpiresAt(req.expires_at)}</p>

          {req.notes && (
            <>
              <SectionLabel>Notes</SectionLabel>
              <p className="text-[16px] text-slate italic max-w-xl leading-relaxed">
                &ldquo;{req.notes}&rdquo;
              </p>
            </>
          )}
        </div>

        <hr className="border-rule" />

        {isPending && (
          <section className="pt-2">
            <CancelButton id={req.id} type={req.type} />
          </section>
        )}

        {req.status === "APPROVED" && req.pickup_code && req.pickup_expires_at && (
          <PickupCodeCard
            code={req.pickup_code}
            expiresAt={req.pickup_expires_at}
          />
        )}

        {req.status === "APPROVED" && req.approved_at && (
          <section className="border-l-4 border-green bg-paper rounded p-5 flex flex-col gap-2">
            <p className="inline-flex items-center gap-2 font-mono uppercase text-caps-sm text-green font-semibold tracking-[0.1em]">
              <CheckCircle2 size={16} strokeWidth={2} />
              Approved by staff
            </p>
            <p className="text-[15px] text-slate">
              {formatApprovedAt(req.approved_at)}
              {req.approved_by_name && <> · by {req.approved_by_name}</>}
            </p>
          </section>
        )}

        {req.status === "RELEASED" && req.released_at && (
          <section className="border-l-4 border-green bg-paper rounded p-5 flex flex-col gap-2">
            <p className="inline-flex items-center gap-2 font-mono uppercase text-caps-sm text-green font-semibold tracking-[0.1em]">
              <CheckCircle2 size={16} strokeWidth={2} />
              Picked up
            </p>
            <p className="text-[15px] text-slate">
              {formatApprovedAt(req.released_at)}
              {req.type === "equipment" && req.expected_return_date && (
                <> · return by {formatDate(req.expected_return_date)}</>
              )}
            </p>
            <p className="text-[14px] text-slate">
              See <Link href="/student/history" className="text-teal font-semibold underline underline-offset-2 hover:text-teal-deep">your history</Link> for the open borrow.
            </p>
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
                "This request expired before pickup. Submit a new one if you still need the item."}
              {req.status === "SKIPPED" &&
                "Staff issued the units to another borrower. Submit a new request when stock returns."}
              {req.status === "CANCELLED" && "You cancelled this request."}
            </p>
          </section>
        )}

        {req.status === "DECLINED" && (
          <section className="border-l-4 border-red-deep bg-paper rounded p-5 flex flex-col gap-3">
            <p className="inline-flex items-center gap-2 font-mono uppercase text-caps-sm text-red-deep font-semibold tracking-[0.1em]">
              <XCircle size={16} strokeWidth={2} />
              Declined by staff
            </p>
            {req.decline_reason && (
              <div>
                <p className="font-mono uppercase text-caps-sm text-slate font-semibold tracking-[0.1em] mb-1">
                  Reason
                </p>
                <p className="text-[16px] text-slate italic leading-relaxed border-l-[3px] border-red-deep pl-4 max-w-xl">
                  &ldquo;{req.decline_reason}&rdquo;
                </p>
              </div>
            )}
            <p className="text-[14px] text-slate">
              Submit a new request if you still need this item — staff may
              approve under different conditions.
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
