import { notFound } from "next/navigation";
import { getEquipmentSkuByQr } from "@/lib/supabase/queries/equipment";
import { PrintCard } from "@/components/qr/PrintCard";
import { PrintToolbar } from "@/components/qr/PrintToolbar";

export default async function PrintEquipmentQrPage({
  params,
}: {
  params: Promise<{ qr: string }>;
}) {
  const { qr } = await params;
  const sku = await getEquipmentSkuByQr(decodeURIComponent(qr));
  if (!sku) notFound();

  return (
    <>
      <PrintToolbar
        backHref={`/staff/inventory/equipment/${encodeURIComponent(sku.qr_code)}`}
        backLabel="Back to SKU"
        title={`Print QR · ${sku.name}`}
        subtitle={`Single card · A4 sheet`}
        downloadable={{ qrCode: sku.qr_code }}
      />

      {/* Single-card sheet — one large card centered on A4 */}
      <section
        className="bg-mist print:bg-white mx-auto flex items-center justify-center"
        style={{
          width: "210mm",
          minHeight: "297mm",
          padding: "20mm",
          boxSizing: "border-box",
        }}
      >
        <PrintCard
          size="single"
          data={{
            qrCode: sku.qr_code,
            name: sku.name,
            location: sku.location,
          }}
        />
      </section>
    </>
  );
}
