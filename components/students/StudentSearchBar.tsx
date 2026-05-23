"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useProgressRouter } from "@/lib/use-progress-router";
import { Search, X } from "lucide-react";
import {
  buildReportHref,
  type ReportSearchParams,
} from "@/components/reports/report-url";

/**
 * URL-driven typeahead for /staff/students. The URL `?q=` param is the
 * source of truth; the input is local state, debounced 280ms before pushing.
 * Clears reset `?page=` too so search results start at page 1.
 */
export function StudentSearchBar({
  initialQuery,
  basePath,
  searchParams,
}: {
  initialQuery: string;
  basePath: string;
  searchParams: ReportSearchParams;
}) {
  const router = useProgressRouter();
  const id = useId();
  const [value, setValue] = useState(initialQuery);
  const [prevInitial, setPrevInitial] = useState(initialQuery);
  const inputRef = useRef<HTMLInputElement>(null);

  // Render-phase sync: when the URL-driven `initialQuery` changes (e.g.
  // browser back/forward), pull it into local state without an effect.
  // See React docs: "Adjusting state when a prop changes."
  if (initialQuery !== prevInitial) {
    setPrevInitial(initialQuery);
    setValue(initialQuery);
  }

  // Debounced push. Skips when value matches the URL — avoids re-pushing
  // after browser back/forward syncs us into the new initialQuery.
  useEffect(() => {
    if (value === initialQuery) return;
    const timer = setTimeout(() => {
      router.push(
        buildReportHref(basePath, searchParams, {
          q: value.trim() === "" ? undefined : value,
          page: undefined,
        }),
        { scroll: false },
      );
    }, 280);
    return () => clearTimeout(timer);
  }, [value, initialQuery, router, basePath, searchParams]);

  function clear() {
    setValue("");
    router.push(
      buildReportHref(basePath, searchParams, {
        q: undefined,
        page: undefined,
      }),
      { scroll: false },
    );
    inputRef.current?.focus();
  }

  return (
    <div className="relative w-full md:w-96">
      <label htmlFor={id} className="sr-only">
        Search students
      </label>
      <input
        ref={inputRef}
        id={id}
        type="text"
        autoComplete="off"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Search by name or email…"
        className="w-full rounded border-[1.5px] bg-white py-3 pl-11 pr-10 font-mono text-[14px] tracking-[0.03em] text-navy placeholder:text-slate/60 border-rule focus:border-teal hover:border-slate/60 focus:outline-none transition-colors"
      />
      <Search
        size={16}
        strokeWidth={1.75}
        aria-hidden
        className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-teal"
      />
      {value && (
        <button
          type="button"
          onClick={clear}
          aria-label="Clear search"
          className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-slate hover:text-red-deep transition-colors"
        >
          <X size={16} strokeWidth={2} />
        </button>
      )}
    </div>
  );
}
