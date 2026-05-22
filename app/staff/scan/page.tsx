import Link from "next/link";
import { ArrowRight, Layers } from "lucide-react";
import { SpeedLines } from "@/components/SpeedLines";
import { ScanActionShell } from "@/components/scan/ScanActionShell";

export default function StaffScanPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 md:px-10 py-10 md:py-14 flex flex-col gap-10">
      {/* Header */}
      <header>
        <div className="flex items-center gap-3 mb-2">
          <SpeedLines className="w-12 h-5" />
          <p className="font-mono uppercase text-caps-sm text-teal font-semibold tracking-[0.1em]">
            Camera
          </p>
        </div>
        <h1 className="font-display italic font-extrabold text-display md:text-[48px] text-navy leading-[1.05]">
          Scan
        </h1>
        <hr className="mt-3 mb-0 w-12" />
        <p className="mt-4 text-[15px] text-slate max-w-prose leading-relaxed">
          Point at a T.E.K Nurse QR card to borrow, return, or log usage.
          Card damaged or camera blocked? Use{" "}
          <span className="font-mono uppercase text-caps-sm text-navy font-semibold tracking-[0.08em]">
            Find item
          </span>{" "}
          below.
        </p>
      </header>

      {/* Scanner + picker + action modals */}
      <ScanActionShell />

      {/* Browse inventory link */}
      <section className="border-t border-rule pt-6">
        <Link
          href="/staff/inventory"
          className="group inline-flex items-center justify-between gap-3 w-full px-4 py-3.5 rounded border-[1.5px] border-rule bg-paper hover:border-teal transition-colors"
        >
          <span className="inline-flex items-center gap-2.5 text-navy font-mono uppercase text-[14px] tracking-[0.1em] font-bold">
            <Layers size={16} strokeWidth={1.75} className="text-teal" />
            Browse full inventory
          </span>
          <ArrowRight
            size={16}
            strokeWidth={2}
            aria-hidden
            className="text-slate/60 group-hover:text-teal transition-transform group-hover:translate-x-0.5"
          />
        </Link>
      </section>
    </div>
  );
}
