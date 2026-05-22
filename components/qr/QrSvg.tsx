import { qrToSvgString } from "@/lib/qr/generate";

/**
 * Server component. Renders a QR code as inline SVG (vector, never pixelates
 * at print scale). The SVG is drawn pure black on transparent — wrap in a
 * white container per the QR Best Practices "pure black on pure white"
 * recommendation.
 *
 * The outer wrapper sets physical size via `sizeMm`. Internal CSS forces the
 * generated `<svg>` to fill the wrapper at 100% in both axes.
 */
export async function QrSvg({
  qrCode,
  sizeMm,
}: {
  qrCode: string;
  sizeMm: number;
}) {
  const svg = await qrToSvgString(qrCode);
  return (
    <div
      className="bg-white [&>svg]:block [&>svg]:w-full [&>svg]:h-full"
      style={{ width: `${sizeMm}mm`, height: `${sizeMm}mm` }}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
