/**
 * Server-rendered initial splash. Paints from the very first HTML byte the
 * browser receives — no external CSS dependency, no React hydration required.
 *
 * Bridges the "HTML arrived but content not yet visible" window on first app
 * open (cold load, PWA cold launch, hard refresh). All styles inline + hex-
 * coded design tokens so it renders correctly even before globals.css / next
 * font CSS has loaded.
 *
 * Shares the `id="tek-nav-splash"` element with `lib/nav-splash.ts` — after
 * `<HideAppSplashOnMount />` hides this on hydration, subsequent in-app
 * navigations re-use the same DOM element via `showNavSplash()`. Single
 * source of truth for the splash visual, no flicker on re-show.
 *
 * Does NOT fix the network-wait window (browser default white during DNS/TLS
 * /SSR — only service-worker caching can close that). That's a separate
 * follow-up slice.
 */

const NAVY = "#1F3A6E";
const TEAL = "#38B6BC";
const SLATE = "#475569";
const MIST = "#F0F4F8";

export function AppSplash() {
  return (
    <>
      <style
        dangerouslySetInnerHTML={{
          __html: `@keyframes tek-splash-ping { 75%, 100% { transform: scale(1.8); opacity: 0; } }`,
        }}
      />
      <div
        id="tek-nav-splash"
        role="status"
        aria-live="polite"
        aria-label="Loading"
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 55,
          backgroundColor: MIST,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          opacity: 1,
          pointerEvents: "auto",
          fontFamily:
            'var(--font-body, -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif)',
        }}
      >
        <div
          style={{
            textAlign: "center",
            maxWidth: "36rem",
            padding: "0 1.5rem",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.75rem",
              marginBottom: "1.5rem",
            }}
          >
            <svg
              viewBox="0 0 56 24"
              style={{ width: "3rem", height: "1.25rem", color: TEAL }}
              aria-hidden="true"
            >
              <line
                x1="0"
                y1="5"
                x2="40"
                y2="5"
                stroke="currentColor"
                strokeWidth={2.5}
                strokeLinecap="round"
              />
              <line
                x1="10"
                y1="13"
                x2="54"
                y2="13"
                stroke="currentColor"
                strokeWidth={2.5}
                strokeLinecap="round"
              />
              <line
                x1="4"
                y1="21"
                x2="34"
                y2="21"
                stroke="currentColor"
                strokeWidth={2.5}
                strokeLinecap="round"
              />
            </svg>
            <span
              style={{
                fontFamily:
                  'var(--font-mono, "JetBrains Mono", ui-monospace, monospace)',
                textTransform: "uppercase",
                fontSize: "11px",
                letterSpacing: "0.1em",
                color: TEAL,
                fontWeight: 600,
              }}
            >
              Clinical Console
            </span>
          </div>
          <h1
            style={{
              fontFamily:
                "var(--font-display, Montserrat, Helvetica, Arial, sans-serif)",
              fontStyle: "italic",
              fontWeight: 800,
              fontSize: "clamp(48px, 9vw, 88px)",
              lineHeight: 0.95,
              color: NAVY,
              letterSpacing: "-0.02em",
              margin: 0,
            }}
          >
            T.E.K <span style={{ color: TEAL }}>NURSE</span>
          </h1>
          <div
            style={{
              marginTop: "2rem",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.75rem",
              fontFamily:
                'var(--font-mono, "JetBrains Mono", ui-monospace, monospace)',
              textTransform: "uppercase",
              fontSize: "12px",
              letterSpacing: "0.15em",
              color: SLATE,
              fontWeight: 600,
            }}
          >
            <span
              style={{
                position: "relative",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                width: "12px",
                height: "12px",
              }}
            >
              <span
                style={{
                  position: "absolute",
                  inset: 0,
                  backgroundColor: TEAL,
                  opacity: 0.5,
                  borderRadius: "9999px",
                  animation:
                    "tek-splash-ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite",
                }}
              />
              <span
                style={{
                  position: "relative",
                  display: "inline-block",
                  width: "8px",
                  height: "8px",
                  backgroundColor: TEAL,
                  borderRadius: "9999px",
                }}
              />
            </span>
            Connecting to console
          </div>
        </div>
      </div>
    </>
  );
}
