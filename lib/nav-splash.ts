/**
 * Imperative navigation splash. Creates a fixed-position DOM element directly
 * in `document.body` via DOM ops — bypasses React's render cycle entirely so
 * the splash paints even when React is suspended waiting for a destination
 * route (which is when `<Suspense>` fallbacks and React-state-driven overlays
 * fail to bridge the gap).
 *
 * Trigger imperatively from a navigation initiator (e.g. login form's onSubmit
 * before `router.replace`). Hide automatically via `<NavigationSplash />`,
 * which watches `usePathname()` and calls `hideNavSplash()` when the URL
 * actually changes — i.e. when the destination has committed.
 *
 * All styling is inline + hard-coded design tokens so the splash works even
 * if Tailwind CSS hasn't finished loading or if the body has been temporarily
 * detached during a segment swap. Hex values mirror app/globals.css `@theme`.
 */

const SPLASH_ID = "tek-nav-splash";
const STYLES_ID = "tek-nav-splash-styles";

const NAVY = "#1F3A6E";
const TEAL = "#38B6BC";
const SLATE = "#475569";
const MIST = "#F0F4F8";

function ensureSplashElement(): HTMLElement {
  const existing = document.getElementById(SPLASH_ID);
  if (existing) return existing;

  if (!document.getElementById(STYLES_ID)) {
    const style = document.createElement("style");
    style.id = STYLES_ID;
    style.textContent = `
      @keyframes tek-splash-ping {
        75%, 100% { transform: scale(1.8); opacity: 0; }
      }
    `;
    document.head.appendChild(style);
  }

  const splash = document.createElement("div");
  splash.id = SPLASH_ID;
  splash.setAttribute("role", "status");
  splash.setAttribute("aria-live", "polite");
  splash.setAttribute("aria-label", "Loading");
  splash.style.cssText = [
    "position: fixed",
    "inset: 0",
    "z-index: 55",
    `background-color: ${MIST}`,
    "display: flex",
    "align-items: center",
    "justify-content: center",
    "opacity: 0",
    "pointer-events: none",
    // Transition is intentionally NOT set here — show() snaps to opaque on
    // the next frame (no fade-in gap); hide() sets a transition explicitly
    // for a smooth fade-out only. See bug history: a fade-in caused 75ms
    // of semi-transparency where the body bg bled through as a "white flash".
    "font-family: var(--font-body, -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif)",
  ].join("; ");

  splash.innerHTML = `
    <div style="text-align: center; max-width: 36rem; padding: 0 1.5rem;">
      <div style="display: flex; align-items: center; justify-content: center; gap: 0.75rem; margin-bottom: 1.5rem;">
        <svg viewBox="0 0 56 24" style="width: 3rem; height: 1.25rem; color: ${TEAL};" aria-hidden="true">
          <line x1="0" y1="5" x2="40" y2="5" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" />
          <line x1="10" y1="13" x2="54" y2="13" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" />
          <line x1="4" y1="21" x2="34" y2="21" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" />
        </svg>
        <span style="font-family: var(--font-mono, 'JetBrains Mono', ui-monospace, monospace); text-transform: uppercase; font-size: 11px; letter-spacing: 0.1em; color: ${TEAL}; font-weight: 600;">
          Clinical Console
        </span>
      </div>
      <h1 style="font-family: var(--font-display, Montserrat, Helvetica, Arial, sans-serif); font-style: italic; font-weight: 800; font-size: clamp(48px, 9vw, 88px); line-height: 0.95; color: ${NAVY}; letter-spacing: -0.02em; margin: 0;">
        T.E.K <span style="color: ${TEAL};">NURSE</span>
      </h1>
      <div style="margin-top: 2rem; display: flex; align-items: center; justify-content: center; gap: 0.75rem; font-family: var(--font-mono, 'JetBrains Mono', ui-monospace, monospace); text-transform: uppercase; font-size: 12px; letter-spacing: 0.15em; color: ${SLATE}; font-weight: 600;">
        <span style="position: relative; display: inline-flex; align-items: center; justify-content: center; width: 12px; height: 12px;">
          <span style="position: absolute; inset: 0; background-color: ${TEAL}; opacity: 0.5; border-radius: 9999px; animation: tek-splash-ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></span>
          <span style="position: relative; display: inline-block; width: 8px; height: 8px; background-color: ${TEAL}; border-radius: 9999px;"></span>
        </span>
        Connecting to console
      </div>
    </div>
  `;

  document.body.appendChild(splash);
  return splash;
}

export function showNavSplash(): void {
  if (typeof document === "undefined") return;
  const splash = ensureSplashElement();
  // Disable transition first so the opacity change snaps instantly. If we
  // skip this, the browser interpolates 0 → 1 over the previously-set fade
  // duration, leaving the splash semi-transparent for ~75ms — the auth
  // shell unmounts during that window and the body bg shows through.
  splash.style.transition = "none";
  splash.style.opacity = "1";
  splash.style.pointerEvents = "auto";
}

export function hideNavSplash(): void {
  if (typeof document === "undefined") return;
  const splash = document.getElementById(SPLASH_ID);
  if (!splash) return;
  // Smooth fade-out on hide is fine — the destination has already painted
  // under the splash by this point, so semi-transparency reveals real
  // content, not the body bg.
  splash.style.transition = "opacity 150ms ease-out";
  splash.style.opacity = "0";
  splash.style.pointerEvents = "none";
}
