/**
 * Italic-numeral hero stat block. Used inline at the top of report tabs and
 * inside ChartFrame's `summary` slot.
 */

type Tone = "default" | "alert" | "active" | "success";

const TONE_NUMERAL: Record<Tone, string> = {
  default: "text-navy",
  alert: "text-red-deep",
  active: "text-teal",
  success: "text-green",
};

const TONE_CAPTION: Record<Tone, string> = {
  default: "text-slate",
  alert: "text-red-deep",
  active: "text-teal-deep",
  success: "text-green",
};

export function HeroStat({
  label,
  value,
  caption,
  tone = "default",
  size = "md",
  align = "left",
}: {
  label: string;
  value: number | string;
  caption?: string;
  tone?: Tone;
  size?: "sm" | "md" | "lg";
  align?: "left" | "right";
}) {
  const sizeClass =
    size === "lg"
      ? "text-[56px] md:text-[72px]"
      : size === "sm"
        ? "text-[36px] md:text-[44px]"
        : "text-[44px] md:text-[56px]";

  return (
    <div className={align === "right" ? "text-right" : "text-left"}>
      <p className="font-mono uppercase text-caps-sm text-slate font-semibold tracking-[0.1em]">
        {label}
      </p>
      <p
        className={`mt-1 font-display italic font-extrabold leading-none tracking-[-0.02em] ${sizeClass} ${TONE_NUMERAL[tone]}`}
      >
        {value}
      </p>
      {caption && (
        <p
          className={`mt-1 font-mono uppercase text-caps-sm tracking-[0.08em] ${TONE_CAPTION[tone]}`}
        >
          {caption}
        </p>
      )}
    </div>
  );
}
