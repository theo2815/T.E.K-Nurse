import type { ReactNode } from "react";
import { Inbox } from "lucide-react";
import { Card } from "@/components/ui/Card";

export function EmptyState({
  title = "Nothing here yet.",
  hint,
  cta,
}: {
  title?: string;
  hint?: string;
  cta?: ReactNode;
}) {
  return (
    <Card>
      <div className="flex flex-col items-center text-center py-10">
        <Inbox size={48} strokeWidth={1.5} className="text-slate/50" />
        <hr className="w-12 mt-4 border-rule" />
        <p className="font-display italic font-extrabold text-[22px] text-navy mt-6">
          {title}
        </p>
        {hint && (
          <p className="mt-2 text-[15px] text-slate max-w-sm">{hint}</p>
        )}
        {cta && <div className="mt-5">{cta}</div>}
      </div>
    </Card>
  );
}
