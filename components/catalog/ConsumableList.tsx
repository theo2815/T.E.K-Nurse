import {
  type ConsumableSkuWithStock,
  consumableRowStatus,
} from "@/lib/supabase/queries/consumables";
import { SkuCard } from "@/components/catalog/SkuCard";
import { EmptyState } from "@/components/catalog/EmptyState";

export function ConsumableList({
  skus,
  detailHrefBase,
}: {
  skus: ConsumableSkuWithStock[];
  detailHrefBase: string;
}) {
  if (skus.length === 0) {
    return (
      <EmptyState
        title="No consumables match."
        hint="Try clearing the filter or your search term."
      />
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {skus.map((s) => {
        const status = consumableRowStatus(s);
        const tone: "ok" | "danger" | "muted" =
          status === "AVAILABLE"
            ? "ok"
            : status === "LOW STOCK"
            ? "danger"
            : "muted";
        const expiringMeta =
          s.expiring_soon && s.earliest_expiration && s.days_until_expiry !== null
            ? `Earliest expires in ${s.days_until_expiry} day${s.days_until_expiry === 1 ? "" : "s"}`
            : undefined;
        return (
          <SkuCard
            key={s.id}
            href={`${detailHrefBase}/${encodeURIComponent(s.qr_code)}`}
            qr={s.qr_code}
            status={status}
            name={s.name}
            description={s.description}
            meta={expiringMeta}
            count={String(s.total_remaining)}
            countLabel={`${s.unit.toUpperCase()} REMAINING`}
            countTone={tone}
            photoUrl={s.photo_url}
          />
        );
      })}
    </div>
  );
}
