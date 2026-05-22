import { notFound } from "next/navigation";
import { getConsumableSkuByQr } from "@/lib/supabase/queries/consumables";
import { ConsumableSkuDetail } from "@/components/catalog/ConsumableSkuDetail";

export default async function StudentConsumableDetailPage({
  params,
}: {
  params: Promise<{ qr: string }>;
}) {
  const { qr } = await params;
  const data = await getConsumableSkuByQr(decodeURIComponent(qr));
  if (!data) notFound();

  return (
    <div className="mx-auto max-w-6xl px-6 md:px-12 py-12 md:py-16">
      <ConsumableSkuDetail
        sku={data.sku}
        lots={data.lots}
        backHref="/student/consumables"
        role="student"
      />
    </div>
  );
}
