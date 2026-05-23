/**
 * Shared time-ago formatter. Six near-identical copies were inlined across
 * components before this util landed; consolidating here keeps the wording
 * consistent ("3m ago", "2h ago", "Apr 5") across every surface.
 */
export function timeAgo(iso: string, nowMs: number = Date.now()): string {
  const minutes = Math.floor((nowMs - new Date(iso).getTime()) / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}
