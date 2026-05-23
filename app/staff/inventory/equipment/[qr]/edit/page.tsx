import { notFound } from "next/navigation";
import { getEquipmentSkuByQr } from "@/lib/supabase/queries/equipment";
import { EquipmentSkuForm } from "@/components/inventory/EquipmentSkuForm";

export default async function EditEquipmentSkuPage({
  params,
}: {
  params: Promise<{ qr: string }>;
}) {
  const { qr } = await params;
  const sku = await getEquipmentSkuByQr(decodeURIComponent(qr));
  if (!sku) notFound();

  return (
    <div className="mx-auto max-w-6xl px-6 md:px-12 py-12 md:py-16">
      <EquipmentSkuForm mode="edit" sku={sku} />
    </div>
  );
}
