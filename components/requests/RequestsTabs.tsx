"use client";

import { useEffect } from "react";
import { useRouter as useNextRouter } from "next/navigation";
import { useProgressRouter } from "@/lib/use-progress-router";

export type RequestTab = "pending" | "approved" | "active" | "past";

type TabConfig<T extends string = string> = {
  value: T;
  label: string;
  count?: number;
};

/**
 * Tab strip used by My Requests (student) and the Pending Queue (staff).
 * The tab whose value === `defaultTab` is the bare-path tab (no query string).
 * Other tabs append `?<paramName>=<value>` (paramName defaults to "tab").
 * Pass `extraParams` to preserve other filters when the strip changes — e.g.
 * a stage tab strip + a type filter strip stacked on the same page.
 *
 * Navigation is driven by `useProgressRouter().push` so the global top
 * progress bar (`<RouteProgress>`) fires on every tab click. Without this,
 * switching tabs is silent because Next's loading.tsx only fires on segment
 * navigations, not on query-string changes within the same segment.
 *
 * Tabs prefetch their destinations on mount so the actual click is instant
 * — the progress bar's debounce hides the flash for cached responses but
 * shows a real bar for cold ones.
 */
export function RequestsTabs<T extends string>({
  tabs,
  active,
  basePath,
  defaultTab,
  paramName = "tab",
  extraParams,
}: {
  tabs: TabConfig<T>[];
  active: T;
  basePath: string;
  defaultTab: T;
  paramName?: string;
  extraParams?: Record<string, string | undefined>;
}) {
  const router = useProgressRouter();
  const rawRouter = useNextRouter();

  const extraQs = extraParams
    ? Object.entries(extraParams)
        .filter(([, v]) => v != null && v !== "")
        .map(
          ([k, v]) =>
            `${encodeURIComponent(k)}=${encodeURIComponent(v as string)}`,
        )
        .join("&")
    : "";

  function hrefFor(value: T): string {
    const parts: string[] = [];
    if (value !== defaultTab) {
      parts.push(`${paramName}=${encodeURIComponent(value)}`);
    }
    if (extraQs) parts.push(extraQs);
    return parts.length === 0 ? basePath : `${basePath}?${parts.join("&")}`;
  }

  // Prefetch every tab destination so the click feels instant. Uses the raw
  // router because prefetch shouldn't trigger the progress bar.
  useEffect(() => {
    for (const t of tabs) {
      rawRouter.prefetch(hrefFor(t.value));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [basePath, paramName, extraQs]);

  return (
    <div role="tablist" className="flex gap-8 border-b border-rule">
      {tabs.map((t) => {
        const isActive = t.value === active;
        const href = hrefFor(t.value);
        function onClick() {
          if (isActive) return;
          router.push(href);
        }
        return (
          <a
            key={t.value}
            href={href}
            role="tab"
            aria-selected={isActive}
            onClick={(e) => {
              // Let modifier-click / middle-click fall through to browser
              // (open in new tab, etc.). Otherwise intercept and use the
              // progress-aware router so the top bar fires.
              if (
                e.metaKey ||
                e.ctrlKey ||
                e.shiftKey ||
                e.altKey ||
                e.button !== 0
              ) {
                return;
              }
              e.preventDefault();
              onClick();
            }}
            className={`relative py-3 inline-flex items-baseline gap-2 font-mono uppercase text-caps-md font-semibold tracking-[0.06em] transition-colors no-underline ${
              isActive
                ? "text-navy"
                : "text-slate/70 hover:text-slate cursor-pointer"
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
          </a>
        );
      })}
    </div>
  );
}
