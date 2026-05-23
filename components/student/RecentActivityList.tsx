import { Beaker, Package, Activity as ActivityIcon } from "lucide-react";
import type { StudentHistoryItem } from "@/lib/supabase/queries/students";
import { timeAgo } from "@/lib/time-ago";

type Tone = "default" | "active" | "alert";

function labelFor(item: StudentHistoryItem): { label: string; tone: Tone } {
  if (item.kind === "usage") return { label: "USED", tone: "active" };
  switch (item.status) {
    case "BORROWED":
      return { label: "BORROWED", tone: "active" };
    case "RETURNED":
      return { label: "RETURNED", tone: "default" };
    case "RETURNED_LATE":
      return { label: "RETURNED · LATE", tone: "default" };
    case "OVERDUE":
      return { label: "OVERDUE", tone: "alert" };
    case "LOST":
      return { label: "LOST", tone: "alert" };
  }
}

/**
 * Last few events for the current student, framed personally ("You borrowed
 * X", "You used Y") rather than the staff-side "who did what" framing.
 * Tops out at whatever the page passes in (typically 5). The full ledger
 * lives at /student/history.
 */
export function RecentActivityList({ items }: { items: StudentHistoryItem[] }) {
  if (items.length === 0) {
    return (
      <div className="border border-dashed border-rule rounded p-8 text-center">
        <ActivityIcon
          size={32}
          strokeWidth={1.5}
          className="mx-auto text-slate/40"
        />
        <p className="mt-3 font-display italic font-extrabold text-[18px] text-navy">
          No activity yet
        </p>
        <p className="mt-1 text-[14px] text-slate">
          Your first borrow or consumable usage will appear here.
        </p>
      </div>
    );
  }

  return (
    <ol className="flex flex-col">
      {items.map((item, i) => {
        const { label, tone } = labelFor(item);
        const TypeIcon = item.kind === "usage" ? Beaker : Package;
        const toneText =
          tone === "alert"
            ? "text-red-deep"
            : tone === "active"
              ? "text-teal"
              : "text-slate";

        return (
          <li
            key={`${item.kind}:${item.id}`}
            className={[
              "flex items-start gap-4 py-3.5",
              i === 0 ? "" : "border-t border-rule/60",
            ].join(" ")}
          >
            <div className="shrink-0 mt-0.5">
              <span className="font-mono uppercase font-bold tracking-[0.1em] text-caps-sm flex items-center gap-1.5">
                <TypeIcon size={14} strokeWidth={1.75} className={toneText} />
                <span className={toneText}>{label}</span>
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline gap-3 flex-wrap">
                <span className="font-mono text-[13px] tracking-[0.04em] text-navy font-semibold">
                  {item.sku.qr_code}
                </span>
                <span className="text-[15px] text-navy truncate">
                  {item.sku.name}
                </span>
              </div>
              <p className="mt-0.5 font-mono uppercase text-caps-sm text-slate tracking-[0.06em]">
                {item.kind === "usage"
                  ? `${item.quantity} ${item.sku.unit}`
                  : `Qty ${item.quantity}`}
              </p>
            </div>
            <p className="shrink-0 font-mono uppercase text-caps-sm text-slate/70 tracking-[0.06em] mt-0.5">
              {timeAgo(item.when)}
            </p>
          </li>
        );
      })}
    </ol>
  );
}
