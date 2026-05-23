import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getEquipmentSkuByQr } from "@/lib/supabase/queries/equipment";
import { getConsumableSkuByQr } from "@/lib/supabase/queries/consumables";
import { getMyPausedState } from "@/lib/supabase/queries/students";
import { MonoId } from "@/components/ui/MonoId";
import { StatusText, type Status } from "@/components/ui/StatusText";
import { SpeedLines } from "@/components/SpeedLines";
import { RequestForm } from "@/components/requests/RequestForm";
import { ItemSummaryCard } from "@/components/requests/ItemSummaryCard";
import { RequestPausedInterstitial } from "@/components/requests/RequestPausedInterstitial";

type SP = { type?: string; sku?: string };

export default async function StudentNewRequestPage({
  searchParams,
}: {
  searchParams: Promise<SP>;
}) {
  const sp = await searchParams;
  const type = sp.type === "consumable" ? "consumable" : "equipment";
  const skuQr = sp.sku?.trim();

  if (!skuQr) {
    redirect(
      type === "consumable" ? "/student/consumables" : "/student/equipment",
    );
  }

  const paused = await getMyPausedState();

  if (type === "equipment") {
    const sku = await getEquipmentSkuByQr(decodeURIComponent(skuQr));
    if (!sku) notFound();
    const backHref = `/student/equipment/${encodeURIComponent(sku.qr_code)}`;
    const status: Status = sku.available_units > 0 ? "AVAILABLE" : "OUT";

    return (
      <Shell
        eyebrow="Equipment · Request"
        qr={sku.qr_code}
        name={sku.name}
        description={sku.description}
        status={status}
        backHref={backHref}
        aside={
          <ItemSummaryCard
            kind="equipment"
            qr_code={sku.qr_code}
            name={sku.name}
            description={sku.description}
            photo_url={sku.photo_url}
            status={status}
            available_units={sku.available_units}
            total_units={sku.total_units}
            location={sku.location}
          />
        }
      >
        {paused.paused ? (
          <RequestPausedInterstitial
            reason={paused.reason}
            suspendedAt={paused.suspendedAt}
            backHref={backHref}
          />
        ) : (
          <RequestForm
            mode="equipment"
            sku={{
              qr_code: sku.qr_code,
              name: sku.name,
              available_units: sku.available_units,
            }}
            cancelHref={backHref}
          />
        )}
      </Shell>
    );
  }

  const result = await getConsumableSkuByQr(decodeURIComponent(skuQr));
  if (!result) notFound();
  const { sku } = result;
  const backHref = `/student/consumables/${encodeURIComponent(sku.qr_code)}`;
  const status: Status = sku.total_remaining > 0 ? "AVAILABLE" : "OUT";

  return (
    <Shell
      eyebrow="Consumable · Request"
      qr={sku.qr_code}
      name={sku.name}
      description={sku.description}
      status={status}
      backHref={backHref}
      aside={
        <ItemSummaryCard
          kind="consumable"
          qr_code={sku.qr_code}
          name={sku.name}
          description={sku.description}
          photo_url={sku.photo_url}
          status={status}
          total_remaining={sku.total_remaining}
          unit={sku.unit}
          per_request_max_quantity={sku.per_request_max_quantity}
        />
      }
    >
      {paused.paused ? (
        <RequestPausedInterstitial
          reason={paused.reason}
          suspendedAt={paused.suspendedAt}
          backHref={backHref}
        />
      ) : (
        <RequestForm
          mode="consumable"
          sku={{
            qr_code: sku.qr_code,
            name: sku.name,
            unit: sku.unit,
            per_request_max_quantity: sku.per_request_max_quantity,
            total_remaining: sku.total_remaining,
          }}
          cancelHref={backHref}
        />
      )}
    </Shell>
  );
}

function Shell({
  eyebrow,
  qr,
  name,
  description,
  status,
  backHref,
  aside,
  children,
}: {
  eyebrow: string;
  qr: string;
  name: string;
  description: string | null;
  status: Status;
  backHref: string;
  aside: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto max-w-6xl px-6 md:px-12 py-12 md:py-16 flex flex-col gap-10">
      <div>
        <Link
          href={backHref}
          className="inline-flex items-center gap-2 font-mono uppercase text-caps-sm text-slate hover:text-navy tracking-[0.1em] font-semibold"
        >
          <ArrowLeft size={16} strokeWidth={1.75} />
          Back
        </Link>
      </div>

      <header>
        <div className="flex items-center gap-3">
          <SpeedLines className="w-12 h-5" />
          <p className="font-mono uppercase text-caps-sm text-teal font-semibold">
            {eyebrow}
          </p>
        </div>

        {/* Mobile-only compact header (desktop sees this in the aside instead) */}
        <div className="md:hidden">
          <div className="mt-1 flex items-baseline justify-between gap-3 flex-wrap">
            <MonoId id={qr} />
            <StatusText status={status} />
          </div>
          <h1 className="mt-3 font-display italic font-extrabold text-display text-navy leading-tight">
            {name}
          </h1>
          {description && (
            <p className="mt-3 text-[16px] text-slate max-w-2xl leading-relaxed">
              {description}
            </p>
          )}
        </div>

        {/* Desktop-only headline (item details live in the sticky aside) */}
        <h1 className="hidden md:block mt-2 font-display italic font-extrabold text-[48px] text-navy leading-[1.05]">
          Submit a request
        </h1>
        <p className="hidden md:block mt-2 text-[16px] text-slate max-w-xl leading-relaxed">
          Pick the dates and quantity. Staff will scan + approve at the counter.
        </p>
      </header>

      {/* MAIN — form left, sticky item card right (desktop) */}
      <div className="grid gap-10 md:grid-cols-[1fr_minmax(0,_340px)] md:items-start">
        <section>{children}</section>
        <aside className="md:sticky md:top-24">{aside}</aside>
      </div>
    </div>
  );
}
