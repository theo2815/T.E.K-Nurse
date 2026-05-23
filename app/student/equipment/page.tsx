import {
  listEquipmentSkus,
  getEquipmentSummary,
  type EquipmentFilter,
} from "@/lib/supabase/queries/equipment";
import { CatalogHeader } from "@/components/catalog/CatalogHeader";
import { CatalogControls } from "@/components/catalog/CatalogControls";
import { EquipmentList } from "@/components/catalog/EquipmentList";

const FILTER_CHIPS = [
  { value: "ALL", label: "All" },
  { value: "AVAILABLE", label: "Available" },
  { value: "OUT", label: "Out" },
  { value: "MAINTENANCE", label: "Maintenance" },
];

const VALID_FILTERS: EquipmentFilter[] = [
  "ALL",
  "AVAILABLE",
  "OUT",
  "MAINTENANCE",
];

function parseFilter(v: string | undefined): EquipmentFilter {
  return (VALID_FILTERS as string[]).includes(v ?? "")
    ? (v as EquipmentFilter)
    : "ALL";
}

export default async function StudentEquipmentPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string; q?: string }>;
}) {
  const sp = await searchParams;
  const filter = parseFilter(sp.filter);
  const search = sp.q ?? "";
  const isFiltered = filter !== "ALL" || search.length > 0;

  const [skus, summary] = await Promise.all([
    listEquipmentSkus({ filter, search }),
    getEquipmentSummary(),
  ]);

  return (
    <div className="mx-auto max-w-5xl px-6 md:px-12 py-12 md:py-16 flex flex-col gap-8">
      <CatalogHeader
        eyebrow="Catalog"
        title="Equipment"
        overview={`${summary.total} units · ${summary.available} available · ${summary.borrowed} out`}
      />
      <CatalogControls chips={FILTER_CHIPS} defaultFilter="ALL" />
      <EquipmentList
        skus={skus}
        detailHrefBase="/student/equipment"
        isFiltered={isFiltered}
      />
    </div>
  );
}
