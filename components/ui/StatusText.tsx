export type Status =
  | "AVAILABLE"
  | "BORROWED"
  | "RESERVED"
  | "LOW STOCK"
  | "OUT"
  | "MAINTENANCE"
  | "OVERDUE"
  | "LOST"
  | "RETURNED"
  | "RETURNED LATE"
  | "EXPIRED"
  | "SKIPPED"
  | "CANCELLED"
  | "DECLINED"
  | "PENDING PICKUP"
  | "APPROVED";

const STATUS_STYLE: Record<Status, { text: string; bg: string }> = {
  AVAILABLE:          { text: "text-green",    bg: "bg-green" },
  BORROWED:           { text: "text-slate",    bg: "bg-slate" },
  RESERVED:           { text: "text-slate",    bg: "bg-slate" },
  "LOW STOCK":        { text: "text-red-deep", bg: "bg-red-deep" },
  OUT:                { text: "text-slate",    bg: "bg-slate" },
  MAINTENANCE:        { text: "text-slate",    bg: "bg-slate" },
  OVERDUE:            { text: "text-red-deep", bg: "bg-red-deep" },
  LOST:               { text: "text-red-deep", bg: "bg-red-deep" },
  RETURNED:           { text: "text-green",    bg: "bg-green" },
  "RETURNED LATE":    { text: "text-green",    bg: "bg-green" },
  EXPIRED:            { text: "text-slate",    bg: "bg-slate" },
  SKIPPED:            { text: "text-slate",    bg: "bg-slate" },
  CANCELLED:          { text: "text-slate",    bg: "bg-slate" },
  DECLINED:           { text: "text-red-deep", bg: "bg-red-deep" },
  "PENDING PICKUP":   { text: "text-slate",    bg: "bg-slate" },
  APPROVED:           { text: "text-green",    bg: "bg-green" },
};

export function StatusText({
  status,
  emphatic = false,
  className = "",
}: {
  status: Status;
  emphatic?: boolean;
  className?: string;
}) {
  const { text, bg } = STATUS_STYLE[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 font-mono uppercase text-caps-sm font-semibold ${text} ${className}`}
    >
      {emphatic && (
        <span
          aria-hidden
          className={`inline-block size-2 rounded-sm ${bg}`}
        />
      )}
      {status}
    </span>
  );
}
