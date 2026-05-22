import {
  listEquipmentSkus,
  getEquipmentSummary,
  type EquipmentFilter,
} from "@/lib/supabase/queries/equipment";
import {
  listConsumableSkus,
  getConsumableSummary,
  type ConsumableFilter,
} from "@/lib/supabase/queries/consumables";
import { CatalogHeader } from "@/components/catalog/CatalogHeader";
import { CatalogControls } from "@/components/catalog/CatalogControls";
import { CatalogTypeTabs } from "@/components/catalog/CatalogTypeTabs";
import { EquipmentList } from "@/components/catalog/EquipmentList";
import { ConsumableList } from "@/components/catalog/ConsumableList";

const EQUIPMENT_CHIPS = [
  { value: "ALL", label: "All" },
  { value: "AVAILABLE", label: "Available" },
  { value: "OUT", label: "Out" },
  { value: "MAINTENANCE", label: "Maintenance" },
];

const CONSUMABLE_CHIPS = [
  { value: "ALL", label: "All" },
  { value: "IN_STOCK", label: "In stock" },
  { value: "LOW_STOCK", label: "Low" },
  { value: "EXPIRING", label: "Expiring" },
];

const EQUIPMENT_FILTERS: EquipmentFilter[] = [
  "ALL",
  "AVAILABLE",
  "OUT",
  "MAINTENANCE",
];

const CONSUMABLE_FILTERS: ConsumableFilter[] = [
  "ALL",
  "IN_STOCK",
  "LOW_STOCK",
  "EXPIRING",
];

function parseEquipmentFilter(v: string | undefined): EquipmentFilter {
  return (EQUIPMENT_FILTERS as string[]).includes(v ?? "")
    ? (v as EquipmentFilter)
    : "ALL";
}

function parseConsumableFilter(v: string | undefined): ConsumableFilter {
  return (CONSUMABLE_FILTERS as string[]).includes(v ?? "")
    ? (v as ConsumableFilter)
    : "ALL";
}

type Tab = "equipment" | "consumables";

export default async function StaffInventoryPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; filter?: string; q?: string }>;
}) {
  const sp = await searchParams;
  const tab: Tab = sp.type === "consumables" ? "consumables" : "equipment";
  const search = sp.q ?? "";

  const tabs = [
    { value: "equipment", label: "Equipment", href: "/staff/inventory" },
    {
      value: "consumables",
      label: "Consumables",
      href: "/staff/inventory?type=consumables",
    },
  ];

  if (tab === "equipment") {
    const filter = parseEquipmentFilter(sp.filter);
    const [skus, summary] = await Promise.all([
      listEquipmentSkus({ filter, search }),
      getEquipmentSummary(),
    ]);

    return (
      <div className="mx-auto max-w-5xl px-6 md:px-12 py-12 md:py-16 flex flex-col gap-8">
        <CatalogHeader
          eyebrow="Inventory"
          title="Stock"
          overview={`${summary.total} equipment units · ${summary.available} available · ${summary.borrowed} out`}
        />
        <CatalogTypeTabs tabs={tabs} active={tab} />
        <CatalogControls
          chips={EQUIPMENT_CHIPS}
          defaultFilter="ALL"
          preserveParams={["type"]}
        />
        <EquipmentList
          skus={skus}
          detailHrefBase="/staff/inventory/equipment"
        />
      </div>
    );
  }

  const filter = parseConsumableFilter(sp.filter);
  const [skus, summary] = await Promise.all([
    listConsumableSkus({ filter, search }),
    getConsumableSummary(),
  ]);

  return (
    <div className="mx-auto max-w-5xl px-6 md:px-12 py-12 md:py-16 flex flex-col gap-8">
      <CatalogHeader
        eyebrow="Inventory"
        title="Stock"
        overview={`${summary.sku_count} consumable SKUs · ${summary.in_stock_count} in stock · ${summary.low_stock_count} low`}
      />
      <CatalogTypeTabs tabs={tabs} active={tab} />
      <CatalogControls
        chips={CONSUMABLE_CHIPS}
        defaultFilter="ALL"
        preserveParams={["type"]}
      />
      <ConsumableList
        skus={skus}
        detailHrefBase="/staff/inventory/consumables"
      />
    </div>
  );
}
