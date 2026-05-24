/**
 * Sectioned eyebrow with a trailing hairline rule — used to divide
 * /staff/settings and /student/settings into Profile / Security / Sessions
 * blocks. The trailing rule mirrors the eyebrow + rule motif in
 * `ProfileActivityBand` so the settings page reads as the same console.
 */
export function SectionEyebrow({
  id,
  label,
  hint,
}: {
  id: string;
  label: string;
  hint?: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline gap-3">
        <h2
          id={id}
          className="font-mono uppercase text-caps-md text-navy font-bold tracking-[0.12em]"
        >
          {label}
        </h2>
        <span aria-hidden className="flex-1 h-px bg-rule" />
      </div>
      {hint && <p className="text-[13px] text-slate">{hint}</p>}
    </div>
  );
}
