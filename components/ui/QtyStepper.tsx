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
  return (
    <div className="inline-flex items-center border-[1.5px] border-rule rounded bg-white">
      <button
        type="button"
        aria-label="Decrease quantity"
        disabled={disabled || value <= min}
        onClick={() => onChange(Math.max(min, value - 1))}
        className="p-3 text-navy hover:text-teal disabled:opacity-30 disabled:pointer-events-none"
      >
        <Minus size={18} strokeWidth={2} />
      </button>
      <div className="w-16 text-center font-display italic font-extrabold text-[28px] text-navy leading-none">
        {value}
      </div>
      <button
        type="button"
        aria-label="Increase quantity"
        disabled={disabled || value >= max}
        onClick={() => onChange(Math.min(max, value + 1))}
        className="p-3 text-navy hover:text-teal disabled:opacity-30 disabled:pointer-events-none"
      >
        <Plus size={18} strokeWidth={2} />
      </button>
    </div>
  );
}
