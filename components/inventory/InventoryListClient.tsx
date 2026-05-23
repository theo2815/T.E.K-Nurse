"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { EquipmentList } from "@/components/catalog/EquipmentList";
import { ConsumableList } from "@/components/catalog/ConsumableList";
import { BulkActionBar } from "@/components/inventory/BulkActionBar";
import { BulkDeleteModal } from "@/components/inventory/BulkDeleteModal";
import type { EquipmentSku } from "@/lib/supabase/queries/equipment";
import type { ConsumableSkuWithStock } from "@/lib/supabase/queries/consumables";

type EquipmentProps = {
  type: "equipment";
  skus: EquipmentSku[];
  detailHrefBase: string;
};

type ConsumableProps = {
  type: "consumables";
  skus: ConsumableSkuWithStock[];
  detailHrefBase: string;
};

type Props = (EquipmentProps | ConsumableProps) & {
  /** True when a filter chip or search query is active. Forwarded to the
   *  underlying list so the empty state can differentiate "no matches" from
   *  "no SKUs in the database yet". */
  isFiltered: boolean;
};

export function InventoryListClient(props: Props) {
  const [selected, setSelected] = useState<Map<string, string>>(new Map());
  const [confirmOpen, setConfirmOpen] = useState(false);
  const searchParams = useSearchParams();

  // Clear selection when filter / search / type tab changes.
  const filterKey = `${searchParams.get("type") ?? ""}|${searchParams.get("filter") ?? ""}|${searchParams.get("q") ?? ""}`;
  useEffect(() => {
    setSelected(new Map());
  }, [filterKey]);

  const handleToggle = useCallback((id: string, name: string) => {
    setSelected((prev) => {
      const next = new Map(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.set(id, name);
      }
      return next;
    });
  }, []);

  const clearSelection = useCallback(() => setSelected(new Map()), []);

  const selectedIds = useMemo(() => new Set(selected.keys()), [selected]);

  const items = useMemo(
    () => Array.from(selected, ([id, name]) => ({ id, name })),
    [selected],
  );

  const modalType = props.type === "equipment" ? "equipment" : "consumable";

  return (
    <>
      {props.type === "equipment" ? (
        <EquipmentList
          skus={props.skus}
          detailHrefBase={props.detailHrefBase}
          selectedIds={selectedIds}
          onToggle={handleToggle}
          isFiltered={props.isFiltered}
        />
      ) : (
        <ConsumableList
          skus={props.skus}
          detailHrefBase={props.detailHrefBase}
          selectedIds={selectedIds}
          onToggle={handleToggle}
          isFiltered={props.isFiltered}
        />
      )}

      <BulkActionBar
        count={selected.size}
        onClear={clearSelection}
        onDelete={() => setConfirmOpen(true)}
      />

      <BulkDeleteModal
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        type={modalType}
        items={items}
        onSuccess={clearSelection}
      />
    </>
  );
}
