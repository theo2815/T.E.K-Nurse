import Link from "next/link";
import { ChevronRight, Calendar } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { MonoId } from "@/components/ui/MonoId";
import { StatusText, type Status } from "@/components/ui/StatusText";
import { PhotoFrame } from "@/components/catalog/PhotoFrame";

export type RequestCardProps = {
  href: string;
  type: "equipment" | "consumable";
  qr: string;
  status: Status;
  name: string;
  photoUrl?: string | null;
  /** First detail line (e.g. "Pickup today · Qty 1"). */
  primaryMeta: string;
  /** Second detail line (e.g. "Expires tomorrow 11:59 PM" or "Due Fri · 3 days left"). */
  secondaryMeta?: string;
  /** Render secondaryMeta in red-deep (used for overdue, expiring-soon). */
  secondaryAlert?: boolean;
};

export function RequestCard({
  href,
  qr,
  status,
  name,
  photoUrl,
  primaryMeta,
  secondaryMeta,
  secondaryAlert,
}: RequestCardProps) {
  const isAlert = status === "OVERDUE" || status === "LOST";

  return (
    <Link
      href={href}
      className="group block focus:outline-none focus-visible:[&>*]:border-teal"
    >
      <Card variant={isAlert ? "alert" : "default"} className="cursor-pointer">
        <div className="flex items-start gap-4">
          <PhotoFrame
            src={photoUrl}
            alt={name}
            size="thumb"
            className="shrink-0"
          />

          <div className="flex-1 min-w-0">
            <div className="flex items-baseline justify-between gap-3">
              <MonoId id={qr} />
              <StatusText status={status} emphatic={isAlert} />
            </div>

            <h3 className="mt-2 font-display italic font-extrabold text-[20px] leading-tight text-navy line-clamp-1">
              {name}
            </h3>

            <p className="mt-2 inline-flex items-center gap-2 text-[14px] text-slate">
              <Calendar size={14} strokeWidth={1.75} className="shrink-0" />
              {primaryMeta}
            </p>

            {secondaryMeta && (
              <p
                className={`mt-1 text-[14px] ${
                  secondaryAlert ? "text-red-deep font-semibold" : "text-slate"
                }`}
              >
                {secondaryMeta}
              </p>
            )}
          </div>

          <ChevronRight
            size={22}
            strokeWidth={1.75}
            className="text-slate/70 transition-colors group-hover:text-teal mt-1 shrink-0"
            aria-hidden
          />
        </div>
      </Card>
    </Link>
  );
}
