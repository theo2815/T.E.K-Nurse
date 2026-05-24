import { SpeedLines } from "@/components/SpeedLines";

/**
 * Branded splash shown by the layout-level loading.tsx files
 * (app/staff/loading.tsx, app/student/loading.tsx) while the
 * staff/student layout's async data fetches resolve.
 *
 * Bridges the cold-load gap that used to flash as a white screen
 * between login submit and the dashboard rendering. Visual language
 * deliberately mirrors the auth shell's medical-monitor chrome
 * (SpeedLines + "Clinical Console" mono caps + pulsing teal LED +
 * tek-scan keyframe sweep) so the post-auth transition reads as one
 * continuous console boot rather than two unrelated screens.
 */
export function ConsoleConnectingSplash() {
  return (
    <div className="min-h-screen bg-mist flex items-center justify-center px-6 py-12 relative overflow-hidden">
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
      >
        <div
          className="absolute left-0 right-0 h-px bg-teal/40"
          style={{ animation: "tek-scan 2.4s ease-in-out infinite" }}
        />
      </div>

      <div className="relative z-10 flex flex-col items-center gap-6 md:gap-8 text-center">
        <div className="flex items-center gap-3">
          <SpeedLines className="w-12 h-5" />
          <p className="font-mono uppercase text-caps-sm text-teal font-semibold tracking-[0.1em]">
            Clinical Console
          </p>
        </div>

        <h1 className="font-display italic font-extrabold text-[48px] md:text-[88px] leading-[0.95] text-navy tracking-[-0.02em]">
          T.E.K <span className="text-teal">NURSE</span>
        </h1>

        <div className="flex items-center gap-3 font-mono uppercase text-[12px] tracking-[0.15em] text-slate font-semibold">
          <span className="relative flex items-center justify-center">
            <span className="absolute inline-flex h-3 w-3 rounded-fab bg-teal/50 animate-ping" />
            <span className="relative inline-flex h-2 w-2 rounded-fab bg-teal" />
          </span>
          Connecting to console
        </div>
      </div>
    </div>
  );
}
