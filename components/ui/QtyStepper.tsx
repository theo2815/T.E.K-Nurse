"use client";

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
  function commit(n: number) {
    if (Number.isNaN(n)) {
      onChange(min);
      return;
    }
    onChange(Math.max(min, Math.min(max, Math.trunc(n))));
  }

  return (
    <div className="inline-flex items-center border-[1.5px] border-rule rounded bg-white focus-within:border-teal transition-colors">
      <button
        type="button"
        aria-label="Decrease quantity"
        disabled={disabled || value <= min}
        onClick={() => commit(value - 1)}
        className="p-3 text-navy hover:text-teal disabled:opacity-30 disabled:pointer-events-none"
      >
        <Minus size={18} strokeWidth={2} />
      </button>
      <input
        type="number"
        inputMode="numeric"
        value={Number.isFinite(value) ? value : ""}
        min={min}
        max={max}
        disabled={disabled}
        onChange={(e) => commit(e.target.valueAsNumber)}
        onFocus={(e) => e.target.select()}
        onBlur={(e) => {
          if (e.target.value === "" || Number.isNaN(e.target.valueAsNumber)) {
            onChange(min);
          }
        }}
        aria-label="Quantity"
        className="w-20 text-center font-display italic font-extrabold text-[28px] text-navy leading-none bg-transparent outline-none disabled:opacity-50 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
      />
      <button
        type="button"
        aria-label="Increase quantity"
        disabled={disabled || value >= max}
        onClick={() => commit(value + 1)}
        className="p-3 text-navy hover:text-teal disabled:opacity-30 disabled:pointer-events-none"
      >
        <Plus size={18} strokeWidth={2} />
      </button>
    </div>
  );
}
