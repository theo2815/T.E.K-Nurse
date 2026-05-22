import Link from "next/link";

export type RequestTab = "pending" | "active" | "past";

type TabConfig<T extends string = string> = {
  value: T;
  label: string;
  count?: number;
};

/**
 * Tab strip used by My Requests (student) and the Pending Queue (staff).
 * The tab whose value === `defaultTab` is the bare-path tab (no query string).
 * Other tabs append `?<paramName>=<value>` (paramName defaults to "tab").
 */
export function RequestsTabs<T extends string>({
  tabs,
  active,
  basePath,
  defaultTab,
  paramName = "tab",
}: {
  tabs: TabConfig<T>[];
  active: T;
  basePath: string;
  defaultTab: T;
  paramName?: string;
}) {
  return (
    <div role="tablist" className="flex gap-8 border-b border-rule">
      {tabs.map((t) => {
        const isActive = t.value === active;
        const href =
          t.value === defaultTab
            ? basePath
            : `${basePath}?${paramName}=${t.value}`;
        return (
          <Link
            key={t.value}
            href={href}
            role="tab"
            aria-selected={isActive}
            className={`relative py-3 inline-flex items-baseline gap-2 font-mono uppercase text-caps-md font-semibold tracking-[0.06em] transition-colors ${
              isActive ? "text-navy" : "text-slate/70 hover:text-slate"
            }`}
          >
            {t.label}
            {t.count !== undefined && (
              <span
                className={`font-display italic font-extrabold text-[18px] leading-none ${
                  isActive ? "text-teal" : "text-slate/70"
                }`}
              >
                {t.count}
              </span>
            )}
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
