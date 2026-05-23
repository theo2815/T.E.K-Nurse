import Link from "next/link";
import { QrCode } from "lucide-react";
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
import { InventoryListClient } from "@/components/inventory/InventoryListClient";
import { NewSkuButton } from "@/components/inventory/NewSkuButton";

function HeaderActions() {
  return (
    <div className="flex flex-wrap items-center gap-2 self-start">
      <NewSkuButton />
      <Link
        href="/print/batch"
        target="_blank"
        rel="noopener"
        className="inline-flex items-center justify-center gap-2 bg-transparent text-navy border-[1.5px] border-navy font-mono uppercase text-[14px] tracking-[0.12em] font-bold px-5 py-3 rounded transition-colors hover:bg-paper hover:border-teal hover:text-teal-deep"
      >
        <QrCode size={16} strokeWidth={1.75} />
        Print QR batch
      </Link>
    </div>
  );
}

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
    const isFiltered = filter !== "ALL" || search.length > 0;
    const [skus, summary] = await Promise.all([
      listEquipmentSkus({ filter, search }),
      getEquipmentSummary(),
    ]);

    return (
      <div className="mx-auto max-w-5xl px-6 md:px-12 py-12 md:py-16 flex flex-col gap-8">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <CatalogHeader
            eyebrow="Inventory"
            title="Stock"
            overview={`${summary.total} equipment units · ${summary.available} available · ${summary.borrowed} out`}
          />
          <HeaderActions />
        </div>
        <CatalogTypeTabs tabs={tabs} active={tab} />
        <CatalogControls
          chips={EQUIPMENT_CHIPS}
          defaultFilter="ALL"
          preserveParams={["type"]}
        />
        <InventoryListClient
          type="equipment"
          skus={skus}
          detailHrefBase="/staff/inventory/equipment"
          isFiltered={isFiltered}
        />
      </div>
    );
  }

  const filter = parseConsumableFilter(sp.filter);
  const isFiltered = filter !== "ALL" || search.length > 0;
  const [skus, summary] = await Promise.all([
    listConsumableSkus({ filter, search }),
    getConsumableSummary(),
  ]);

  return (
    <div className="mx-auto max-w-5xl px-6 md:px-12 py-12 md:py-16 flex flex-col gap-8">
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
        <CatalogHeader
          eyebrow="Inventory"
          title="Stock"
          overview={`${summary.sku_count} consumable SKUs · ${summary.in_stock_count} in stock · ${summary.low_stock_count} low`}
        />
        <HeaderActions />
      </div>
      <CatalogTypeTabs tabs={tabs} active={tab} />
      <CatalogControls
        chips={CONSUMABLE_CHIPS}
        defaultFilter="ALL"
        preserveParams={["type"]}
      />
      <InventoryListClient
        type="consumables"
        skus={skus}
        detailHrefBase="/staff/inventory/consumables"
        isFiltered={isFiltered}
      />
    </div>
  );
}
