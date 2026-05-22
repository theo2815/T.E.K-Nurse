import { notFound } from "next/navigation";
import {
  getEquipmentSkuByQr,
  getLastEquipmentActivity,
} from "@/lib/supabase/queries/equipment";
import {
  listOpenBorrowsForEquipmentSku,
  listPendingRequestsForEquipmentSku,
} from "@/lib/supabase/queries/staff-requests";
import { EquipmentSkuDetail } from "@/components/catalog/EquipmentSkuDetail";

export default async function StaffEquipmentDetailPage({
  params,
}: {
  params: Promise<{ qr: string }>;
}) {
  const { qr } = await params;
  const sku = await getEquipmentSkuByQr(decodeURIComponent(qr));
  if (!sku) notFound();

  const [lastActivity, openBorrows, pendingRequests] = await Promise.all([
    getLastEquipmentActivity(sku.id),
    listOpenBorrowsForEquipmentSku(sku.id),
    listPendingRequestsForEquipmentSku(sku.id),
  ]);

  return (
    <div className="mx-auto max-w-6xl px-6 md:px-12 py-12 md:py-16">
      <EquipmentSkuDetail
        sku={sku}
        backHref="/staff/inventory"
        role="staff"
        lastActivity={lastActivity}
        openBorrows={openBorrows}
        pendingRequests={pendingRequests}
      />
    </div>
  );
}
