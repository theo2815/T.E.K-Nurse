"use client";

import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from "react";
import { createPortal } from "react-dom";
import { ChevronRight, X } from "lucide-react";
import { useProgressRouter } from "@/lib/use-progress-router";
import type { NotificationRow as TNotification } from "@/lib/supabase/queries/notifications";
import { NotificationRow } from "./NotificationRow";
import { MarkAllReadButton } from "./MarkAllReadButton";

type Props = {
  anchorRef: RefObject<HTMLButtonElement | null>;
  rows: TNotification[];
  unreadCount: number;
  fullPageHref: string;
  onSelect: (n: TNotification) => void;
  onClose: () => void;
};

type Coords = { top: number; left: number; width: number };

export function NotificationsPopover({
  anchorRef,
  rows,
  unreadCount,
  fullPageHref,
  onSelect,
  onClose,
}: Props) {
  const popoverRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState<Coords | null>(null);
  const progressRouter = useProgressRouter();

  // Outside click + Escape close. Restore focus to the anchor on Esc.
  useEffect(() => {
    function onPointerDown(e: PointerEvent) {
      const t = e.target as Node;
      if (anchorRef.current?.contains(t) || popoverRef.current?.contains(t)) {
        return;
      }
      onClose();
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onClose();
        anchorRef.current?.focus();
      }
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [anchorRef, onClose]);

  // Fixed positioning, right-aligned to anchor on desktop; full-width on mobile.
  // Same plumbing pattern as DateField (DatePopover) so the popover escapes
  // any scroll/transform container and tracks the anchor on scroll/resize.
  useLayoutEffect(() => {
    function compute() {
      const anchor = anchorRef.current;
      if (!anchor) return;
      const tr = anchor.getBoundingClientRect();
      const vw = window.innerWidth;
      const gap = 8;
      const margin = 8;
      const mobile = vw < 640;

      if (mobile) {
        setCoords({
          top: tr.bottom + gap,
          left: margin,
          width: vw - margin * 2,
        });
        return;
      }

      const popWidth = 380;
      let left = tr.right - popWidth;
      if (left < margin) left = margin;
      if (left + popWidth > vw - margin) left = vw - popWidth - margin;
      setCoords({ top: tr.bottom + gap, left, width: popWidth });
    }

    compute();
    const raf = requestAnimationFrame(compute);
    const handler = () => compute();
    window.addEventListener("scroll", handler, { capture: true, passive: true });
    window.addEventListener("resize", handler);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", handler, { capture: true });
      window.removeEventListener("resize", handler);
    };
  }, [anchorRef]);

  if (typeof window === "undefined") return null;

  return createPortal(
    <div
      ref={popoverRef}
      role="dialog"
      aria-label="Notifications"
      style={{
        position: "fixed",
        top: coords?.top ?? 0,
        left: coords?.left ?? 0,
        width: coords?.width ?? 360,
        maxHeight: coords ? `calc(100vh - ${coords.top + 16}px)` : undefined,
        visibility: coords ? "visible" : "hidden",
      }}
      className="tek-pop z-[60] bg-paper border-[1.5px] border-rule rounded shadow-xl flex flex-col overflow-hidden"
    >
      <div className="flex items-center justify-between gap-3 px-4 py-3 bg-navy text-white shrink-0">
        <span className="font-mono uppercase text-[11px] tracking-[0.1em] font-semibold">
          Notifications
          {unreadCount > 0 && (
            <span className="text-cyan"> · {unreadCount} unread</span>
          )}
        </span>
        <div className="flex items-center gap-3">
          {unreadCount > 0 && (
            <MarkAllReadButton
              unreadCount={unreadCount}
              variant="popover"
            />
          )}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close notifications"
            className="text-white/70 hover:text-white transition-colors"
          >
            <X size={16} strokeWidth={2} />
          </button>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
          <p className="font-mono uppercase text-[11px] tracking-[0.1em] text-slate">
            No notifications yet
          </p>
          <p className="text-[13px] text-slate/70 mt-2">
            Updates about loans, requests, and lab events appear here.
          </p>
        </div>
      ) : (
        <ul className="flex-1 overflow-y-auto divide-y divide-rule/60 min-h-0">
          {rows.map((n) => (
            <li key={n.id}>
              <NotificationRow
                notification={n}
                onSelect={onSelect}
                size="compact"
              />
            </li>
          ))}
        </ul>
      )}

      <button
        type="button"
        onClick={() => {
          onClose();
          progressRouter.push(fullPageHref);
        }}
        className="flex items-center justify-between gap-2 px-4 py-3 border-t border-rule text-navy text-[14px] font-semibold hover:bg-mist transition-colors shrink-0"
      >
        <span>View all</span>
        <ChevronRight size={16} strokeWidth={2} className="text-teal" />
      </button>
    </div>,
    document.body,
  );
}
