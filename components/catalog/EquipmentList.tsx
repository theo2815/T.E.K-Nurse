import {
  type EquipmentSku,
  equipmentRowStatus,
} from "@/lib/supabase/queries/equipment";
import { SkuCard } from "@/components/catalog/SkuCard";
import { EmptyState } from "@/components/catalog/EmptyState";

export function EquipmentList({
  skus,
  detailHrefBase,
}: {
  skus: EquipmentSku[];
  /** e.g. "/student/equipment" — the qr_code is appended. */
  detailHrefBase: string;
}) {
  if (skus.length === 0) {
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
          />
        );
      })}
    </div>
  );
}
