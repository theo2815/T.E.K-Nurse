"use client";

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";

type Props = {
  length?: number;
  value: string;
  onChange: (value: string) => void;
  onComplete?: (value: string) => void;
  disabled?: boolean;
  error?: string;
  autoFocus?: boolean;
  label?: string;
};

export type OtpInputHandle = {
  focus: () => void;
  clear: () => void;
};

export const OtpInput = forwardRef<OtpInputHandle, Props>(function OtpInput(
  {
    length = 6,
    value,
    onChange,
    onComplete,
    disabled,
    error,
    autoFocus,
    label,
  },
  ref,
) {
  const cellRefs = useRef<Array<HTMLInputElement | null>>([]);
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
    if (autoFocus) cellRefs.current[0]?.focus();
  }, [autoFocus]);

  useImperativeHandle(
    ref,
    () => ({
      focus: () => cellRefs.current[0]?.focus(),
      clear: () => {
        onChange("");
        cellRefs.current[0]?.focus();
      },
    }),
    [onChange],
  );

  const digits = Array.from({ length }, (_, i) => value[i] ?? "");

  function setDigit(index: number, digit: string) {
    const next = digits.slice();
    next[index] = digit;
    const joined = next.join("").slice(0, length);
    onChange(joined);
    if (joined.length === length && onComplete) onComplete(joined);
  }

  function handleInput(index: number, raw: string) {
    const digit = raw.replace(/\D/g, "").slice(-1);
    if (!digit) return;
    setDigit(index, digit);
    if (index < length - 1) cellRefs.current[index + 1]?.focus();
  }

  function handleKeyDown(
    index: number,
    e: React.KeyboardEvent<HTMLInputElement>,
  ) {
    if (e.key === "Backspace") {
      e.preventDefault();
      if (digits[index]) {
        setDigit(index, "");
        return;
      }
      if (index > 0) {
        setDigit(index - 1, "");
        cellRefs.current[index - 1]?.focus();
      }
      return;
    }

    if (e.key === "ArrowLeft" && index > 0) {
      e.preventDefault();
      cellRefs.current[index - 1]?.focus();
      return;
    }

    if (e.key === "ArrowRight" && index < length - 1) {
      e.preventDefault();
      cellRefs.current[index + 1]?.focus();
    }
  }

  function handlePaste(e: React.ClipboardEvent<HTMLInputElement>) {
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "");
    if (!pasted) return;
    e.preventDefault();
    const next = pasted.slice(0, length);
    onChange(next);
    const focusIndex = Math.min(next.length, length - 1);
    cellRefs.current[focusIndex]?.focus();
    if (next.length === length && onComplete) onComplete(next);
  }

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <span className="text-[15px] text-slate font-bold uppercase tracking-[0.08em]">
          {label}
        </span>
      )}
      <div
        className="flex items-center gap-2"
        role="group"
        aria-label={label ?? "One-time code"}
      >
        {digits.map((digit, index) => (
          <input
            key={index}
            ref={(el) => {
              cellRefs.current[index] = el;
            }}
            type="text"
            inputMode="numeric"
            autoComplete={index === 0 ? "one-time-code" : "off"}
            maxLength={1}
            aria-label={`Digit ${index + 1} of ${length}`}
            value={hasMounted ? digit : ""}
            disabled={disabled}
            onChange={(e) => handleInput(index, e.target.value)}
            onKeyDown={(e) => handleKeyDown(index, e)}
            onPaste={handlePaste}
            onFocus={(e) => e.currentTarget.select()}
            className={`w-12 h-14 text-center rounded border-[1.5px] bg-white text-navy font-mono text-[24px] font-semibold focus:outline-none transition-colors ${
              error
                ? "border-red focus:border-red"
                : "border-rule focus:border-teal"
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          />
        ))}
      </div>
      {error && (
        <p className="text-[13px] text-red-deep font-medium">{error}</p>
      )}
    </div>
  );
});
