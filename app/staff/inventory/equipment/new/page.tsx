import { EquipmentSkuForm } from "@/components/inventory/EquipmentSkuForm";

export default function NewEquipmentSkuPage() {
  return (
    <div className="mx-auto max-w-6xl px-6 md:px-12 py-12 md:py-16">
      <EquipmentSkuForm mode="create" />
    </div>
  );
}
