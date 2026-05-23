"use client";

import { forwardRef } from "react";
import { Loader2 } from "lucide-react";

type Variant = "primary" | "secondary" | "tertiary" | "danger";

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  /** When true, renders a spinner before the label and forces disabled.
   *  The label stays the same — the spinner is the "I'm busy" signal. */
  loading?: boolean;
};

const BASE =
  "inline-flex items-center justify-center gap-2 transition-colors disabled:opacity-40 disabled:pointer-events-none";

const VARIANT: Record<Variant, string> = {
  primary:
    "bg-teal text-white font-mono uppercase text-[15px] tracking-[0.12em] font-bold px-6 py-4 rounded hover:bg-teal-deep active:bg-navy-deep",
  secondary:
    "bg-transparent text-navy border-[1.5px] border-navy text-[15px] font-bold px-6 py-4 rounded hover:bg-paper hover:border-teal hover:text-teal-deep",
  tertiary:
    "text-navy text-[15px] font-bold px-1 py-0.5 hover:underline underline-offset-4 decoration-teal decoration-2",
  danger:
    "bg-red-deep text-white font-mono uppercase text-[15px] tracking-[0.12em] font-bold px-6 py-4 rounded hover:bg-red active:bg-red-deep",
};

export const Button = forwardRef<HTMLButtonElement, Props>(function Button(
  {
    variant = "primary",
    className = "",
    children,
    loading = false,
    disabled,
    ...rest
  },
  ref,
) {
  return (
    <button
      ref={ref}
      className={`${BASE} ${VARIANT[variant]} ${className}`}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading && (
        <Loader2
          size={16}
          strokeWidth={2}
          className="animate-spin"
          aria-hidden
        />
      )}
      {children}
    </button>
  );
});
