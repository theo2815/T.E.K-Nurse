"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Calendar as CalendarIcon } from "lucide-react";
import { Calendar, parseIso, toIso } from "@/components/ui/Calendar";

type Props = {
  /** ISO YYYY-MM-DD or "" for empty. */
  value: string;
  onChange: (iso: string) => void;
  min?: string;
  max?: string;
  label?: string;
  caption?: string;
  error?: string;
  required?: boolean;
  /** Optional name attribute — for plain <form> submission via a hidden input. */
  name?: string;
  placeholder?: string;
};

const WEEKDAY = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
const MONTH = [
  "JAN", "FEB", "MAR", "APR", "MAY", "JUN",
  "JUL", "AUG", "SEP", "OCT", "NOV", "DEC",
];

function formatTrigger(iso: string): string {
  const d = parseIso(iso);
  if (!d) return "";
  return `${WEEKDAY[d.getDay()]} · ${d.getDate()} ${MONTH[d.getMonth()]} ${d.getFullYear()}`;
}

type Coords = { top: number; left: number; placement: "below" | "above" };

export function DateField({
  value,
  onChange,
  min,
  max,
  label,
  caption,
  error,
  required,
  name,
  placeholder = "Pick a date",
}: Props) {
  const id = useId();
  const popoverId = `${id}-popover`;
  const errorId = error ? `${id}-error` : undefined;

  const [open, setOpen] = useState(false);

  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Outside click + Escape to close.
  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: PointerEvent) {
      const t = e.target as Node;
      if (
        triggerRef.current?.contains(t) ||
        popoverRef.current?.contains(t)
      ) {
        return;
      }
      setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function handleSelect(d: Date) {
    onChange(toIso(d));
    setOpen(false);
    requestAnimationFrame(() => triggerRef.current?.focus());
  }

  const triggerLabel = value ? formatTrigger(value) : placeholder;
  const empty = !value;

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label
          htmlFor={id}
          className="text-[15px] text-slate font-bold uppercase tracking-[0.08em]"
        >
          {label}
          {required && (
            <span aria-hidden className="text-teal ml-1">
              *
            </span>
          )}
        </label>
      )}

      <div className="relative">
        <button
          ref={triggerRef}
          id={id}
          type="button"
          aria-haspopup="dialog"
          aria-expanded={open}
          aria-controls={popoverId}
          aria-describedby={errorId}
          onClick={() => setOpen((v) => !v)}
          className={[
            "w-full rounded border-[1.5px] bg-white py-3.5 px-4 pr-12 text-left",
            "font-mono uppercase text-[14px] tracking-[0.08em] font-semibold",
            "transition-colors focus:outline-none",
            empty ? "text-slate/60" : "text-navy",
            error
              ? "border-red focus:border-red"
              : open
              ? "border-teal"
              : "border-rule focus:border-teal hover:border-slate/60",
          ].join(" ")}
        >
          {triggerLabel}
        </button>
        <CalendarIcon
          size={18}
          strokeWidth={1.75}
          aria-hidden
          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-teal"
        />

        {name && <input type="hidden" name={name} value={value} />}

        {open && (
          <DatePopover
            popoverRef={popoverRef}
            popoverId={popoverId}
            triggerRef={triggerRef}
            label={label}
            value={value}
            min={min}
            max={max}
            onSelect={handleSelect}
          />
        )}
      </div>

      {caption && !error && (
        <p className="text-[14px] text-slate">{caption}</p>
      )}
      {error && (
        <p id={errorId} className="text-[13px] text-red-deep font-medium">
          {error}
        </p>
      )}
    </div>
  );
}

/**
 * Portaled popover. Positioned with `fixed` coords relative to the trigger
 * so it escapes any scroll container (e.g. Modal body) and floats above the
 * surrounding chrome. Flips above the trigger when there isn't room below.
 */
function DatePopover({
  popoverRef,
  popoverId,
  triggerRef,
  label,
  value,
  min,
  max,
  onSelect,
}: {
  popoverRef: React.RefObject<HTMLDivElement | null>;
  popoverId: string;
  triggerRef: React.RefObject<HTMLButtonElement | null>;
  label?: string;
  value: string;
  min?: string;
  max?: string;
  onSelect: (d: Date) => void;
}) {
  const valueDate = parseIso(value);
  const minDate = parseIso(min);
  const maxDate = parseIso(max);

  const initialDay = valueDate ?? minDate ?? new Date();
  const [focusedMonth, setFocusedMonth] = useState(
    new Date(initialDay.getFullYear(), initialDay.getMonth(), 1),
  );
  const [focusedDay, setFocusedDay] = useState<Date | null>(initialDay);

  const [coords, setCoords] = useState<Coords | null>(null);

  useLayoutEffect(() => {
    function computePosition() {
      const trigger = triggerRef.current;
      const popover = popoverRef.current;
      if (!trigger || !popover) return;

      const tr = trigger.getBoundingClientRect();
      const popWidth = popover.offsetWidth;
      const vw = window.innerWidth;
      const gap = 8;
      const margin = 8;

      // Always anchor below the trigger — popover caps its own height to
      // available space and scrolls internally if needed.
      const top = tr.bottom + gap;

      let left = tr.left;
      if (left + popWidth > vw - margin) left = vw - popWidth - margin;
      if (left < margin) left = margin;

      setCoords({ top, left, placement: "below" });
    }

    computePosition();
    // One more pass after first paint in case fonts/layout shift the height.
    const raf = requestAnimationFrame(computePosition);

    const handler = () => computePosition();
    window.addEventListener("scroll", handler, { capture: true, passive: true });
    window.addEventListener("resize", handler);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", handler, { capture: true });
      window.removeEventListener("resize", handler);
    };
  }, [popoverRef, triggerRef]);

  if (typeof window === "undefined") return null;

  return createPortal(
    <div
      ref={popoverRef}
      id={popoverId}
      role="dialog"
      aria-label={label ? `${label} — pick a date` : "Pick a date"}
      style={{
        position: "fixed",
        top: coords?.top ?? 0,
        left: coords?.left ?? 0,
        maxHeight: coords ? `calc(100vh - ${coords.top + 8}px)` : undefined,
        visibility: coords ? "visible" : "hidden",
      }}
      className="tek-pop z-[60] min-w-[320px] max-w-[360px] rounded border-[1.5px] border-rule bg-paper p-4 shadow-xl origin-top overflow-y-auto"
    >
      <Calendar
        value={valueDate}
        focusedMonth={focusedMonth}
        onMonthChange={setFocusedMonth}
        onSelect={onSelect}
        min={minDate}
        max={maxDate}
        focusedDay={focusedDay}
        onFocusedDayChange={setFocusedDay}
      />
    </div>,
    document.body,
  );
}
