type Bucket = {
  label: string;
  value: number;
  tone?: "default" | "alert" | "muted";
};

export function CountBucketRow({
  buckets,
  className = "",
}: {
  buckets: Bucket[];
  className?: string;
}) {
  return (
    <div
      className={`grid grid-cols-${buckets.length} divide-x divide-rule border-y border-rule ${className}`}
      style={{ gridTemplateColumns: `repeat(${buckets.length}, minmax(0, 1fr))` }}
    >
      {buckets.map((b) => {
        const tone =
          b.tone === "alert"
            ? "text-red-deep"
            : b.tone === "muted"
            ? "text-slate"
            : "text-navy";
        return (
          <div
            key={b.label}
            className="flex flex-col items-center justify-center py-5 px-2 text-center"
          >
            <span
              className={`font-display italic font-extrabold text-[28px] md:text-[32px] leading-none ${tone}`}
            >
              {b.value}
            </span>
            <span className="mt-2 font-mono uppercase text-caps-sm font-semibold tracking-[0.1em] text-slate">
              {b.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}
