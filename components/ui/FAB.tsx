"use client";

import { QrCode } from "lucide-react";

type Size = "md" | "lg";

export function FAB({
  onClick,
  label = "SCAN",
  ariaLabel,
  size = "md",
  className = "",
}: {
  onClick?: () => void;
  label?: string;
  ariaLabel?: string;
  size?: Size;
  className?: string;
}) {
  const dim = size === "lg" ? "w-16 h-16" : "w-14 h-14";
  return (
    <div className={`inline-flex flex-col items-center gap-1 ${className}`}>
      <button
        type="button"
        onClick={onClick}
        aria-label={ariaLabel ?? label}
        className={`${dim} rounded-fab bg-teal text-white flex items-center justify-center hover:bg-teal-deep active:bg-navy-deep transition-colors`}
      >
        <QrCode size={24} strokeWidth={1.75} />
      </button>
      {label && (
        <span className="font-mono uppercase text-[10px] tracking-[0.08em] text-navy font-semibold">
          {label}
        </span>
      )}
    </div>
  );
}
