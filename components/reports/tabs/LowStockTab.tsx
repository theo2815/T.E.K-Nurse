import Link from "next/link";
import { Package, Beaker, Clock } from "lucide-react";
import {
  getLowStockReport,
  type EquipmentLowStockRow,
  type ConsumableLowStockRow,
  type ExpiringLotRow,
} from "@/lib/supabase/queries/reports";
import { ReportsTable, type ColumnDef } from "../ReportsTable";
import { HeroStat } from "../HeroStat";

function formatDate(iso: string): string {
  return new Date(`${iso}T00:00:00.000Z`)
    .toLocaleDateString("en-US", {
      timeZone: "UTC",
      year: "numeric",
      month: "short",
      day: "numeric",
    });
}

export async function LowStockTab() {
  const report = await getLowStockReport();

  const equipmentColumns: ColumnDef<EquipmentLowStockRow>[] = [
    {
      key: "available",
      header: "Available",
      width: "110px",
      align: "right",
      render: (r) => (
        <span
          className={`font-display italic font-extrabold text-[28px] leading-none ${
            r.available_units === 0 ? "text-red-deep" : "text-red"
          }`}
        >
          {r.available_units}
        </span>
      ),
    },
    {
      key: "threshold",
      header: "Threshold",
      width: "100px",
      align: "right",
      hideOnMobile: true,
      render: (r) => (
        <span className="font-mono uppercase text-caps-md text-slate tracking-[0.04em]">
          {r.low_stock_threshold}
        </span>
      ),
    },
    {
      key: "sku",
      header: "Item",
      render: (r) => (
        <Link
          href={`/staff/inventory/equipment/${encodeURIComponent(r.qr_code)}`}
          className="group inline-flex items-baseline gap-2"
        >
          <span className="font-mono uppercase text-caps-md text-navy font-semibold tracking-[0.04em]">
            {r.qr_code}
          </span>
          <span className="text-[14px] text-navy group-hover:text-teal-deep truncate transition-colors">
            {r.name}
          </span>
        </Link>
      ),
    },
    {
      key: "location",
      header: "Location",
      hideOnMobile: true,
      render: (r) =>
        r.location ? (
          <span className="font-mono uppercase text-caps-md text-slate tracking-[0.04em]">
            {r.location}
          </span>
        ) : (
          <span className="font-mono uppercase text-caps-sm text-slate/50 tracking-[0.08em]">
            —
          </span>
        ),
    },
  ];

  const consumableColumns: ColumnDef<ConsumableLowStockRow>[] = [
    {
      key: "remaining",
      header: "Remaining",
      width: "120px",
      align: "right",
      render: (r) => (
        <span className="inline-flex items-baseline gap-1.5 justify-end">
          <span
            className={`font-display italic font-extrabold text-[28px] leading-none ${
              r.total_remaining === 0 ? "text-red-deep" : "text-red"
            }`}
          >
            {r.total_remaining}
          </span>
          <span className="font-mono uppercase text-caps-sm text-slate tracking-[0.08em]">
            {r.unit}
          </span>
        </span>
      ),
    },
    {
      key: "threshold",
      header: "Threshold",
      width: "100px",
      align: "right",
      hideOnMobile: true,
      render: (r) => (
        <span className="font-mono uppercase text-caps-md text-slate tracking-[0.04em]">
          {r.low_stock_threshold}
        </span>
      ),
    },
    {
      key: "sku",
      header: "Supply",
      render: (r) => (
        <Link
          href={`/staff/inventory/consumables/${encodeURIComponent(r.qr_code)}`}
          className="group inline-flex items-baseline gap-2"
        >
          <span className="font-mono uppercase text-caps-md text-navy font-semibold tracking-[0.04em]">
            {r.qr_code}
          </span>
          <span className="text-[14px] text-navy group-hover:text-teal-deep truncate transition-colors">
            {r.name}
          </span>
        </Link>
      ),
    },
  ];

  const expiringColumns: ColumnDef<ExpiringLotRow>[] = [
    {
      key: "days",
      header: "Days left",
      width: "110px",
      align: "right",
      render: (r) => {
        const expired = r.days_until_expiry < 0;
        return (
          <span
            className={`font-display italic font-extrabold text-[28px] leading-none ${
              expired ? "text-red-deep" : r.days_until_expiry <= 7 ? "text-red" : "text-navy"
            }`}
          >
            {expired ? `${r.days_until_expiry}` : r.days_until_expiry}
          </span>
        );
      },
    },
    {
      key: "sku",
      header: "Supply",
      render: (r) => (
        <Link
          href={`/staff/inventory/consumables/${encodeURIComponent(r.sku_qr)}`}
          className="group inline-flex items-baseline gap-2"
        >
          <span className="font-mono uppercase text-caps-md text-navy font-semibold tracking-[0.04em]">
            {r.sku_qr}
          </span>
          <span className="text-[14px] text-navy group-hover:text-teal-deep truncate transition-colors">
            {r.sku_name}
          </span>
        </Link>
      ),
    },
    {
      key: "lot",
      header: "Lot",
      width: "140px",
      hideOnMobile: true,
      render: (r) =>
        r.lot_number ? (
          <span className="font-mono uppercase text-caps-md text-slate tracking-[0.04em]">
            {r.lot_number}
          </span>
        ) : (
          <span className="font-mono uppercase text-caps-sm text-slate/50 tracking-[0.08em]">
            —
          </span>
        ),
    },
    {
      key: "expires",
      header: "Expires",
      width: "140px",
      render: (r) => (
        <span className="font-mono uppercase text-caps-md text-slate tracking-[0.04em]">
          {formatDate(r.expiration_date)}
        </span>
      ),
    },
    {
      key: "qty",
      header: "Remaining",
      width: "120px",
      align: "right",
      render: (r) => (
        <span className="inline-flex items-baseline gap-1.5 justify-end">
          <span className="font-display italic font-extrabold text-[18px] text-navy">
            {r.quantity_remaining}
          </span>
          <span className="font-mono uppercase text-caps-sm text-slate tracking-[0.08em]">
            {r.unit}
          </span>
        </span>
      ),
    },
  ];

  const allClear =
    report.equipment.length === 0 &&
    report.consumables.length === 0 &&
    report.expiring.length === 0;

  return (
    <div className="flex flex-col gap-8">
      <section className="bg-paper border-[1.5px] border-rule rounded p-5 md:p-6 flex flex-wrap items-end gap-8">
        <HeroStat
          label="Equipment low"
          value={report.equipment.length}
          tone={report.equipment.length > 0 ? "alert" : "default"}
          caption={
            report.equipment.length === 0
              ? "All above threshold"
              : "Below low_stock_threshold"
          }
        />
        <HeroStat
          label="Consumables low"
          value={report.consumables.length}
          tone={report.consumables.length > 0 ? "alert" : "default"}
          caption={
            report.consumables.length === 0
              ? "All above threshold"
              : "Total across active lots"
          }
        />
        <HeroStat
          label="Lots expiring"
          value={report.expiring.length}
          tone={report.expiring.length > 0 ? "alert" : "default"}
          caption={
            report.expiring.length === 0
              ? "Nothing within warning window"
              : "Within per-SKU warning_days"
          }
        />
        <p className="ml-auto font-mono uppercase text-caps-sm text-slate/80 tracking-[0.08em] max-w-sm">
          {allClear
            ? "ALL CLEAR · STOCK + EXPIRY HEALTHY"
            : "AUTO-ALERT EVERY 7 DAYS PER SKU"}
        </p>
      </section>

      <section className="flex flex-col gap-4">
        <header className="flex items-center gap-2.5">
          <Package size={16} strokeWidth={1.75} className="text-teal" />
          <h2 className="font-display italic font-extrabold text-[22px] text-navy">
            Equipment below threshold
          </h2>
        </header>
        <ReportsTable
          rows={report.equipment}
          columns={equipmentColumns}
          rowKey={(r) => r.id}
          emptyTitle="Stock is healthy."
          emptyHint="All equipment SKUs are at or above their low-stock threshold."
        />
      </section>

      <section className="flex flex-col gap-4">
        <header className="flex items-center gap-2.5">
          <Beaker size={16} strokeWidth={1.75} className="text-teal" />
          <h2 className="font-display italic font-extrabold text-[22px] text-navy">
            Consumables below threshold
          </h2>
        </header>
        <ReportsTable
          rows={report.consumables}
          columns={consumableColumns}
          rowKey={(r) => r.id}
          emptyTitle="Stock is healthy."
          emptyHint="Every consumable SKU is at or above its low-stock threshold."
        />
      </section>

      <section className="flex flex-col gap-4">
        <header className="flex items-center gap-2.5">
          <Clock size={16} strokeWidth={1.75} className="text-teal" />
          <h2 className="font-display italic font-extrabold text-[22px] text-navy">
            Lots within warning window
          </h2>
        </header>
        <ReportsTable
          rows={report.expiring}
          columns={expiringColumns}
          rowKey={(r) => r.id}
          emptyTitle="Nothing expiring soon."
          emptyHint="Every active lot is outside its warning window."
        />
      </section>
    </div>
  );
}
