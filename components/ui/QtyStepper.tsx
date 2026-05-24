"use client";

import { useEffect, useRef, useState } from "react";
import { Minus, Plus } from "lucide-react";

export function QtyStepper({
  value,
  min,
  max,
  onChange,
  disabled,
}: {
  value: number;
  min: number;
  max: number;
  onChange: (n: number) => void;
  disabled?: boolean;
}) {
  // The text shown in the input. Decoupled from the parent's `value` so the
  // user can hold an empty or partial entry mid-edit (e.g. erase "1" to type
  // "5"). Synced FROM parent only when the user is not actively typing.
  const [draft, setDraft] = useState<string>(() =>
    Number.isFinite(value) ? String(value) : "",
  );
  const isEditing = useRef(false);

  useEffect(() => {
    if (!isEditing.current) {
      setDraft(Number.isFinite(value) ? String(value) : "");
    }
  }, [value]);

  function clamp(n: number): number {
    return Math.max(min, Math.min(max, Math.trunc(n)));
  }

  function step(delta: number) {
    const base = Number.isFinite(value) ? value : min;
    const next = clamp(base + delta);
    onChange(next);
    setDraft(String(next));
  }

  return (
    <div className="inline-flex items-center border-[1.5px] border-rule rounded bg-white focus-within:border-teal transition-colors">
      <button
        type="button"
        aria-label="Decrease quantity"
        disabled={disabled || value <= min}
        onClick={() => step(-1)}
        className="p-3 text-navy hover:text-teal disabled:opacity-30 disabled:pointer-events-none"
      >
        <Minus size={18} strokeWidth={2} />
      </button>
      <input
        type="number"
        inputMode="numeric"
        value={draft}
        min={min}
        max={max}
        disabled={disabled}
        onChange={(e) => {
          const next = e.target.value;
          setDraft(next);
          if (next === "") return; // hold the empty state; resolve on blur
          const parsed = Number(next);
          if (Number.isFinite(parsed)) {
            // Propagate the raw typed value so parent feedback (overstock,
            // canSubmit, etc.) updates live. Clamping happens on blur.
            onChange(Math.trunc(parsed));
          }
        }}
        onFocus={(e) => {
          isEditing.current = true;
          e.target.select();
        }}
        onBlur={(e) => {
          isEditing.current = false;
          const parsed = Number(e.target.value);
          if (e.target.value === "" || Number.isNaN(parsed)) {
            onChange(min);
            setDraft(String(min));
            return;
          }
          const clamped = clamp(parsed);
          onChange(clamped);
          setDraft(String(clamped));
        }}
        aria-label="Quantity"
        className="w-20 text-center font-display italic font-extrabold text-[28px] text-navy leading-none bg-transparent outline-none disabled:opacity-50 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
      />
      <button
        type="button"
        aria-label="Increase quantity"
        disabled={disabled || value >= max}
        onClick={() => step(1)}
        className="p-3 text-navy hover:text-teal disabled:opacity-30 disabled:pointer-events-none"
      >
        <Plus size={18} strokeWidth={2} />
      </button>
    </div>
  );
}
