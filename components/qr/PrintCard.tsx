import { QrSvg } from "@/components/qr/QrSvg";

/**
 * Physical print card — one per SKU. Sized in mm so the printed result
 * matches the QR Best Practices spec:
 *   - 4 cm QR for typical counter scan distance (20–30 cm)
 *   - Mono SKU ID, large
 *   - Serif italic name
 *   - Italic body location line
 *
 * Two size variants:
 *   - "single" (≈ 90×125 mm) — one card centered on an A4 sheet
 *   - "grid"   (≈ 60×85 mm)  — used by the 9-up batch sheet
 *
 * The card itself is bg-paper with a 0.5pt hairline border. The QR area
 * inside is forced to pure white per print contrast guidance.
 */

type Size = "single" | "grid";

type CardData = {
  qrCode: string;
  name: string;
  location?: string | null;
};

const DIMENSIONS: Record<
  Size,
  {
    cardWidthMm: number;
    cardHeightMm: number;
    paddingMm: number;
    qrSizeMm: number;
    idFontMm: number;
    nameFontMm: number;
    locationFontMm: number;
    lockupFontMm: number;
    gapMm: number;
  }
> = {
  single: {
    cardWidthMm: 90,
    cardHeightMm: 125,
    paddingMm: 8,
    qrSizeMm: 48,
    idFontMm: 6,
    nameFontMm: 5,
    locationFontMm: 3.5,
    lockupFontMm: 3.5,
    gapMm: 4,
  },
  grid: {
    cardWidthMm: 60,
    cardHeightMm: 85,
    paddingMm: 5,
    qrSizeMm: 38,
    idFontMm: 4.5,
    nameFontMm: 3.8,
    locationFontMm: 2.8,
    lockupFontMm: 2.6,
    gapMm: 2.5,
  },
};

export function PrintCard({
  data,
  size = "single",
}: {
  data: CardData;
  size?: Size;
}) {
  const d = DIMENSIONS[size];

  return (
    <article
      className="bg-paper border border-rule flex flex-col items-center text-center"
      style={{
        width: `${d.cardWidthMm}mm`,
        height: `${d.cardHeightMm}mm`,
        padding: `${d.paddingMm}mm`,
        gap: `${d.gapMm}mm`,
        boxSizing: "border-box",
        breakInside: "avoid",
        pageBreakInside: "avoid",
      }}
    >
      {/* T·E·K NURSE lockup */}
      <p
        className="font-mono uppercase font-semibold text-navy"
        style={{
          fontSize: `${d.lockupFontMm}mm`,
          letterSpacing: "0.18em",
          lineHeight: 1,
        }}
      >
        T·E·K&nbsp;&nbsp;NURSE
      </p>

      {/* Hairline divider */}
      <div
        className="bg-rule w-full"
        style={{ height: "0.3mm", marginTop: `${-d.gapMm / 2}mm` }}
      />

      {/* QR — pure black on pure white */}
      <div className="bg-white border border-rule">
        <QrSvg qrCode={data.qrCode} sizeMm={d.qrSizeMm} />
      </div>

      {/* SKU ID — mono, large */}
      <p
        className="font-mono uppercase font-bold text-navy"
        style={{
          fontSize: `${d.idFontMm}mm`,
          letterSpacing: "0.08em",
          lineHeight: 1,
        }}
      >
        {data.qrCode}
      </p>

      {/* Item name — display italic */}
      <p
        className="font-display italic font-extrabold text-navy"
        style={{
          fontSize: `${d.nameFontMm}mm`,
          lineHeight: 1.1,
          letterSpacing: "-0.01em",
          maxWidth: "100%",
          overflow: "hidden",
          textOverflow: "ellipsis",
          display: "-webkit-box",
          WebkitLineClamp: 2,
          WebkitBoxOrient: "vertical",
        }}
      >
        {data.name}
      </p>

      {/* Location — italic body */}
      {data.location && (
        <p
          className="italic text-slate"
          style={{
            fontSize: `${d.locationFontMm}mm`,
            lineHeight: 1.2,
            marginTop: "auto",
          }}
        >
          {data.location}
        </p>
      )}
    </article>
  );
}

export type { CardData as PrintCardData };
