import { qrToSvgStringFromUrl } from "@/lib/qr/generate";
import { SpeedLines } from "@/components/SpeedLines";

/**
 * Hero panel-demo card. Reads as an editorial poster, not a lab label —
 * built for the moment a panelist points a phone at the page.
 *
 * Clinical Console moves carried through:
 *   - Navy on paper, no shadows, 1.5px hairline borders
 *   - Montserrat italic ExtraBold display for the kinetic headline
 *   - JetBrains Mono uppercase tracked for the URL stamp
 *   - Teal owned by the corner brackets + the reverse-out CTA band
 *   - SpeedLines marker in the top-right balances the brand lockup
 *
 * Corner brackets on the QR deliberately mirror the in-app QrScanner's
 * teal L-marks (components/scan/QrScanner.tsx CornerMark) so the print
 * artifact visually rhymes with the experience the panelist gets after
 * scanning.
 */
export async function PrintLoginCard({ url }: { url: string }) {
  const svg = await qrToSvgStringFromUrl(url);

  const cardWidthMm = 140;
  const cardHeightMm = 200;

  return (
    <article
      className="bg-paper border-[1.5px] border-rule flex flex-col relative overflow-hidden"
      style={{
        width: `${cardWidthMm}mm`,
        height: `${cardHeightMm}mm`,
        breakInside: "avoid",
        pageBreakInside: "avoid",
      }}
    >
      {/* Body — everything above the bottom CTA band */}
      <div
        className="flex flex-col flex-1"
        style={{ padding: "12mm 12mm 8mm 12mm" }}
      >
        {/* Top row — brand lockup ↔ speed-lines marker (asymmetric balance) */}
        <header className="flex items-start justify-between">
          <p
            className="font-mono uppercase font-bold text-navy"
            style={{
              fontSize: "3.4mm",
              letterSpacing: "0.22em",
              lineHeight: 1,
            }}
          >
            T·E·K&nbsp;&nbsp;NURSE
          </p>
          <SpeedLines className="w-12 h-5" />
        </header>

        {/* Kinetic headline — three short imperatives, staggered indent
            so the eye accelerates down the page like the SpeedLines */}
        <h1
          className="font-display italic font-extrabold text-navy"
          style={{
            fontSize: "16mm",
            lineHeight: 0.98,
            letterSpacing: "-0.02em",
            marginTop: "12mm",
          }}
        >
          <span className="block">Point.</span>
          <span className="block" style={{ marginLeft: "8mm" }}>
            Scan.
          </span>
          <span className="block text-teal-deep" style={{ marginLeft: "16mm" }}>
            You&rsquo;re in.
          </span>
        </h1>

        {/* QR with teal corner brackets — mirrors the in-app scanner reticle */}
        <div
          className="relative self-center"
          style={{ marginTop: "10mm", padding: "5mm" }}
        >
          {/* Corner brackets (top-left, top-right, bottom-right, bottom-left) */}
          <CornerBracket position="tl" />
          <CornerBracket position="tr" />
          <CornerBracket position="br" />
          <CornerBracket position="bl" />

          <div className="bg-white">
            <div
              className="[&>svg]:block [&>svg]:w-full [&>svg]:h-full"
              style={{ width: "62mm", height: "62mm" }}
              dangerouslySetInnerHTML={{ __html: svg }}
            />
          </div>
        </div>

        {/* Brand sign-off under the QR — bookends the lockup at the top */}
        <p
          className="self-center font-mono uppercase font-bold text-navy"
          style={{
            fontSize: "4.4mm",
            letterSpacing: "0.22em",
            lineHeight: 1,
            marginTop: "8mm",
          }}
        >
          T·E·K&nbsp;&nbsp;NURSE
        </p>
      </div>

      {/* CTA band — full-bleed teal, white reverse-out. The visual anchor. */}
      <div
        className="bg-teal text-white flex items-center justify-between"
        style={{
          padding: "5mm 12mm",
        }}
      >
        <span
          className="font-mono uppercase font-bold"
          style={{
            fontSize: "4mm",
            letterSpacing: "0.18em",
            lineHeight: 1,
          }}
        >
          Scan to log in
        </span>
        <span
          className="font-display italic font-extrabold"
          style={{
            fontSize: "6mm",
            lineHeight: 1,
          }}
        >
          →
        </span>
      </div>

      {/* Tagline strip — sub-foot italic, sets the product positioning */}
      <p
        className="bg-navy text-mist font-display italic font-bold text-center"
        style={{
          fontSize: "3.2mm",
          letterSpacing: "0.01em",
          lineHeight: 1,
          padding: "3.5mm",
        }}
      >
        A school nursing lab. In your pocket.
      </p>
    </article>
  );
}

/**
 * Teal L-bracket — echoes components/scan/QrScanner.tsx CornerMark so the
 * printed poster matches the in-app scanner reticle that panelists will see
 * after they log in.
 */
function CornerBracket({
  position,
}: {
  position: "tl" | "tr" | "bl" | "br";
}) {
  const sizeMm = 7;
  const thicknessMm = 1.2;

  const positional: React.CSSProperties = {
    position: "absolute",
    width: `${sizeMm}mm`,
    height: `${sizeMm}mm`,
  };

  if (position === "tl") {
    positional.top = 0;
    positional.left = 0;
    positional.borderTop = `${thicknessMm}mm solid var(--color-teal)`;
    positional.borderLeft = `${thicknessMm}mm solid var(--color-teal)`;
  } else if (position === "tr") {
    positional.top = 0;
    positional.right = 0;
    positional.borderTop = `${thicknessMm}mm solid var(--color-teal)`;
    positional.borderRight = `${thicknessMm}mm solid var(--color-teal)`;
  } else if (position === "br") {
    positional.bottom = 0;
    positional.right = 0;
    positional.borderBottom = `${thicknessMm}mm solid var(--color-teal)`;
    positional.borderRight = `${thicknessMm}mm solid var(--color-teal)`;
  } else {
    positional.bottom = 0;
    positional.left = 0;
    positional.borderBottom = `${thicknessMm}mm solid var(--color-teal)`;
    positional.borderLeft = `${thicknessMm}mm solid var(--color-teal)`;
  }

  return <span aria-hidden style={positional} />;
}
