import { ConsumableSkuForm } from "@/components/inventory/ConsumableSkuForm";

export default function NewConsumableSkuPage() {
  return (
    <div className="mx-auto max-w-6xl px-6 md:px-12 py-12 md:py-16">
      <ConsumableSkuForm mode="create" />
    </div>
  );
}
