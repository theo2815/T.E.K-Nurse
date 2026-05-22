"use client";

import { forwardRef, useId } from "react";
import { Search } from "lucide-react";

type Props = React.InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  error?: string;
  search?: boolean;
};

export const Input = forwardRef<HTMLInputElement, Props>(function Input(
  { label, error, search, className = "", id, ...rest },
  ref,
) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const errorId = error ? `${inputId}-error` : undefined;

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label
          htmlFor={inputId}
          className="text-[13px] text-slate font-medium"
        >
          {label}
        </label>
      )}
      <div className="relative">
        {search && (
          <Search
            size={16}
            strokeWidth={1.5}
            aria-hidden
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate"
          />
        )}
        <input
          ref={ref}
          id={inputId}
          aria-invalid={error ? true : undefined}
          aria-describedby={errorId}
          className={`w-full rounded border bg-transparent py-3 px-4 text-navy placeholder:italic placeholder:text-slate/70 focus:outline-none ${
            search ? "pl-9" : ""
          } ${
            error
              ? "border-brick focus:border-brick"
              : "border-rule focus:border-amber"
          } ${className}`}
          {...rest}
        />
      </div>
      {error && (
        <p id={errorId} className="text-[13px] text-brick-bold italic">
          {error}
        </p>
      )}
    </div>
  );
});
