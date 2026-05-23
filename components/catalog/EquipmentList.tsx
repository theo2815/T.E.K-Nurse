"use client";

import type { EquipmentSku } from "@/lib/supabase/queries/equipment";
import { equipmentRowStatus } from "@/lib/inventory/row-status";
import { SkuCard } from "@/components/catalog/SkuCard";
import { EmptyState } from "@/components/catalog/EmptyState";

export function EquipmentList({
  skus,
  detailHrefBase,
  selectedIds,
  onToggle,
  isFiltered,
}: {
  skus: EquipmentSku[];
  /** e.g. "/student/equipment" — the qr_code is appended. */
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
      // Truly empty — staff sees the New SKU pointer, students see a neutral note.
      return onToggle ? (
        <EmptyState
          title="No equipment yet."
          hint="Use the New SKU button above to add your first one."
        />
      ) : (
        <EmptyState
          title="No equipment available yet."
          hint="Items will appear here once staff has added them to the catalog."
        />
      );
    }
    return (
      <EmptyState
        title="No equipment matches."
        hint="Try clearing the filter or your search term."
      />
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {skus.map((s) => {
        const status = equipmentRowStatus(s);
        const tone: "ok" | "danger" | "muted" =
          status === "AVAILABLE"
            ? "ok"
            : status === "LOW STOCK" || status === "LOST"
            ? "danger"
            : "muted";
        return (
          <SkuCard
            key={s.id}
            href={`${detailHrefBase}/${encodeURIComponent(s.qr_code)}`}
            qr={s.qr_code}
            status={status}
            name={s.name}
            description={s.description}
            meta={s.location ?? undefined}
            count={`${s.available_units} / ${s.total_units}`}
            countLabel="AVAILABLE"
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
