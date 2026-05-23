/**
 * Date-range helpers for Phase 10 reports. Asia/Manila (+08:00, no DST) is the
 * canonical "today" boundary for the whole project — matches the Phase 9 pg_cron
 * schedule (09:00 PHT) and the borrow_date semantics in the Phase 4 request
 * form.
 *
 * Reports filter on timestamp columns (borrowed_at, used_at) in UTC, so the
 * helper converts a local PHT date (YYYY-MM-DD) to its inclusive UTC bounds.
 */

const PHT_OFFSET_MS = 8 * 60 * 60 * 1000;

export type RangePreset = "7d" | "30d" | "90d" | "custom";

export type DateRange = {
  /** ISO date YYYY-MM-DD in Asia/Manila. */
  from: string;
  /** ISO date YYYY-MM-DD in Asia/Manila (inclusive). */
  to: string;
  preset: RangePreset;
};

/** Today as YYYY-MM-DD in Asia/Manila. */
export function todayPht(now: Date = new Date()): string {
  const shifted = new Date(now.getTime() + PHT_OFFSET_MS);
  return shifted.toISOString().slice(0, 10);
}

/** YYYY-MM-DD `days` before/after `iso` (treated as a PHT date). */
export function addDaysPht(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** PHT midnight for `iso` expressed as a UTC ISO timestamp. */
export function pht00UtcIso(iso: string): string {
  return new Date(`${iso}T00:00:00.000+08:00`).toISOString();
}

/** Exclusive UTC upper bound — PHT midnight of (iso + 1 day). */
export function phtEndUtcIso(iso: string): string {
  return new Date(`${addDaysPht(iso, 1)}T00:00:00.000+08:00`).toISOString();
}

/**
 * Resolve a preset + optional explicit dates into a normalized DateRange.
 * If preset === "custom", from/to must be provided. Otherwise from/to are
 * computed from `today` minus N-1 days (inclusive both ends).
 */
export function resolveRange(opts: {
  preset?: string;
  from?: string;
  to?: string;
  now?: Date;
}): DateRange {
  const today = todayPht(opts.now);
  const presetIn = opts.preset ?? "30d";

  if (presetIn === "custom" && opts.from && opts.to) {
    const [from, to] =
      opts.from <= opts.to ? [opts.from, opts.to] : [opts.to, opts.from];
    return { from, to, preset: "custom" };
  }

  const preset: RangePreset =
    presetIn === "7d" || presetIn === "90d" || presetIn === "custom"
      ? presetIn
      : "30d";

  const days = preset === "7d" ? 7 : preset === "90d" ? 90 : 30;
  const from = addDaysPht(today, -(days - 1));
  return { from, to: today, preset };
}

/** Render an ISO date as `DD MON` (e.g. "23 MAY"). */
export function formatShort(iso: string): string {
  const d = new Date(`${iso}T00:00:00.000Z`);
  const month = d.toLocaleDateString("en-US", {
    month: "short",
    timeZone: "UTC",
  });
  return `${d.getUTCDate()} ${month.toUpperCase()}`;
}

/** Render an ISO date as `DD MON YYYY`. Used for headers + tooltips. */
export function formatLong(iso: string): string {
  const d = new Date(`${iso}T00:00:00.000Z`);
  const month = d.toLocaleDateString("en-US", {
    month: "short",
    timeZone: "UTC",
  });
  return `${d.getUTCDate()} ${month.toUpperCase()} ${d.getUTCFullYear()}`;
}

/** Iterate every YYYY-MM-DD from `from` through `to` inclusive. */
export function eachDay(from: string, to: string): string[] {
  const out: string[] = [];
  let cursor = from;
  while (cursor <= to) {
    out.push(cursor);
    cursor = addDaysPht(cursor, 1);
  }
  return out;
}

/** Convert a UTC timestamp into the YYYY-MM-DD date in Asia/Manila. */
export function utcToPhtDate(utcIso: string): string {
  const ms = new Date(utcIso).getTime() + PHT_OFFSET_MS;
  return new Date(ms).toISOString().slice(0, 10);
}
