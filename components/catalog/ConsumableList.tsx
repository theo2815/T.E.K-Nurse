"use client";

import type { ConsumableSkuWithStock } from "@/lib/supabase/queries/consumables";
import { consumableRowStatus } from "@/lib/inventory/row-status";
import { SkuCard } from "@/components/catalog/SkuCard";
import { EmptyState } from "@/components/catalog/EmptyState";

export function ConsumableList({
  skus,
  detailHrefBase,
  selectedIds,
  onToggle,
  isFiltered,
}: {
  skus: ConsumableSkuWithStock[];
  detailHrefBase: string;
  /** When provided, each row renders a leading checkbox. */
  selectedIds?: Set<string>;
  onToggle?: (id: string, name: string) => void;
  /** True when a filter chip or search query is active. When false, an empty
   *  result means the database itself is empty (not "no matches"). */
  isFiltered?: boolean;
}) {
  if (skus.length === 0) {
    if (isFiltered === false) {
      return onToggle ? (
        <EmptyState
          title="No consumables yet."
          hint="Use the New SKU button above to add your first one."
        />
      ) : (
        <EmptyState
          title="No consumables available yet."
          hint="Supplies will appear here once staff has added them to the catalog."
        />
      );
    }
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
            selected={selectedIds?.has(s.id)}
            onToggle={onToggle ? () => onToggle(s.id, s.name) : undefined}
          />
        );
      })}
    </div>
  );
}
