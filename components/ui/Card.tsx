type Variant = "default" | "alert" | "pending";

const VARIANT: Record<Variant, string> = {
  default:
    "bg-paper border-[1.5px] border-rule hover:border-teal hover:-translate-y-px",
  alert:
    "bg-paper border-[1.5px] border-rule border-l-4 border-l-red",
  pending:
    "bg-paper border-[1.5px] border-rule opacity-85",
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
      className={`rounded p-5 md:p-6 transition-[transform,border-color] duration-150 ease-out ${VARIANT[variant]} ${className}`}
    >
      {children}
    </div>
  );
}
