import { SpeedLines } from "@/components/SpeedLines";

/**
 * Shared paper-card shell that wraps every chart. Mono caps eyebrow at the top
 * + italic hero numeral summary on the right; chart fills the remainder.
 */
export function ChartFrame({
  eyebrow,
  summary,
  caption,
  children,
}: {
  eyebrow: string;
  summary?: React.ReactNode;
  caption?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="bg-paper border-[1.5px] border-rule rounded p-5 md:p-6">
      <header className="flex items-start justify-between gap-4 mb-4">
        <div className="flex items-center gap-3">
          <SpeedLines className="w-10 h-4" />
          <p className="font-mono uppercase text-caps-sm text-teal font-semibold tracking-[0.1em]">
            {eyebrow}
          </p>
        </div>
        {summary && <div className="text-right shrink-0">{summary}</div>}
      </header>
      <div className="h-[220px] md:h-[260px] w-full">{children}</div>
      {caption && (
        <p className="mt-3 font-mono uppercase text-caps-sm text-slate/70 tracking-[0.08em]">
          {caption}
        </p>
      )}
    </section>
  );
}
