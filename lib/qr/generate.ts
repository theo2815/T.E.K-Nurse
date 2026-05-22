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

const DEFAULT_APP_URL = "http://localhost:3000";

/**
 * Resolve the public app URL. Reads `NEXT_PUBLIC_APP_URL` at module load.
 * Falls back to localhost for development. Trailing slashes are stripped.
 */
function getAppUrl(): string {
  const raw = process.env.NEXT_PUBLIC_APP_URL ?? DEFAULT_APP_URL;
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
  return QRCode.toString(buildQrUrl(qrCode), {
    ...COMMON_OPTS,
    type: "svg",
    color: { dark: "#000000", light: "#0000" },
  });
}

/**
 * Render a QR code as a PNG data URL. Used for the [Download PNG] button.
 * Width 600px gives ~150px/cm at the 4×4 cm target, which prints crisp.
 */
export async function qrToPngDataUrl(qrCode: string): Promise<string> {
  return QRCode.toDataURL(buildQrUrl(qrCode), {
    ...COMMON_OPTS,
    width: 600,
    color: { dark: "#000000", light: "#FFFFFF" },
  });
}
