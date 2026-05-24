"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Printer, Download, Check } from "lucide-react";
import { qrToPngDataUrl, qrToPngDataUrlFromUrl } from "@/lib/qr/generate";

/**
 * Screen-only toolbar for the print pages. Hidden during print via
 * Tailwind's `print:hidden` utility. Provides:
 *   - Back link to the originating SKU detail page
 *   - [Print] — invokes window.print()
 *   - [Download PNG] — only on single-card pages; generates a PNG data URL
 *     client-side and triggers a download.
 *
 * For the batch page, pass `downloadable={false}` to hide the PNG button.
 */
export function PrintToolbar({
  backHref,
  backLabel,
  title,
  subtitle,
  downloadable,
}: {
  backHref: string;
  backLabel: string;
  title: string;
  subtitle?: string;
  downloadable:
    | { qrCode: string }
    | { url: string; filename: string }
    | null;
}) {
  const [downloading, setDownloading] = useState(false);
  const [downloaded, setDownloaded] = useState(false);

  async function handleDownload() {
    if (!downloadable) return;
    setDownloading(true);
    try {
      let dataUrl: string;
      let filename: string;
      if ("qrCode" in downloadable) {
        dataUrl = await qrToPngDataUrl(downloadable.qrCode);
        filename = `tek-nurse-qr-${downloadable.qrCode}.png`;
      } else {
        dataUrl = await qrToPngDataUrlFromUrl(downloadable.url);
        filename = downloadable.filename;
      }
      const link = document.createElement("a");
      link.href = dataUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setDownloaded(true);
      setTimeout(() => setDownloaded(false), 1800);
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="print:hidden bg-paper border-b border-rule">
      <div className="mx-auto max-w-5xl px-6 md:px-10 py-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <Link
            href={backHref}
            className="inline-flex items-center gap-2 font-mono uppercase text-caps-sm text-slate hover:text-navy tracking-[0.1em] font-semibold"
          >
            <ArrowLeft size={14} strokeWidth={1.75} />
            {backLabel}
          </Link>
          <h1 className="mt-2 font-display italic font-extrabold text-navy text-display leading-[1.1]">
            {title}
          </h1>
          {subtitle && (
            <p className="mt-1 font-mono uppercase text-caps-sm text-slate tracking-[0.1em]">
              {subtitle}
            </p>
          )}
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {downloadable && (
            <button
              type="button"
              onClick={handleDownload}
              disabled={downloading}
              className="inline-flex items-center justify-center gap-2 bg-transparent text-navy border-[1.5px] border-navy font-mono uppercase text-[15px] tracking-[0.12em] font-bold px-5 py-3 rounded transition-colors hover:bg-paper hover:border-teal hover:text-teal-deep disabled:opacity-40 disabled:pointer-events-none"
            >
              {downloaded ? (
                <Check size={16} strokeWidth={2} />
              ) : (
                <Download size={16} strokeWidth={1.75} />
              )}
              {downloaded ? "Saved" : downloading ? "Saving…" : "Download PNG"}
            </button>
          )}
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center justify-center gap-2 bg-teal text-white font-mono uppercase text-[15px] tracking-[0.12em] font-bold px-6 py-3 rounded transition-colors hover:bg-teal-deep active:bg-navy-deep"
          >
            <Printer size={16} strokeWidth={2} />
            Print
          </button>
        </div>
      </div>
    </div>
  );
}
