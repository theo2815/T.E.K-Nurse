"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { forwardRef, useEffect, useRef, useState } from "react";

const DAY_LABELS = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
const MONTH_LABELS = [
  "JAN", "FEB", "MAR", "APR", "MAY", "JUN",
  "JUL", "AUG", "SEP", "OCT", "NOV", "DEC",
];

export function parseIso(iso: string | null | undefined): Date | null {
  if (!iso) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return null;
  const [, y, mo, d] = m;
  return new Date(Number(y), Number(mo) - 1, Number(d));
}

export function toIso(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

type CalendarProps = {
  /** Currently selected date (or null). */
  value: Date | null;
  /** Month being shown — must be set by the parent and updated via onMonthChange. */
  focusedMonth: Date;
  onMonthChange: (next: Date) => void;
  onSelect: (d: Date) => void;
  min?: Date | null;
  max?: Date | null;
  /** Day that has DOM focus (drives keyboard nav). Defaults to value or today. */
  focusedDay?: Date | null;
  onFocusedDayChange?: (d: Date) => void;
};

type View = "days" | "months";

/**
 * Month grid with mono caps headers + italic Montserrat day numerals.
 * Pure presentation — parent owns focusedMonth and selection state.
 * Click the header label to switch to a month picker with year arrows.
 */
export const Calendar = forwardRef<HTMLDivElement, CalendarProps>(
  function Calendar(
    {
      value,
      focusedMonth,
      onMonthChange,
      onSelect,
      min,
      max,
      focusedDay,
      onFocusedDayChange,
    },
    ref,
  ) {
    const today = startOfDay(new Date());
    const year = focusedMonth.getFullYear();
    const month = focusedMonth.getMonth();

    const [view, setView] = useState<View>("days");

    // Build the 6×7 grid: start from the Sunday on/before the 1st.
    const firstOfMonth = new Date(year, month, 1);
    const gridStart = new Date(firstOfMonth);
    gridStart.setDate(gridStart.getDate() - gridStart.getDay());

    const cells: Date[] = [];
    for (let i = 0; i < 42; i++) {
      const d = new Date(gridStart);
      d.setDate(gridStart.getDate() + i);
      cells.push(d);
    }

    const focusRef = useRef<HTMLButtonElement | null>(null);
    useEffect(() => {
      if (view === "days" && focusedDay && focusRef.current) {
        focusRef.current.focus();
      }
    }, [focusedDay, view]);

    function shiftMonth(delta: number) {
      onMonthChange(new Date(year, month + delta, 1));
    }
    function shiftYear(delta: number) {
      onMonthChange(new Date(year + delta, month, 1));
    }

    function isDisabled(d: Date): boolean {
      if (min && d < startOfDay(min)) return true;
      if (max && d > startOfDay(max)) return true;
      return false;
    }

    function isMonthDisabled(m: number): boolean {
      // A month is disabled only if every day in it is outside [min, max].
      const firstDay = new Date(year, m, 1);
      const lastDay = new Date(year, m + 1, 0);
      if (min && lastDay < startOfDay(min)) return true;
      if (max && firstDay > startOfDay(max)) return true;
      return false;
    }

    return (
      <div ref={ref} className="select-none">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <button
            type="button"
            aria-label={view === "days" ? "Previous month" : "Previous year"}
            onClick={() => (view === "days" ? shiftMonth(-1) : shiftYear(-1))}
            className="p-1.5 rounded text-slate hover:text-teal hover:bg-mist transition-colors"
          >
            <ChevronLeft size={18} strokeWidth={1.75} />
          </button>
          <button
            type="button"
            onClick={() => setView(view === "days" ? "months" : "days")}
            aria-label={view === "days" ? "Pick month and year" : "Back to days"}
            className="font-mono uppercase text-caps-md font-semibold tracking-[0.12em] text-navy hover:text-teal transition-colors px-2 py-1 rounded"
          >
            {view === "days" ? `${MONTH_LABELS[month]} ${year}` : year}
          </button>
          <button
            type="button"
            aria-label={view === "days" ? "Next month" : "Next year"}
            onClick={() => (view === "days" ? shiftMonth(1) : shiftYear(1))}
            className="p-1.5 rounded text-slate hover:text-teal hover:bg-mist transition-colors"
          >
            <ChevronRight size={18} strokeWidth={1.75} />
          </button>
        </div>

        <hr className="border-rule mb-3 w-8" />

        {view === "months" ? (
          <div className="grid grid-cols-3 gap-2">
            {MONTH_LABELS.map((label, idx) => {
              const isCurrentMonth = idx === month;
              const disabled = isMonthDisabled(idx);
              return (
                <button
                  key={label}
                  type="button"
                  disabled={disabled}
                  onClick={() => {
                    onMonthChange(new Date(year, idx, 1));
                    setView("days");
                  }}
                  className={[
                    "py-3 rounded font-mono uppercase text-[13px] tracking-[0.1em] font-bold transition-colors",
                    disabled
                      ? "text-slate/30 cursor-not-allowed line-through"
                      : isCurrentMonth
                      ? "bg-teal text-white"
                      : "text-navy hover:bg-mist",
                  ].join(" ")}
                >
                  {label}
                </button>
              );
            })}
          </div>
        ) : (
          <>
            {/* Day headers */}
            <div className="grid grid-cols-7 gap-1 mb-1">
              {DAY_LABELS.map((d) => (
                <div
                  key={d}
                  className="font-mono uppercase text-[10px] font-semibold tracking-[0.1em] text-slate text-center py-1.5"
                >
                  {d}
                </div>
              ))}
            </div>

            {/* Day grid */}
            <div
              role="grid"
              className="grid grid-cols-7 gap-1"
              onKeyDown={(e) => handleGridKeyDown(e, {
                focusedDay,
                onFocusedDayChange,
                onMonthChange,
                min,
                max,
              })}
            >
              {cells.map((d) => {
                const inMonth = d.getMonth() === month;
                const isToday = sameDay(d, today);
                const isSelected = value ? sameDay(d, value) : false;
                const disabled = isDisabled(d);
                const isFocused = focusedDay ? sameDay(d, focusedDay) : false;

                return (
                  <button
                    key={d.toISOString()}
                    ref={isFocused ? focusRef : undefined}
                    type="button"
                    role="gridcell"
                    tabIndex={isFocused ? 0 : -1}
                    aria-current={isToday ? "date" : undefined}
                    aria-selected={isSelected || undefined}
                    aria-label={d.toLocaleDateString("en-US", {
                      weekday: "long",
                      month: "long",
                      day: "numeric",
                      year: "numeric",
                    })}
                    disabled={disabled}
                    onClick={() => {
                      if (!disabled) onSelect(d);
                    }}
                    onFocus={() => onFocusedDayChange?.(d)}
                    className={[
                      "relative h-10 w-full rounded flex items-center justify-center transition-colors",
                      "focus:outline-none focus-visible:ring-2 focus-visible:ring-teal",
                      disabled
                        ? "text-slate/30 cursor-not-allowed line-through"
                        : isSelected
                        ? "bg-teal text-white font-display italic font-extrabold text-[18px]"
                        : isToday
                        ? "ring-[1.5px] ring-teal text-navy font-display italic font-extrabold text-[18px] hover:bg-mist"
                        : inMonth
                        ? "text-navy hover:bg-mist"
                        : "text-slate/40 hover:bg-mist",
                    ].join(" ")}
                  >
                    {d.getDate()}
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>
    );
  },
);

function handleGridKeyDown(
  e: React.KeyboardEvent<HTMLDivElement>,
  ctx: {
    focusedDay?: Date | null;
    onFocusedDayChange?: (d: Date) => void;
    onMonthChange: (next: Date) => void;
    min?: Date | null;
    max?: Date | null;
  },
) {
  const current = ctx.focusedDay ?? new Date();
  let next: Date | null = null;
  switch (e.key) {
    case "ArrowLeft":
      next = addDays(current, -1);
      break;
    case "ArrowRight":
      next = addDays(current, 1);
      break;
    case "ArrowUp":
      next = addDays(current, -7);
      break;
    case "ArrowDown":
      next = addDays(current, 7);
      break;
    case "PageUp":
      next = new Date(current.getFullYear(), current.getMonth() - 1, current.getDate());
      break;
    case "PageDown":
      next = new Date(current.getFullYear(), current.getMonth() + 1, current.getDate());
      break;
    case "Home":
      next = new Date(current.getFullYear(), current.getMonth(), 1);
      break;
    case "End":
      next = new Date(current.getFullYear(), current.getMonth() + 1, 0);
      break;
    default:
      return;
  }
  e.preventDefault();
  if (ctx.min && next < startOfDay(ctx.min)) next = startOfDay(ctx.min);
  if (ctx.max && next > startOfDay(ctx.max)) next = startOfDay(ctx.max);
  ctx.onFocusedDayChange?.(next);
  if (
    next.getMonth() !== current.getMonth() ||
    next.getFullYear() !== current.getFullYear()
  ) {
    ctx.onMonthChange(new Date(next.getFullYear(), next.getMonth(), 1));
  }
}

function addDays(d: Date, delta: number): Date {
  const next = new Date(d);
  next.setDate(next.getDate() + delta);
  return next;
}
