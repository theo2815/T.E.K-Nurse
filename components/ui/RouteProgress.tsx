"use client";

import { useEffect, useReducer } from "react";
import { subscribe } from "@/lib/progress";

/**
 * 2px navy→teal→cyan progress bar pinned to the top of the viewport.
 * Subscribes to the global `lib/progress` counter. Triggered by any
 * `useProgressRouter()` transition (refresh / push / replace).
 *
 * Lifecycle: idle → armed (80ms debounce) → running (trickles 0→80% over
 * 2.4s) → fading (snaps to 100%, opacity fades over 220ms) → idle.
 * The debounce keeps sub-flash refreshes from strobing the UI.
 *
 * z-[60] so it sits above Modal (z-50) — the bar should stay visible while
 * a modal is open if the modal's action triggers a refresh.
 */

type Phase = "idle" | "armed" | "running" | "fading";
type Action = "active-true" | "active-false" | "armed-elapsed" | "faded";

function reducer(phase: Phase, action: Action): Phase {
  switch (action) {
    case "active-true":
      if (phase === "idle" || phase === "fading") return "armed";
      return phase;
    case "active-false":
      if (phase === "armed") return "idle";
      if (phase === "running") return "fading";
      return phase;
    case "armed-elapsed":
      return phase === "armed" ? "running" : phase;
    case "faded":
      return phase === "fading" ? "idle" : phase;
  }
}

const DEBOUNCE_MS = 80;
const TRICKLE_DURATION_MS = 2400;
const FADE_DURATION_MS = 220;

export function RouteProgress() {
  const [phase, dispatch] = useReducer(reducer, "idle");

  useEffect(() => {
    return subscribe((active) => {
      dispatch(active ? "active-true" : "active-false");
    });
  }, []);

  useEffect(() => {
    if (phase === "armed") {
      const t = setTimeout(() => dispatch("armed-elapsed"), DEBOUNCE_MS);
      return () => clearTimeout(t);
    }
    if (phase === "fading") {
      const t = setTimeout(() => dispatch("faded"), FADE_DURATION_MS);
      return () => clearTimeout(t);
    }
  }, [phase]);

  const width =
    phase === "running" ? "80%" : phase === "fading" ? "100%" : "0%";
  const opacity = phase === "running" || phase === "fading" ? 1 : 0;
  const targetOpacity = phase === "fading" ? 0 : opacity;

  return (
    <div
      aria-hidden
      className="fixed top-0 left-0 right-0 h-[2px] z-[60] pointer-events-none"
      style={{
        opacity: targetOpacity,
        transition:
          phase === "fading"
            ? `opacity ${FADE_DURATION_MS}ms ease-out`
            : "opacity 0ms",
      }}
    >
      <div
        className="h-full"
        style={{
          width,
          background:
            "linear-gradient(90deg, var(--color-navy) 0%, var(--color-teal) 50%, var(--color-cyan) 100%)",
          transition:
            phase === "running"
              ? `width ${TRICKLE_DURATION_MS}ms cubic-bezier(0.1, 0.5, 0.4, 1)`
              : "none",
        }}
      />
    </div>
  );
}
