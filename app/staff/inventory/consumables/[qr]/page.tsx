import { notFound } from "next/navigation";
import {
  getConsumableSkuByQr,
  getLastConsumableUsage,
} from "@/lib/supabase/queries/consumables";
import { ConsumableSkuDetail } from "@/components/catalog/ConsumableSkuDetail";

export default async function StaffConsumableDetailPage({
  params,
}: {
  params: Promise<{ qr: string }>;
}) {
  const { qr } = await params;
  const data = await getConsumableSkuByQr(decodeURIComponent(qr));
  if (!data) notFound();

  const lastActivity = await getLastConsumableUsage(data.sku.id);

  return (
    <div className="mx-auto max-w-6xl px-6 md:px-12 py-12 md:py-16">
      <ConsumableSkuDetail
        sku={data.sku}
        lots={data.lots}
        backHref="/staff/inventory?type=consumables"
        role="staff"
        lastActivity={lastActivity}
      />
    </div>
  );
}
