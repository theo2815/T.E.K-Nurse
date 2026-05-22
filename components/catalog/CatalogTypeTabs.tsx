import Link from "next/link";

type Tab = {
  value: string;
  label: string;
  href: string;
};

export function CatalogTypeTabs({
  tabs,
  active,
}: {
  tabs: Tab[];
  active: string;
}) {
  return (
    <div role="tablist" className="flex gap-6 border-b border-rule">
      {tabs.map((t) => {
        const isActive = t.value === active;
        return (
          <Link
            key={t.value}
            href={t.href}
            role="tab"
            aria-selected={isActive}
            className={`relative py-3 font-mono uppercase text-caps-md font-semibold tracking-[0.06em] transition-colors ${
              isActive ? "text-navy" : "text-slate/70 hover:text-slate"
            }`}
          >
            {t.label}
            {isActive && (
              <span
                aria-hidden
                className="absolute left-0 right-0 -bottom-[1px] h-[2px] bg-teal"
              />
            )}
          </Link>
        );
      })}
    </div>
  );
}
