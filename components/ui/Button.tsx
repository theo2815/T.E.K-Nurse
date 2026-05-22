"use client";

import { forwardRef } from "react";

type Variant = "primary" | "secondary" | "tertiary";

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
};

const BASE =
  "inline-flex items-center justify-center transition-colors disabled:opacity-40 disabled:pointer-events-none";

const VARIANT: Record<Variant, string> = {
  primary:
    "bg-amber text-navy font-mono uppercase text-[13px] tracking-[0.08em] font-semibold px-6 py-4 rounded hover:bg-[#bc8e3f] active:bg-[#a37b35]",
  secondary:
    "bg-transparent text-navy border border-navy text-sm font-medium px-6 py-4 rounded hover:bg-paper hover:border-[1.5px]",
  tertiary:
    "text-navy text-sm font-medium px-1 py-0.5 hover:underline underline-offset-4 decoration-amber decoration-2",
};

export const Button = forwardRef<HTMLButtonElement, Props>(function Button(
  { variant = "primary", className = "", children, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      className={`${BASE} ${VARIANT[variant]} ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
});
