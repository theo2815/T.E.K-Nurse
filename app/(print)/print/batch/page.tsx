import { listEquipmentSkus } from "@/lib/supabase/queries/equipment";
import { listConsumableSkus } from "@/lib/supabase/queries/consumables";
import {
  BatchPicker,
  type BatchPickerEntry,
} from "@/components/qr/BatchPicker";
import { PrintCard } from "@/components/qr/PrintCard";

export default async function PrintBatchPage() {
  const [equipment, consumables] = await Promise.all([
    listEquipmentSkus(),
    listConsumableSkus(),
  ]);

  const entries: BatchPickerEntry[] = [
    ...equipment.map((sku) => ({
      qrCode: sku.qr_code,
      name: sku.name,
      type: "equipment" as const,
      location: sku.location,
    })),
    ...consumables.map((sku) => ({
      qrCode: sku.qr_code,
      name: sku.name,
      type: "consumable" as const,
      location: null,
    })),
  ];

  // Pre-render every PrintCard on the server so QR generation happens once,
  // server-side, regardless of how the user toggles the selection.
  const renderedCards: Record<string, React.ReactNode> = {};
  for (const e of entries) {
    renderedCards[e.qrCode] = (
      <PrintCard
        key={e.qrCode}
        size="grid"
        data={{
          qrCode: e.qrCode,
          name: e.name,
          location: e.location,
        }}
      />
    );
  }

  return <BatchPicker entries={entries} renderedCards={renderedCards} />;
}
