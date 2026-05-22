import { notFound } from "next/navigation";
import { getEquipmentSkuByQr } from "@/lib/supabase/queries/equipment";
import { EquipmentSkuDetail } from "@/components/catalog/EquipmentSkuDetail";

export default async function StudentEquipmentDetailPage({
  params,
}: {
  params: Promise<{ qr: string }>;
}) {
  const { qr } = await params;
  const sku = await getEquipmentSkuByQr(decodeURIComponent(qr));
  if (!sku) notFound();

  return (
    <div className="mx-auto max-w-6xl px-6 md:px-12 py-12 md:py-16">
      <EquipmentSkuDetail
        sku={sku}
        backHref="/student/equipment"
        role="student"
      />
    </div>
  );
}
