import { FileText } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { SpeedLines } from "@/components/SpeedLines";

export function PlaceholderPage({
  eyebrow,
  title,
  phase,
  description,
}: {
  eyebrow: string;
  title: string;
  phase: string;
  description: string;
}) {
  return (
    <div className="mx-auto max-w-5xl px-6 md:px-12 py-12 md:py-16">
      <div className="flex items-center gap-3 mb-2">
        <SpeedLines className="w-12 h-5" />
        <p className="font-mono uppercase text-caps-sm text-teal font-semibold">
          {eyebrow}
        </p>
      </div>
      <h1 className="font-display italic font-extrabold text-display md:text-[48px] text-navy">
        {title}
      </h1>
      <hr className="mt-3 mb-10 w-12" />

      <Card>
        <div className="flex flex-col items-center text-center py-10">
          <FileText size={48} strokeWidth={1.5} className="text-slate/50" />
          <hr className="w-12 mt-4" />
          <p className="font-mono uppercase text-caps-sm text-slate mt-6 font-semibold tracking-[0.08em]">
            {phase}
          </p>
          <p className="font-display italic font-bold text-[24px] text-navy mt-3 max-w-md">
            {description}
          </p>
        </div>
      </Card>
    </div>
  );
}
