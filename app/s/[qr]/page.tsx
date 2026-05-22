import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getEquipmentSkuByQr } from "@/lib/supabase/queries/equipment";
import { getConsumableSkuByQr } from "@/lib/supabase/queries/consumables";

export default async function ShortLinkPage({
  params,
}: {
  params: Promise<{ qr: string }>;
}) {
  const { qr } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?next=${encodeURIComponent(`/s/${qr}`)}`);
  }

  const [equipment, consumable] = await Promise.all([
    getEquipmentSkuByQr(qr),
    getConsumableSkuByQr(qr),
  ]);

  if (!equipment && !consumable) {
    notFound();
  }

  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  const role = (profile?.role as "staff" | "student" | undefined) ?? "student";
  const isEquipment = equipment !== null;

  const destination = isEquipment
    ? role === "staff"
      ? `/staff/inventory/equipment/${encodeURIComponent(qr)}`
      : `/student/equipment/${encodeURIComponent(qr)}`
    : role === "staff"
      ? `/staff/inventory/consumables/${encodeURIComponent(qr)}`
      : `/student/consumables/${encodeURIComponent(qr)}`;

  redirect(destination);
}
