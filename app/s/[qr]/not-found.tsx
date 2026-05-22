import Link from "next/link";
import { ArrowLeft, SearchX } from "lucide-react";
import { SpeedLines } from "@/components/SpeedLines";

export default function ShortLinkNotFound() {
  return (
    <main className="min-h-screen bg-mist flex items-center justify-center px-6 py-16">
      <div className="mx-auto max-w-lg w-full">
        <div className="flex items-center gap-3">
          <SpeedLines className="w-12 h-5" />
          <p className="font-mono uppercase text-caps-sm text-teal font-semibold tracking-[0.1em]">
            QR scan
          </p>
        </div>

        <h1 className="mt-3 font-display italic font-extrabold text-navy text-display md:text-[56px] leading-[1.05]">
          QR not found
        </h1>

        <hr className="mt-3 mb-6 w-12 border-rule" />

        <p className="text-[17px] text-slate leading-relaxed">
          This QR code isn&rsquo;t linked to any equipment or consumable in
          inventory. The card may be from an older batch, or the item may have
          been removed.
        </p>

        <div className="mt-8 border-[1.5px] border-dashed border-rule rounded p-5 bg-paper flex items-start gap-3">
          <SearchX
            size={20}
            strokeWidth={1.75}
            className="text-slate shrink-0 mt-0.5"
          />
          <div>
            <p className="font-mono uppercase text-caps-sm text-navy font-semibold tracking-[0.1em]">
              What to do
            </p>
            <p className="mt-1 text-[14px] text-slate">
              Try searching inventory by name, or re-scan a fresh QR card.
              Speak to staff if the item should exist.
            </p>
          </div>
        </div>

        <div className="mt-8">
          <Link
            href="/"
            className="inline-flex items-center gap-2 font-mono uppercase text-caps-sm text-navy hover:text-teal-deep tracking-[0.1em] font-semibold"
          >
            <ArrowLeft size={14} strokeWidth={1.75} />
            Back to home
          </Link>
        </div>
      </div>
    </main>
  );
}
