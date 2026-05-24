"use client";

import { useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, X } from "lucide-react";

/**
 * Console-framed modal dialog. Centered card on desktop, sheet on mobile.
 * The chrome (navy-deep header + footer with teal LED + STATUS line) echoes
 * the auth layout — the action surface reads as part of the same console.
 */
export function Modal({
  open,
  onClose,
  onBack,
  title,
  eyebrow,
  status = "READY",
  children,
  footer,
  size = "default",
}: {
  open: boolean;
  onClose: () => void;
  /** Optional back affordance — when provided, renders a chevron-left in the
   *  header that goes "up one level" (e.g. verify → multi-student picker).
   *  Distinct from `onClose` (which always returns to idle). */
  onBack?: () => void;
  /** The main label, e.g. "Lend STH-001". */
  title: string;
  /** Mono caps row above title — e.g. "LEND" or "APPROVE PICKUP". */
  eyebrow?: string;
  /** Right-side mono caps in the bottom chrome. Defaults to "READY". */
  status?: string;
  children: React.ReactNode;
  /** Footer slot — typically [Cancel] [Confirm]. */
  footer?: React.ReactNode;
  size?: "default" | "wide";
}) {
  const titleId = useId();
  const cardRef = useRef<HTMLDivElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;

    previousFocus.current = document.activeElement as HTMLElement | null;

    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const FOCUSABLE_SELECTOR =
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key !== "Tab") return;
      const card = cardRef.current;
      if (!card) return;
      const focusables = Array.from(
        card.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
      ).filter((el) => !el.hasAttribute("disabled") && el.tabIndex !== -1);
      if (focusables.length === 0) {
        e.preventDefault();
        return;
      }
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement as HTMLElement | null;
      if (e.shiftKey && (active === first || !card.contains(active))) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && (active === last || !card.contains(active))) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);

    requestAnimationFrame(() => {
      const card = cardRef.current;
      if (!card) return;
      const focusable = card.querySelector<HTMLElement>(
        "input, select, textarea, button:not([disabled])",
      );
      focusable?.focus();
    });

    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener("keydown", onKey);
      previousFocus.current?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;
  if (typeof window === "undefined") return null;

  const sizeClass = size === "wide" ? "max-w-2xl" : "max-w-lg";

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-6"
    >
      {/* Backdrop */}
      <button
        type="button"
        aria-label="Close dialog"
        onClick={onClose}
        className="absolute inset-0 bg-navy-deep/70 backdrop-blur-[1px] cursor-default"
        tabIndex={-1}
      />

      {/* Card */}
      <div
        ref={cardRef}
        className={`tek-pop relative z-10 w-full ${sizeClass} max-h-[92vh] flex flex-col bg-paper border-[1.5px] border-navy-deep rounded-xl shadow-2xl overflow-hidden`}
      >
        {/* Top chrome — navy bar with LED + eyebrow + close */}
        <header className="bg-navy-deep flex items-center justify-between px-5 py-3 border-b-[1.5px] border-navy">
          <div className="flex items-center gap-2 min-w-0">
            {onBack && (
              <button
                type="button"
                onClick={onBack}
                aria-label="Back"
                className="text-mist hover:text-teal transition-colors p-1 -ml-1 mr-1"
              >
                <ChevronLeft size={18} strokeWidth={2.25} />
              </button>
            )}
            <span
              aria-hidden
              className="relative inline-flex shrink-0 size-2.5 rounded-fab bg-teal"
            >
              <span className="absolute inset-0 rounded-fab bg-teal opacity-60 animate-ping" />
            </span>
            <span className="font-mono uppercase text-[11px] tracking-[0.12em] text-cyan/80 font-semibold">
              {eyebrow ?? "ACTION"}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="text-mist hover:text-teal transition-colors p-1 -mr-1"
          >
            <X size={18} strokeWidth={2} />
          </button>
        </header>

        {/* Title + body */}
        <div className="px-6 py-5 md:px-7 md:py-6 overflow-y-auto">
          <h2
            id={titleId}
            className="font-display italic font-extrabold text-[26px] md:text-[28px] text-navy leading-tight"
          >
            {title}
          </h2>
          <div className="mt-5">{children}</div>
        </div>

        {/* Footer slot + bottom chrome */}
        {footer && (
          <div className="px-6 py-4 md:px-7 md:py-5 border-t border-rule bg-paper">
            {footer}
          </div>
        )}

        <footer
          aria-hidden
          className="bg-navy-deep flex items-center justify-between px-5 py-2.5 border-t-[1.5px] border-navy"
        >
          <div className="flex items-center gap-2 font-mono uppercase text-[10.5px] text-mist tracking-[0.14em] font-bold">
            <span className="size-1.5 rounded-fab bg-teal animate-pulse" />
            STATUS · {status}
          </div>
          <div className="font-mono uppercase text-[10.5px] text-cyan/70 tracking-[0.12em] font-semibold">
            T.E.K NURSE
          </div>
        </footer>
      </div>
    </div>,
    document.body,
  );
}
