"use client";

import { useEffect } from "react";
import { hideNavSplash } from "@/lib/nav-splash";

/**
 * Hides the server-rendered `<AppSplash />` once React has hydrated. Runs
 * exactly once on first mount of RootLayout. Brief 100ms delay so the
 * destination's first paint can land under the still-opaque splash before
 * the fade-out begins — eliminates any sub-frame gap.
 *
 * After this hide, the same `id="tek-nav-splash"` element remains in the
 * DOM (just opacity:0 + pointer-events:none) so `showNavSplash()` /
 * `hideNavSplash()` from `lib/nav-splash.ts` can reuse it for in-app
 * navigation transitions.
 */
export function HideAppSplashOnMount() {
  useEffect(() => {
    const t = setTimeout(() => hideNavSplash(), 100);
    return () => clearTimeout(t);
  }, []);

  return null;
}
