"use client";

export type Chip = { value: string; label: string };

export function FilterChipRow({
  chips,
  value,
  onChange,
  className = "",
}: {
  chips: Chip[];
  value: string;
  onChange: (v: string) => void;
  className?: string;
}) {
  return (
    <div
      role="tablist"
      className={`flex gap-6 border-b border-rule ${className}`}
    >
      {chips.map((c) => {
        const active = c.value === value;
        return (
          <button
            key={c.value}
            role="tab"
            type="button"
            aria-selected={active}
            onClick={() => onChange(c.value)}
            className={`relative py-2 font-mono uppercase text-caps-sm font-semibold transition-colors ${
              active ? "text-navy" : "text-slate/70 hover:text-slate"
            }`}
          >
            {c.label}
            {active && (
              <span
                aria-hidden
                className="absolute left-0 right-0 -bottom-[1px] h-[2px] bg-amber"
              />
            )}
          </button>
        );
      })}
    </div>
  );
}
