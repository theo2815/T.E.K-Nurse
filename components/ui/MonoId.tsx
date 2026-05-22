type Size = "sm" | "md";

export function MonoId({
  id,
  size = "md",
  className = "",
}: {
  id: string;
  size?: Size;
  className?: string;
}) {
  const sizing = size === "sm" ? "text-caps-sm" : "text-caps-md";
  return (
    <span
      className={`font-mono uppercase ${sizing} text-navy font-semibold ${className}`}
    >
      {id}
    </span>
  );
}
