/**
 * Helpers for composing report-page URLs that preserve the active filter set.
 * Used by the tab strip, date picker, filter chips, paginator, and any row
 * action that needs to mutate a single param without dropping the others.
 */

export type ReportSearchParams = Record<string, string | undefined>;

export function buildReportHref(
  basePath: string,
  current: ReportSearchParams,
  patch: ReportSearchParams,
): string {
  const merged: ReportSearchParams = { ...current, ...patch };
  const parts: string[] = [];
  for (const [k, v] of Object.entries(merged)) {
    if (v == null || v === "") continue;
    parts.push(`${encodeURIComponent(k)}=${encodeURIComponent(v)}`);
  }
  return parts.length === 0 ? basePath : `${basePath}?${parts.join("&")}`;
}
