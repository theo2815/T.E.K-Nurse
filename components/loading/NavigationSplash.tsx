"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { hideNavSplash } from "@/lib/nav-splash";

/**
 * Pathname-watcher that hides the imperative nav splash when the destination
 * route has actually committed (i.e. usePathname returns the new URL).
 *
 * The splash itself is created and shown imperatively via `showNavSplash()`
 * in `lib/nav-splash.ts` — called from login form / accept-invite / any other
 * navigation initiator before `router.replace()`. This component lives in
 * RootLayout (always mounted) so it can observe every pathname change
 * regardless of which segment is active.
 *
 * No React state for visibility — that approach failed because state updates
 * can be deferred by React's suspended render queue during the very window
 * we need the splash to paint. The DOM element is toggled directly via
 * inline-style opacity, which the browser paints independently of React's
 * commit cycle.
 */
export function NavigationSplash() {
  const pathname = usePathname();
  const initialMount = useRef(true);

  useEffect(() => {
    if (initialMount.current) {
      initialMount.current = false;
      return;
    }
    // `/` is a transient redirector (app/page.tsx) that immediately
    // `redirect()`s to /staff/home or /student/home — it never paints
    // visible content. Skip hiding on this intermediate pathname so the
    // splash spans the entire /login → / → /staff/home chain seamlessly.
    if (pathname === "/") return;
    // 50ms delay gives the destination's first paint a beat to land under
    // the still-opaque splash before the fade-out begins, eliminating any
    // sub-frame gap between splash hide and destination commit.
    const t = setTimeout(() => hideNavSplash(), 50);
    return () => clearTimeout(t);
  }, [pathname]);

  return null;
}
