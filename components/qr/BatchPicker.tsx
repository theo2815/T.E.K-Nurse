"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Printer,
  Search,
  CheckSquare,
  Square,
  Wrench,
  Beaker,
  X,
  Download,
  Check,
} from "lucide-react";
import { PrintSheet9Up } from "@/components/qr/PrintSheet9Up";
import { qrToPngDataUrl, qrToSvgString } from "@/lib/qr/generate";

export type BatchPickerEntry = {
  qrCode: string;
  name: string;
  type: "equipment" | "consumable";
  location: string | null;
};

type Tab = "equipment" | "consumables" | "selected";

/**
 * Multi-SKU batch print picker. Maintains selection state client-side; the
 * actual print cards are pre-rendered on the server and passed in via
 * `renderedCards` (a record keyed by qr_code). This lets us keep QR generation
 * on the server while the picker UI stays interactive.
 *
 * Tabs: Equipment / Consumables / Selected.
 * Bulk actions: Select all (visible tab), Clear selection.
 *
 * On print:
 *   - The picker UI (`print:hidden`) disappears.
 *   - The 9-up sheet renders the selected cards.
 *   - The (print) layout's `@page { size: A4; margin: 0 }` handles the rest.
 */
export function BatchPicker({
  entries,
  renderedCards,
}: {
  entries: BatchPickerEntry[];
  renderedCards: Record<string, React.ReactNode>;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [tab, setTab] = useState<Tab>("equipment");
  const [search, setSearch] = useState("");
  const [downloadingZip, setDownloadingZip] = useState(false);
  const [downloadedZip, setDownloadedZip] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [downloadedPdf, setDownloadedPdf] = useState(false);

  const tabEntries = useMemo(() => {
    if (tab === "selected") {
      return entries.filter((e) => selected.has(e.qrCode));
    }
    const type = tab === "equipment" ? "equipment" : "consumable";
    return entries.filter((e) => e.type === type);
  }, [entries, tab, selected]);

  const visibleEntries = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return tabEntries;
    return tabEntries.filter(
      (e) =>
        e.qrCode.toLowerCase().includes(q) ||
        e.name.toLowerCase().includes(q),
    );
  }, [tabEntries, search]);

  function toggle(qr: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(qr)) next.delete(qr);
      else next.add(qr);
      return next;
    });
  }

  function selectAllVisible() {
    setSelected((prev) => {
      const next = new Set(prev);
      for (const e of visibleEntries) next.add(e.qrCode);
      return next;
    });
  }

  function clearSelection() {
    setSelected(new Set());
  }

  // Selected entries preserved in `entries` order (qr_code order from the
  // server) — both download handlers need to walk the list in this order so
  // the ZIP/PDF mirror what staff sees on the print preview sheet.
  const selectedEntriesOrdered = useMemo(
    () => entries.filter((e) => selected.has(e.qrCode)),
    [entries, selected],
  );

  async function handleDownloadZip() {
    if (selectedEntriesOrdered.length === 0) return;
    setDownloadingZip(true);
    try {
      const { default: JSZip } = await import("jszip");
      const zip = new JSZip();
      for (const e of selectedEntriesOrdered) {
        const dataUrl = await qrToPngDataUrl(e.qrCode);
        const base64 = dataUrl.split(",", 2)[1] ?? "";
        zip.file(`tek-nurse-qr-${e.qrCode}.png`, base64, { base64: true });
      }
      const blob = await zip.generateAsync({ type: "blob" });
      triggerBlobDownload(blob, "tek-nurse-qr-batch.zip");
      setDownloadedZip(true);
      setTimeout(() => setDownloadedZip(false), 1800);
    } finally {
      setDownloadingZip(false);
    }
  }

  async function handleDownloadPdf() {
    if (selectedEntriesOrdered.length === 0) return;
    setDownloadingPdf(true);
    try {
      const [{ jsPDF }, { svg2pdf }] = await Promise.all([
        import("jspdf"),
        import("svg2pdf.js"),
      ]);

      const pdf = new jsPDF({
        unit: "mm",
        format: "a4",
        orientation: "portrait",
      });

      // Geometry mirrors PrintSheet9Up + PrintCard "grid". Card typography
      // uses jsPDF's built-in Courier/Times stand-ins rather than the project
      // brand fonts (Fraunces / Be Vietnam Pro / JetBrains Mono) — embedding
      // those would add ~400KB and the PDF is a printer-less fallback, not
      // the canonical artifact.
      const PAGE_PAD_TOP = 8;
      const GRID_LEFT = 11; // (210 − 188 grid width) / 2
      const CARD_W = 60;
      const CARD_H = 85;
      const COL_GAP = 4;
      const ROW_GAP = 4;
      const CARD_PAD = 5;
      const QR_SIZE = 38;

      // svg2pdf needs SVG elements attached to the DOM so it can resolve
      // computed sizes. We park them off-screen and remove after each draw.
      const host = document.createElement("div");
      host.style.position = "fixed";
      host.style.left = "-10000px";
      host.style.top = "0";
      host.setAttribute("aria-hidden", "true");
      document.body.appendChild(host);

      try {
        for (let i = 0; i < selectedEntriesOrdered.length; i++) {
          const e = selectedEntriesOrdered[i];
          const slot = i % 9;
          const col = slot % 3;
          const row = Math.floor(slot / 3);
          if (i > 0 && slot === 0) pdf.addPage();

          const cardX = GRID_LEFT + col * (CARD_W + COL_GAP);
          const cardY = PAGE_PAD_TOP + row * (CARD_H + ROW_GAP);
          const cx = cardX + CARD_W / 2;

          // Card hairline border
          pdf.setDrawColor(212);
          pdf.setLineWidth(0.15);
          pdf.rect(cardX, cardY, CARD_W, CARD_H);

          let y = cardY + CARD_PAD;

          // T·E·K NURSE lockup
          pdf.setFont("courier", "bold");
          pdf.setFontSize(7);
          pdf.setTextColor(15, 27, 50);
          y += 2.6;
          pdf.text("T·E·K  NURSE", cx, y, {
            align: "center",
            charSpace: 0.4,
          });
          y += 2.4;

          // Divider hairline
          pdf.setDrawColor(220);
          pdf.line(cardX + CARD_PAD, y, cardX + CARD_W - CARD_PAD, y);
          y += 2.4;

          // QR (vector via svg2pdf)
          const svgString = await qrToSvgString(e.qrCode);
          const wrap = document.createElement("div");
          wrap.innerHTML = svgString;
          const svgEl = wrap.querySelector("svg");
          if (svgEl) {
            host.appendChild(svgEl);
            const qrX = cardX + (CARD_W - QR_SIZE) / 2;
            await svg2pdf(svgEl, pdf, {
              x: qrX,
              y,
              width: QR_SIZE,
              height: QR_SIZE,
            });
            host.removeChild(svgEl);
          }
          y += QR_SIZE + 3;

          // SKU ID — mono bold
          pdf.setFont("courier", "bold");
          pdf.setFontSize(13);
          pdf.setTextColor(15, 27, 50);
          y += 4.5;
          pdf.text(e.qrCode, cx, y, { align: "center", charSpace: 0.3 });
          y += 2.5;

          // Name — display italic, clamp to 2 lines
          pdf.setFont("times", "bolditalic");
          pdf.setFontSize(11);
          const nameLines = pdf
            .splitTextToSize(e.name, CARD_W - CARD_PAD * 2)
            .slice(0, 2);
          for (const line of nameLines) {
            y += 4.2;
            pdf.text(line, cx, y, { align: "center" });
          }

          // Location — italic, anchored at card bottom
          if (e.location) {
            pdf.setFont("times", "italic");
            pdf.setFontSize(8);
            pdf.setTextColor(110, 110, 122);
            const locLines = pdf
              .splitTextToSize(e.location, CARD_W - CARD_PAD * 2)
              .slice(0, 2);
            const bottom = cardY + CARD_H - CARD_PAD;
            let locY = bottom - 3.2 * (locLines.length - 1);
            for (const line of locLines) {
              pdf.text(line, cx, locY, { align: "center" });
              locY += 3.2;
            }
          }
        }
      } finally {
        document.body.removeChild(host);
      }

      const blob = pdf.output("blob");
      triggerBlobDownload(blob, "tek-nurse-qr-sheet.pdf");
      setDownloadedPdf(true);
      setTimeout(() => setDownloadedPdf(false), 1800);
    } finally {
      setDownloadingPdf(false);
    }
  }

  const equipmentCount = entries.filter((e) => e.type === "equipment").length;
  const consumableCount = entries.filter((e) => e.type === "consumable").length;

  // Cards in the order they appear in `entries` (qr_code order from the
  // server), filtered to only the selected ones.
  const selectedCards = useMemo(
    () =>
      selectedEntriesOrdered.map((e) => renderedCards[e.qrCode]).filter(Boolean),
    [selectedEntriesOrdered, renderedCards],
  );

  return (
    <>
      {/* ===== Picker UI — hidden during print ===== */}
      <div className="print:hidden">
        {/* Toolbar */}
        <div className="bg-paper border-b border-rule">
          <div className="mx-auto max-w-5xl px-6 md:px-10 py-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <Link
                href="/staff/inventory"
                className="inline-flex items-center gap-2 font-mono uppercase text-caps-sm text-slate hover:text-navy tracking-[0.1em] font-semibold"
              >
                <ArrowLeft size={14} strokeWidth={1.75} />
                Back to inventory
              </Link>
              <h1 className="mt-2 font-display italic font-extrabold text-navy text-display leading-[1.1]">
                Print QR batch
              </h1>
              <p className="mt-1 font-mono uppercase text-caps-sm text-slate tracking-[0.1em]">
                Pick SKUs · 9 cards per A4 sheet
              </p>
            </div>

            {/* Action panel — mobile reshapes the desktop chip-on-the-right
                into a full-bleed CTA so Print is the obvious primary action
                with a 48px tap target. Desktop keeps the inline arrangement. */}
            <div className="flex flex-col md:flex-row md:items-center gap-3">
              <span className="font-mono uppercase text-caps-sm text-slate tracking-[0.1em]">
                <span className="font-display italic font-extrabold text-navy text-[24px] align-baseline">
                  {selected.size}
                </span>{" "}
                selected
              </span>
              <button
                type="button"
                onClick={handleDownloadZip}
                disabled={selected.size === 0 || downloadingZip}
                className="inline-flex items-center justify-center gap-2 bg-transparent text-navy border-[1.5px] border-navy font-mono uppercase text-[15px] tracking-[0.12em] font-bold w-full md:w-auto px-5 py-3 rounded transition-colors hover:bg-paper hover:border-teal hover:text-teal-deep disabled:opacity-40 disabled:pointer-events-none"
              >
                {downloadedZip ? (
                  <Check size={16} strokeWidth={2} />
                ) : (
                  <Download size={16} strokeWidth={1.75} />
                )}
                {downloadedZip
                  ? "Saved"
                  : downloadingZip
                    ? "Saving…"
                    : "Download ZIP"}
              </button>
              <button
                type="button"
                onClick={handleDownloadPdf}
                disabled={selected.size === 0 || downloadingPdf}
                className="inline-flex items-center justify-center gap-2 bg-transparent text-navy border-[1.5px] border-navy font-mono uppercase text-[15px] tracking-[0.12em] font-bold w-full md:w-auto px-5 py-3 rounded transition-colors hover:bg-paper hover:border-teal hover:text-teal-deep disabled:opacity-40 disabled:pointer-events-none"
              >
                {downloadedPdf ? (
                  <Check size={16} strokeWidth={2} />
                ) : (
                  <Download size={16} strokeWidth={1.75} />
                )}
                {downloadedPdf
                  ? "Saved"
                  : downloadingPdf
                    ? "Saving…"
                    : "Download PDF"}
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                disabled={selected.size === 0}
                className="inline-flex items-center justify-center gap-2 bg-teal text-white font-mono uppercase text-[15px] tracking-[0.12em] font-bold w-full md:w-auto px-6 py-3 rounded transition-colors hover:bg-teal-deep active:bg-navy-deep disabled:opacity-40 disabled:pointer-events-none"
              >
                <Printer size={16} strokeWidth={2} />
                Print sheet
              </button>
            </div>
          </div>
        </div>

        {/* Tab bar — wraps in overflow-x-auto so mono-caps labels don't
            force the page to scroll horizontally on a 375px viewport. The
            -mx-6 / px-6 pair lets the scroll edges bleed to the page gutter
            instead of cropping inside the max-w container. */}
        <div className="border-b border-rule">
          <div className="mx-auto max-w-5xl px-6 md:px-10">
            <div className="-mx-6 md:mx-0 overflow-x-auto">
              <div className="flex items-end gap-1 px-6 md:px-0 min-w-max">
                <TabButton
                  active={tab === "equipment"}
                  onClick={() => setTab("equipment")}
                  icon={<Wrench size={14} strokeWidth={1.75} />}
                  label="Equipment"
                  count={equipmentCount}
                />
                <TabButton
                  active={tab === "consumables"}
                  onClick={() => setTab("consumables")}
                  icon={<Beaker size={14} strokeWidth={1.75} />}
                  label="Consumables"
                  count={consumableCount}
                />
                <TabButton
                  active={tab === "selected"}
                  onClick={() => setTab("selected")}
                  icon={<CheckSquare size={14} strokeWidth={1.75} />}
                  label="Selected"
                  count={selected.size}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Search + bulk actions */}
        <div className="mx-auto max-w-5xl px-6 md:px-10 py-5 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="relative w-full md:max-w-sm">
            <Search
              size={16}
              strokeWidth={1.75}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate"
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search ID or name…"
              className="w-full bg-paper border border-rule rounded pl-10 pr-3 py-2.5 text-[15px] text-navy placeholder:text-slate/60 focus:outline-none focus:border-teal"
            />
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={selectAllVisible}
              disabled={visibleEntries.length === 0}
              className="font-mono uppercase text-caps-sm text-navy tracking-[0.1em] font-semibold hover:text-teal-deep disabled:opacity-40 disabled:pointer-events-none px-3 py-2"
            >
              Select all visible
            </button>
            <button
              type="button"
              onClick={clearSelection}
              disabled={selected.size === 0}
              className="inline-flex items-center gap-1.5 font-mono uppercase text-caps-sm text-slate tracking-[0.1em] font-semibold hover:text-red-deep disabled:opacity-40 disabled:pointer-events-none px-3 py-2"
            >
              <X size={12} strokeWidth={2} />
              Clear
            </button>
          </div>
        </div>

        {/* List */}
        <div className="mx-auto max-w-5xl px-6 md:px-10 pb-12">
          {visibleEntries.length === 0 ? (
            <div className="border-[1.5px] border-dashed border-rule rounded p-10 text-center">
              <p className="font-mono uppercase text-caps-sm text-slate tracking-[0.1em] font-semibold">
                {tab === "selected" ? "Nothing selected" : "No results"}
              </p>
              <p className="mt-1 text-[14px] text-slate">
                {tab === "selected"
                  ? "Pick SKUs from Equipment or Consumables to add them here."
                  : "Try a different search term or switch tabs."}
              </p>
            </div>
          ) : (
            <ul className="border border-rule rounded bg-paper divide-y divide-rule">
              {visibleEntries.map((e) => {
                const isOn = selected.has(e.qrCode);
                return (
                  <li key={`${e.type}-${e.qrCode}`}>
                    <button
                      type="button"
                      onClick={() => toggle(e.qrCode)}
                      className="w-full text-left px-4 py-3.5 flex items-center gap-4 hover:bg-mist/60 transition-colors"
                    >
                      <span className="text-teal">
                        {isOn ? (
                          <CheckSquare size={20} strokeWidth={2} />
                        ) : (
                          <Square size={20} strokeWidth={1.5} className="text-slate" />
                        )}
                      </span>
                      <span className="font-mono uppercase text-caps-md text-navy font-semibold tracking-[0.08em] min-w-[80px]">
                        {e.qrCode}
                      </span>
                      <span className="flex-1 text-[15px] text-navy">
                        {e.name}
                      </span>
                      {e.location && (
                        <span className="hidden sm:inline italic text-[14px] text-slate">
                          {e.location}
                        </span>
                      )}
                      <span className="font-mono uppercase text-caps-sm text-slate/70 tracking-[0.08em]">
                        {e.type === "equipment" ? "EQ" : "CN"}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      {/* ===== Sheet — only renders selected cards. Hidden on screen until
          there is at least 1 selected; in print it's the only visible content. ===== */}
      {selectedCards.length > 0 ? (
        <div className="hidden print:block">
          <PrintSheet9Up cards={selectedCards} />
        </div>
      ) : null}

      {/* Screen preview of the sheet — shown below the picker once items
          are selected, so the user can sanity-check before printing. */}
      {selectedCards.length > 0 ? (
        <div className="print:hidden bg-mist py-10 border-t border-rule">
          <div className="mx-auto max-w-5xl px-6 md:px-10 mb-6">
            <p className="font-mono uppercase text-caps-sm text-slate tracking-[0.1em] font-semibold">
              Preview
            </p>
            <p className="text-[13px] text-slate mt-1">
              This is roughly what the printed sheet will look like.
              Use the browser&rsquo;s print preview for exact alignment.
            </p>
          </div>
          <div className="overflow-x-auto">
            <div className="mx-auto" style={{ width: "210mm" }}>
              <PrintSheet9Up cards={selectedCards} />
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

function triggerBlobDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function TabButton({
  active,
  onClick,
  icon,
  label,
  count,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  count: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-2 px-4 py-3 font-mono uppercase text-caps-md tracking-[0.1em] font-semibold whitespace-nowrap transition-colors border-b-2 -mb-px ${
        active
          ? "text-navy border-teal"
          : "text-slate border-transparent hover:text-navy"
      }`}
    >
      {icon}
      {label}
      <span
        className={`font-display italic font-extrabold text-[16px] ${
          active ? "text-teal" : "text-slate/70"
        }`}
      >
        {count}
      </span>
    </button>
  );
}
