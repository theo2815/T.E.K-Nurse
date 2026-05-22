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
  | "EXPIRED"
  | "SKIPPED"
  | "CANCELLED";

const STATUS_STYLE: Record<Status, { text: string; bg: string }> = {
  AVAILABLE:    { text: "text-olive",      bg: "bg-olive" },
  BORROWED:     { text: "text-slate",      bg: "bg-slate" },
  RESERVED:     { text: "text-slate",      bg: "bg-slate" },
  "LOW STOCK":  { text: "text-brick-bold", bg: "bg-brick-bold" },
  OUT:          { text: "text-slate",      bg: "bg-slate" },
  MAINTENANCE:  { text: "text-slate",      bg: "bg-slate" },
  OVERDUE:      { text: "text-brick-bold", bg: "bg-brick-bold" },
  LOST:         { text: "text-brick-bold", bg: "bg-brick-bold" },
  RETURNED:     { text: "text-olive",      bg: "bg-olive" },
  EXPIRED:      { text: "text-slate",      bg: "bg-slate" },
  SKIPPED:      { text: "text-slate",      bg: "bg-slate" },
  CANCELLED:    { text: "text-slate",      bg: "bg-slate" },
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
          className={`inline-block size-2 ${bg}`}
        />
      )}
      {status}
    </span>
  );
}
