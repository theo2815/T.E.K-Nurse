import { notFound } from "next/navigation";
import { getConsumableSkuByQr } from "@/lib/supabase/queries/consumables";
import { PrintCard } from "@/components/qr/PrintCard";
import { PrintToolbar } from "@/components/qr/PrintToolbar";

export default async function PrintConsumableQrPage({
  params,
}: {
  params: Promise<{ qr: string }>;
}) {
  const { qr } = await params;
  const data = await getConsumableSkuByQr(decodeURIComponent(qr));
  if (!data) notFound();

  const { sku } = data;

  return (
    <>
      <PrintToolbar
        backHref={`/staff/inventory/consumables/${encodeURIComponent(sku.qr_code)}`}
        backLabel="Back to SKU"
        title={`Print QR · ${sku.name}`}
        subtitle={`Single card · A4 sheet`}
        downloadable={{ qrCode: sku.qr_code }}
      />

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
            location: null,
          }}
        />
      </section>
    </>
  );
}
