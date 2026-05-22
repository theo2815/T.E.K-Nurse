import { SpeedLines } from "@/components/SpeedLines";

export function CatalogHeader({
  eyebrow,
  title,
  overview,
}: {
  eyebrow: string;
  title: string;
  overview?: string;
}) {
  return (
    <header>
      <div className="flex items-center gap-3 mb-2">
        <SpeedLines className="w-12 h-5" />
        <p className="font-mono uppercase text-caps-sm text-teal font-semibold">
          {eyebrow}
        </p>
      </div>
      <h1 className="font-display italic font-extrabold text-display md:text-[48px] text-navy leading-tight">
        {title}
      </h1>
      {overview && (
        <p className="mt-3 font-mono uppercase text-caps-sm text-slate tracking-[0.08em]">
          {overview}
        </p>
      )}
      <hr className="mt-4 w-12 border-rule" />
    </header>
  );
}
