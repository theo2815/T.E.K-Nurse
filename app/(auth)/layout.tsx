import { SpeedLines } from "@/components/SpeedLines";

/**
 * Auth layout — two compositions, one per breakpoint.
 *
 * MOBILE (<md): medical-monitor console frame. The chrome wordmark is
 *   the only brand mark — there is no floating logo above the frame.
 *
 * DESKTOP (md+): split-screen. Left = navy-deep brand panel with the
 *   italic Montserrat wordmark at hero scale + feature bullets + faint
 *   cyan scan-lines. Right = mist panel with the form centered, no
 *   console chrome (the canvas is the chrome).
 *
 * Children render twice (once per composition), each in a tree hidden
 * at the other breakpoint via Tailwind responsive classes. Acceptable
 * for auth pages where users don't typically resize across breakpoints
 * while typing credentials.
 */
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {/* ──────────────────────────────────── MOBILE: console frame */}
      <div className="md:hidden min-h-screen flex items-center justify-center px-4 py-10">
        <div
          className="w-full max-w-lg bg-paper border-[1.5px] border-navy-deep rounded-xl overflow-hidden"
          style={{
            boxShadow:
              "0 16px 48px -16px rgba(31, 58, 110, 0.18), 0 0 1px rgba(31, 58, 110, 0.10)",
          }}
        >
          {/* Top chrome */}
          <div
            aria-hidden
            className="bg-navy-deep flex items-center justify-between px-5 py-3.5 border-b-[1.5px] border-navy"
          >
            <div className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-fab bg-teal animate-pulse" />
              <span className="size-2.5 rounded-fab bg-cyan/40" />
              <span className="size-2.5 rounded-fab bg-cyan/40" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="font-display italic font-extrabold text-[16px] tracking-[0.03em] text-mist">
                T.E.K <span className="text-teal">NURSE</span>
              </span>
              <span className="hidden sm:inline font-mono text-[11px] text-cyan/70 tracking-[0.08em]">
                v0.2
              </span>
            </div>
          </div>

          {/* Screen area */}
          <main
            className="p-8 relative"
            style={{
              backgroundColor: "var(--color-paper)",
              backgroundImage: `repeating-linear-gradient(
                to bottom,
                rgba(135, 209, 213, 0.11) 0px,
                rgba(135, 209, 213, 0.11) 1px,
                transparent 1px,
                transparent 4px
              )`,
              boxShadow: "inset 0 1px 0 rgba(31, 58, 110, 0.05)",
            }}
          >
            {children}
          </main>

          {/* Bottom chrome */}
          <div
            aria-hidden
            className="bg-navy-deep flex items-center justify-between px-5 py-3 border-t-[1.5px] border-navy"
          >
            <div className="flex items-center gap-2 font-mono uppercase text-[11px] text-mist font-bold tracking-[0.12em]">
              <span className="size-2 rounded-fab bg-teal animate-pulse" />
              STATUS · READY
            </div>
            <div className="font-mono uppercase text-[11px] text-cyan/70 tracking-[0.1em] font-semibold">
              CIT.EDU
            </div>
          </div>
        </div>
      </div>

      {/* ──────────────────────────────────── DESKTOP: split-screen */}
      <div className="hidden md:grid min-h-screen grid-cols-2">
        {/* ── Brand panel (left) */}
        <aside className="relative bg-navy-deep text-mist flex flex-col justify-between px-12 py-12 lg:px-16 lg:py-16 overflow-hidden">
          {/* Scan-lines on dark — bumped opacity so they show */}
          <div
            aria-hidden
            className="absolute inset-0 pointer-events-none"
            style={{
              backgroundImage: `repeating-linear-gradient(
                to bottom,
                rgba(135, 209, 213, 0.10) 0px,
                rgba(135, 209, 213, 0.10) 1px,
                transparent 1px,
                transparent 5px
              )`,
            }}
          />

          {/* Top: status LED row — echoes the mobile console chrome */}
          <div
            aria-hidden
            className="relative z-10 flex items-center gap-1.5"
          >
            <span className="size-2.5 rounded-fab bg-teal animate-pulse" />
            <span className="size-2.5 rounded-fab bg-cyan/40" />
            <span className="size-2.5 rounded-fab bg-cyan/40" />
            <span className="ml-3 font-mono uppercase text-[11px] tracking-[0.12em] text-cyan/70 font-semibold">
              Clinical Console · live
            </span>
          </div>

          {/* Middle: hero wordmark + brand promise + features */}
          <div className="relative z-10 max-w-lg">
            <div className="flex items-center gap-3 mb-4">
              <SpeedLines className="w-14 h-6" />
              <p className="font-mono uppercase text-caps-sm text-teal font-semibold">
                T.E.K NURSE
              </p>
            </div>

            <h2 className="font-display italic font-extrabold text-[72px] lg:text-[96px] leading-[0.95] text-mist tracking-[-0.02em]">
              T.E.K <span className="text-teal">NURSE</span>
            </h2>

            <p className="mt-6 text-cyan/80 text-[16px] lg:text-[18px] leading-relaxed max-w-md">
              Equipment in-out inventory console for the school nursing lab.
              QR-driven borrows, FIFO consumables, audit-log integrity.
            </p>

            <ul className="mt-10 space-y-4 max-w-md">
              {[
                "Scan a QR, log a borrow in under five seconds",
                "FIFO consumable lots, tracked to expiration",
                "Live overdue tracking with automatic reminders",
                "Audit-log every state change, server-side",
              ].map((item) => (
                <li
                  key={item}
                  className="flex items-start gap-3 text-mist/90 text-[15px] lg:text-[16px]"
                >
                  <span className="size-2 rounded-fab bg-teal mt-2 shrink-0" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Bottom: version / phase stamp */}
          <div
            aria-hidden
            className="relative z-10 font-mono uppercase text-[12px] text-cyan/60 tracking-[0.15em] font-semibold"
          >
            v0.2 · phase 2 · auth + shell · cit.edu
          </div>
        </aside>

        {/* ── Form panel (right) */}
        <main className="bg-mist flex items-center justify-center px-12 py-16 lg:px-24">
          <div className="w-full max-w-xl">{children}</div>
        </main>
      </div>
    </>
  );
}
