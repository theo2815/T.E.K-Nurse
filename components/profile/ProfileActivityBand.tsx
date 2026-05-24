export type ProfileStat = {
  label: string;
  value: number | string;
  caption?: string;
  tone?: "default" | "alert" | "active" | "success";
};

const TONE_COLOR: Record<NonNullable<ProfileStat["tone"]>, string> = {
  default: "text-navy",
  alert: "text-red-deep",
  active: "text-teal",
  success: "text-green",
};

const TONE_RULE: Record<NonNullable<ProfileStat["tone"]>, string> = {
  default: "border-rule",
  alert: "border-red-deep",
  active: "border-teal",
  success: "border-green",
};

/**
 * "Vitals" stats row — italic display numerals over hairline rules,
 * mono uppercase labels beneath. Reads as an ECG-style readout: each stat
 * is its own readout cell. Eyebrow text uses the page-section pattern
 * (mono caps, slate, full-width hairline trailing off to the right).
 */
export function ProfileActivityBand({
  title = "Vitals",
  stats,
  footnote,
}: {
  title?: string;
  stats: ProfileStat[];
  footnote?: string;
}) {
  const cols =
    stats.length === 4
      ? "grid-cols-2 md:grid-cols-4"
      : stats.length === 2
        ? "grid-cols-2"
        : "grid-cols-3";

  return (
    <section aria-label={title} className="flex flex-col gap-5">
      <div className="flex items-center gap-3">
        <p className="font-mono uppercase text-caps-md text-slate font-semibold tracking-[0.12em]">
          {title}
        </p>
        <span className="flex-1 border-t border-rule/80" aria-hidden />
      </div>

      <div className={`grid gap-x-6 gap-y-6 ${cols}`}>
        {stats.map((s) => {
          const tone = s.tone ?? "default";
          return (
            <div key={s.label} className="flex flex-col gap-2">
              <p
                className={`font-display italic font-extrabold leading-none tracking-[-0.02em] text-[40px] md:text-[52px] ${TONE_COLOR[tone]}`}
              >
                {s.value}
              </p>
              <div
                aria-hidden
                className={`border-t-[2px] ${TONE_RULE[tone]} w-12`}
              />
              <p className="font-mono uppercase text-caps-sm text-slate font-semibold tracking-[0.12em]">
                {s.label}
              </p>
              {s.caption && (
                <p className="font-mono uppercase text-caps-sm text-slate/70 tracking-[0.08em]">
                  {s.caption}
                </p>
              )}
            </div>
          );
        })}
      </div>

      {footnote && (
        <p className="font-mono uppercase text-caps-sm text-slate/70 tracking-[0.08em]">
          {footnote}
        </p>
      )}
    </section>
  );
}
