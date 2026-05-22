import {
  listConsumableSkus,
  getConsumableSummary,
  type ConsumableFilter,
} from "@/lib/supabase/queries/consumables";
import { CatalogHeader } from "@/components/catalog/CatalogHeader";
import { CatalogControls } from "@/components/catalog/CatalogControls";
import { ConsumableList } from "@/components/catalog/ConsumableList";

const FILTER_CHIPS = [
  { value: "ALL", label: "All" },
  { value: "IN_STOCK", label: "In stock" },
  { value: "LOW_STOCK", label: "Low" },
  { value: "EXPIRING", label: "Expiring" },
];

const VALID_FILTERS: ConsumableFilter[] = [
  "ALL",
  "IN_STOCK",
  "LOW_STOCK",
  "EXPIRING",
];

function parseFilter(v: string | undefined): ConsumableFilter {
  return (VALID_FILTERS as string[]).includes(v ?? "")
    ? (v as ConsumableFilter)
    : "ALL";
}

export default async function StudentConsumablesPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string; q?: string }>;
}) {
  const sp = await searchParams;
  const filter = parseFilter(sp.filter);
  const search = sp.q ?? "";

  const [skus, summary] = await Promise.all([
    listConsumableSkus({ filter, search }),
    getConsumableSummary(),
  ]);

  return (
    <div className="mx-auto max-w-5xl px-6 md:px-12 py-12 md:py-16 flex flex-col gap-8">
      <CatalogHeader
        eyebrow="Catalog"
        title="Consumables"
        overview={`${summary.sku_count} supplies · ${summary.in_stock_count} in stock · ${summary.low_stock_count} low`}
      />
      <CatalogControls chips={FILTER_CHIPS} defaultFilter="ALL" />
      <ConsumableList skus={skus} detailHrefBase="/student/consumables" />
    </div>
  );
}
