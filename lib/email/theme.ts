/**
 * Card Catalog → Clinical Console color tokens for email templates.
 * Hex values are mirrored from app/globals.css `@theme` block.
 *
 * Tailwind utilities are stripped by email clients, so we re-declare the
 * palette here as plain hex strings used inline via React.CSSProperties.
 */

export const colors = {
  navy: "#1F3A6E",
  navyDeep: "#152849",
  teal: "#38B6BC",
  tealDeep: "#2A8E94",
  cyan: "#87D1D5",
  mist: "#F0F4F8",
  paper: "#F8FAFC",
  slate: "#475569",
  rule: "#CBD5E1",
  red: "#E53935",
  redDeep: "#B91C1C",
  green: "#0EA968",
  ink: "#0F172A",
  white: "#FFFFFF",
} as const;

/**
 * Email-safe font stacks. Web fonts (Fraunces, Montserrat, JetBrains Mono)
 * are not reliably available in Gmail/Outlook/Apple Mail. Fall back to
 * system fonts that still convey the intent.
 */
export const fonts = {
  display:
    "Georgia, 'Times New Roman', Cambria, 'Iowan Old Style', Times, serif",
  body: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif",
  mono: "'SFMono-Regular', Menlo, Consolas, 'Liberation Mono', monospace",
} as const;

/**
 * Resolve the public-facing app base URL for absolute links inside emails.
 * Strips a trailing slash so callers can do `${appUrl()}/student/...` safely.
 */
export function appUrl(): string {
  const raw =
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.NEXT_PUBLIC_SITE_URL ??
    "https://teknurse.vercel.app";
  return raw.replace(/\/+$/, "");
}

/**
 * Format an ISO timestamp as a human-readable Asia/Manila timestamp.
 * Same TZ used across the app. Falls back to the raw string if invalid.
 */
export function formatManilaDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat("en-PH", {
    timeZone: "Asia/Manila",
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(d);
}

/**
 * Format an ISO date (YYYY-MM-DD or full ISO) as a date-only string.
 */
export function formatManilaDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat("en-PH", {
    timeZone: "Asia/Manila",
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(d);
}
