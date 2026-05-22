type Variant = "default" | "alert" | "pending";

const VARIANT: Record<Variant, string> = {
  default:
    "bg-paper border border-rule hover:border-amber hover:-translate-y-px",
  alert:
    "bg-paper border border-rule border-l-4 border-l-brick",
  pending:
    "bg-paper border border-rule opacity-85",
};

export function Card({
  variant = "default",
  className = "",
  children,
}: {
  variant?: Variant;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`rounded p-4 md:p-6 transition-[transform,border-color] duration-150 ease-out ${VARIANT[variant]} ${className}`}
    >
      {children}
    </div>
  );
}
