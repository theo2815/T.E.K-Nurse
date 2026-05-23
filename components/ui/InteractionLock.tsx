"use client";

import { useEffect, useState } from "react";
import { subscribe } from "@/lib/progress";

/**
 * Transparent full-viewport overlay that captures all pointer events while a
 * user-initiated mutation/navigation is in flight. Subscribes to the same
 * global counter as `RouteProgress`. No visible chrome — cursor flips to
 * `wait` so the user sees the change without a heavy backdrop dim.
 *
 * z-40 — below Modal (z-50), so any open modal stays interactive. The lock's
 * main job is the post-modal-close `router.refresh()` window where the page
 * underneath is briefly stale.
 *
 * Debounced 80ms on (matches the bar) so quick actions don't flicker the
 * cursor. Off is immediate.
 */

const DEBOUNCE_MS = 80;

export function InteractionLock() {
  const [active, setActive] = useState(false);

  useEffect(() => {
    let t: ReturnType<typeof setTimeout> | null = null;

    const unsub = subscribe((next) => {
      if (t) {
        clearTimeout(t);
        t = null;
      }
      if (next) {
        t = setTimeout(() => {
          setActive(true);
          t = null;
        }, DEBOUNCE_MS);
      } else {
        setActive(false);
      }
    });

    return () => {
      if (t) clearTimeout(t);
      unsub();
    };
  }, []);

  if (!active) return null;

  return (
    <div
      aria-hidden
      className="fixed inset-0 z-40 cursor-wait"
      style={{ touchAction: "none" }}
    />
  );
}
