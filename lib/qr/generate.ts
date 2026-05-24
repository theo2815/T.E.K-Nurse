import QRCode from "qrcode";

/**
 * QR generation for T.E.K Nurse.
 *
 * Content strategy (see vault: Reference/QR Best Practices.md):
 *   - Each QR encodes `${APP_URL}/s/{qr_code}` — a short URL that the Phase 6
 *     slice 2 `/s/[qr]` redirect resolves to the correct SKU detail page.
 *   - Generic camera apps (iPhone Camera, Google Lens) recognize the URL and
 *     offer to open it. Inside our app, the scanner extracts the qr_code
 *     segment directly.
 *   - We never encode auth tokens, emails, or DB UUIDs.
 *
 * Encoding (per QR Best Practices §3):
 *   - errorCorrectionLevel: "Q" (25%) — better tolerance for lab wear.
 *   - margin: 4 modules — the required quiet zone.
 *
 * We expose both SVG (vector, ideal for print) and PNG data URL (for download).
 */

/**
 * Resolve the public app URL. Reads `NEXT_PUBLIC_APP_URL` at module load.
 * Falls back to localhost in development; throws in production to prevent
 * QR codes from being printed with a stale localhost URL on a fresh deploy
 * where the env var was forgotten. Trailing slashes are stripped.
 */
function getAppUrl(): string {
  const raw = process.env.NEXT_PUBLIC_APP_URL;
  if (!raw) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "NEXT_PUBLIC_APP_URL must be set in production. " +
          "Configure it in Vercel → Settings → Environment Variables.",
      );
    }
    return "http://localhost:3000";
  }
  return raw.replace(/\/+$/, "");
}

export function buildQrUrl(qrCode: string): string {
  return `${getAppUrl()}/s/${qrCode}`;
}

const COMMON_OPTS = {
  errorCorrectionLevel: "Q" as const,
  margin: 4,
};

/**
 * Render a QR code as an SVG string. Vector — never pixelates at print scale.
 * The output is pure black on transparent; wrap in white when printing.
 */
export async function qrToSvgString(qrCode: string): Promise<string> {
  return qrToSvgStringFromUrl(buildQrUrl(qrCode));
}

/**
 * Render a QR code as a PNG data URL. Used for the [Download PNG] button.
 * Width 600px gives ~150px/cm at the 4×4 cm target, which prints crisp.
 */
export async function qrToPngDataUrl(qrCode: string): Promise<string> {
  return qrToPngDataUrlFromUrl(buildQrUrl(qrCode));
}

/**
 * Same as qrToSvgString but for an arbitrary URL — used by the non-SKU
 * print pages (e.g. the panel login QR) that encode a fixed URL rather
 * than the `/s/{qr_code}` SKU lookup path.
 */
export async function qrToSvgStringFromUrl(url: string): Promise<string> {
  return QRCode.toString(url, {
    ...COMMON_OPTS,
    type: "svg",
    color: { dark: "#000000", light: "#0000" },
  });
}

export async function qrToPngDataUrlFromUrl(url: string): Promise<string> {
  return QRCode.toDataURL(url, {
    ...COMMON_OPTS,
    width: 600,
    color: { dark: "#000000", light: "#FFFFFF" },
  });
}
