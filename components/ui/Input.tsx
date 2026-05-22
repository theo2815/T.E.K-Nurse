"use client";

import { forwardRef, useId, useState } from "react";
import { Eye, EyeOff, Search } from "lucide-react";

type Props = React.InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  error?: string;
  search?: boolean;
  /** When true on a password input, shows an eye toggle to reveal/hide. */
  revealable?: boolean;
  /** When true, shows a teal asterisk after the label. */
  requiredMark?: boolean;
};

export const Input = forwardRef<HTMLInputElement, Props>(function Input(
  {
    label,
    error,
    search,
    revealable,
    requiredMark,
    type,
    className = "",
    id,
    ...rest
  },
  ref,
) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const errorId = error ? `${inputId}-error` : undefined;
  const [revealed, setRevealed] = useState(false);

  const isPasswordRevealable = revealable && type === "password";
  const effectiveType = isPasswordRevealable && revealed ? "text" : type;

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label
          htmlFor={inputId}
          className="text-[15px] text-slate font-bold uppercase tracking-[0.08em]"
        >
          {label}
          {requiredMark && (
            <span
              aria-hidden
              className="text-teal ml-1"
            >
              *
            </span>
          )}
        </label>
      )}
      <div className="relative">
        {search && (
          <Search
            size={16}
            strokeWidth={1.75}
            aria-hidden
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate"
          />
        )}
        <input
          ref={ref}
          id={inputId}
          type={effectiveType}
          aria-invalid={error ? true : undefined}
          aria-describedby={errorId}
          className={`w-full rounded border-[1.5px] bg-white py-3.5 px-4 text-navy placeholder:text-slate/60 focus:outline-none ${
            search ? "pl-9" : ""
          } ${
            isPasswordRevealable ? "pr-12" : ""
          } ${
            error
              ? "border-red focus:border-red"
              : "border-rule focus:border-teal"
          } ${className}`}
          {...rest}
        />
        {isPasswordRevealable && (
          <button
            type="button"
            tabIndex={-1}
            onClick={() => setRevealed((v) => !v)}
            aria-label={revealed ? "Hide password" : "Show password"}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-slate hover:text-navy transition-colors rounded"
          >
            {revealed ? (
              <EyeOff size={18} strokeWidth={1.75} />
            ) : (
              <Eye size={18} strokeWidth={1.75} />
            )}
          </button>
        )}
      </div>
      {error && (
        <p id={errorId} className="text-[13px] text-red-deep font-medium">
          {error}
        </p>
      )}
    </div>
  );
});
