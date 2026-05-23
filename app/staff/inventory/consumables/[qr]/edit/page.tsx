import { notFound } from "next/navigation";
import { getConsumableSkuByQr } from "@/lib/supabase/queries/consumables";
import { ConsumableSkuForm } from "@/components/inventory/ConsumableSkuForm";

export default async function EditConsumableSkuPage({
  params,
}: {
  params: Promise<{ qr: string }>;
}) {
  const { qr } = await params;
  const found = await getConsumableSkuByQr(decodeURIComponent(qr));
  if (!found) notFound();

  return (
    <div className="mx-auto max-w-6xl px-6 md:px-12 py-12 md:py-16">
      <ConsumableSkuForm mode="edit" sku={found.sku} />
    </div>
  );
}
