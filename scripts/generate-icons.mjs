// One-shot PWA-icon generator for T.E.K Nurse (Phase 12a).
//
// Reads public/teknurselogo.png (1254x1254) and writes:
//   app/icon.png                       512x512  any-purpose, mist background
//   app/apple-icon.png                 180x180  opaque mist (Apple disallows transparency)
//   public/icons/icon-192.png          192x192  any-purpose, mist background
//   public/icons/icon-512.png          512x512  any-purpose, mist background
//   public/icons/icon-maskable-512.png 512x512  mist bg + logo at 80% safe zone
//
// Color tokens come from app/globals.css @theme block (Clinical Console):
//   mist      #F0F4F8  background for all variants (the source logo already
//                       sits on a near-white plate; a contrasting brand-color
//                       frame would render as a white card inside a colored
//                       frame, which looks broken). The safe-zone padding on
//                       the maskable just blends with the logo's own plate.
//
// Run: npm run icons:generate
// Re-run any time the source logo changes.

import sharp from "sharp";
import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");
const SRC = resolve(ROOT, "public/teknurselogo.png");

const MIST = { r: 0xf0, g: 0xf4, b: 0xf8, alpha: 1 };

await mkdir(resolve(ROOT, "public/icons"), { recursive: true });

async function flatOnMist(size, outPath) {
  await sharp(SRC)
    .resize(size, size, { fit: "contain", background: MIST })
    .flatten({ background: MIST })
    .png({ compressionLevel: 9 })
    .toFile(resolve(ROOT, outPath));
  console.log(`  wrote ${outPath}  (${size}x${size}, mist)`);
}

async function maskable(size, outPath) {
  // Maskable spec: outer 10% on each side may be cropped by round/squircle masks.
  // Safe content area = inner 80% of the icon.
  const inner = Math.round(size * 0.8);
  const logo = await sharp(SRC).resize(inner, inner, { fit: "contain" }).toBuffer();
  await sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: MIST,
    },
  })
    .composite([{ input: logo, gravity: "center" }])
    .png({ compressionLevel: 9 })
    .toFile(resolve(ROOT, outPath));
  console.log(`  wrote ${outPath}  (${size}x${size}, maskable mist + 80% safe)`);
}

console.log(`Source: ${SRC}`);
console.log("Generating PWA icons...");

await flatOnMist(512, "app/icon.png");
await flatOnMist(180, "app/apple-icon.png");
await flatOnMist(192, "public/icons/icon-192.png");
await flatOnMist(512, "public/icons/icon-512.png");
await maskable(512, "public/icons/icon-maskable-512.png");

console.log("Done.");
