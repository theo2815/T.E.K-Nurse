"use client";

import { useState } from "react";
import { useProgressRouter } from "@/lib/use-progress-router";
import { Calendar as CalIcon, Check } from "lucide-react";
import { DateField } from "@/components/ui/DateField";
import {
  formatLong,
  resolveRange,
  todayPht,
  type RangePreset,
} from "@/lib/reports/date-range";
import { buildReportHref, type ReportSearchParams } from "./report-url";

const PRESETS: Array<{ value: RangePreset; label: string }> = [
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "90d", label: "Last 90 days" },
  { value: "custom", label: "Custom" },
];

export function DateRangePicker({
  basePath,
  searchParams,
  from,
  to,
  preset,
}: {
  basePath: string;
  searchParams: ReportSearchParams;
  from: string;
  to: string;
  preset: RangePreset;
}) {
  const router = useProgressRouter();
  const [customFrom, setCustomFrom] = useState(from);
  const [customTo, setCustomTo] = useState(to);
  const today = todayPht();

  function applyPreset(p: RangePreset) {
    if (p === "custom") {
      // Switch to custom mode without navigating — the inputs are revealed.
      const r = resolveRange({ preset: "custom", from: customFrom, to: customTo });
      router.push(
        buildReportHref(basePath, searchParams, {
          preset: "custom",
          from: r.from,
          to: r.to,
          page: undefined,
        }),
        { scroll: false },
      );
      return;
    }
    router.push(
      buildReportHref(basePath, searchParams, {
        preset: p === "30d" ? undefined : p,
        from: undefined,
        to: undefined,
        page: undefined,
      }),
      { scroll: false },
    );
  }

  function applyCustom() {
    const r = resolveRange({
      preset: "custom",
      from: customFrom,
      to: customTo,
    });
    router.push(
      buildReportHref(basePath, searchParams, {
        preset: "custom",
        from: r.from,
        to: r.to,
        page: undefined,
      }),
      { scroll: false },
    );
  }

  const customDirty = preset === "custom" && (customFrom !== from || customTo !== to);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2 flex-wrap">
        <span
          aria-hidden
          className="inline-flex items-center gap-1.5 text-teal font-mono uppercase text-caps-sm tracking-[0.1em] font-semibold"
        >
          <CalIcon size={14} strokeWidth={1.75} />
          Range
        </span>
        {PRESETS.map((p) => {
          const active = preset === p.value;
          return (
            <button
              key={p.value}
              type="button"
              onClick={() => applyPreset(p.value)}
              aria-pressed={active}
              className={[
                "px-3 py-1.5 rounded border-[1.5px] font-mono uppercase text-caps-sm tracking-[0.08em] font-semibold transition-colors",
                active
                  ? "border-teal bg-teal/10 text-teal-deep"
                  : "border-rule bg-paper text-slate hover:border-slate/60",
              ].join(" ")}
            >
              {p.label}
            </button>
          );
        })}
        <span className="ml-auto font-mono uppercase text-caps-sm text-slate tracking-[0.08em]">
          {formatLong(from)} → {formatLong(to)}
        </span>
      </div>

      {preset === "custom" && (
        <div className="flex flex-col md:flex-row gap-3 md:items-end">
          <div className="md:w-56">
            <DateField
              label="From"
              value={customFrom}
              onChange={setCustomFrom}
              max={customTo || today}
            />
          </div>
          <div className="md:w-56">
            <DateField
              label="To"
              value={customTo}
              onChange={setCustomTo}
              min={customFrom}
              max={today}
            />
          </div>
          <button
            type="button"
            onClick={applyCustom}
            disabled={!customDirty || !customFrom || !customTo}
            className="inline-flex items-center gap-2 rounded bg-teal hover:bg-teal-deep disabled:bg-slate/30 disabled:cursor-not-allowed text-white font-mono uppercase text-caps-md tracking-[0.08em] font-bold px-5 py-3 transition-colors"
          >
            <Check size={14} strokeWidth={2.5} />
            Apply
          </button>
        </div>
      )}
    </div>
  );
}
