"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useProgressRouter } from "@/lib/use-progress-router";
import { Search, X } from "lucide-react";

/**
 * URL-driven search input for /staff/admin/users. The `?q=` param is the
 * source of truth; the input is local state, debounced 280ms before pushing.
 * Preserves the `?role=` filter when navigating.
 */
export function AdminUsersSearchBar({
  initialQuery,
  basePath,
  role,
}: {
  initialQuery: string;
  basePath: string;
  role: string;
}) {
  const router = useProgressRouter();
  const id = useId();
  const [value, setValue] = useState(initialQuery);
  const [prevInitial, setPrevInitial] = useState(initialQuery);
  const inputRef = useRef<HTMLInputElement>(null);

  if (initialQuery !== prevInitial) {
    setPrevInitial(initialQuery);
    setValue(initialQuery);
  }

  useEffect(() => {
    if (value === initialQuery) return;
    const timer = setTimeout(() => {
      const params = new URLSearchParams();
      if (role && role !== "all") params.set("role", role);
      const trimmed = value.trim();
      if (trimmed) params.set("q", value);
      const qs = params.toString();
      router.push(qs ? `${basePath}?${qs}` : basePath, { scroll: false });
    }, 280);
    return () => clearTimeout(timer);
  }, [value, initialQuery, role, basePath, router]);

  function clear() {
    setValue("");
    const params = new URLSearchParams();
    if (role && role !== "all") params.set("role", role);
    const qs = params.toString();
    router.push(qs ? `${basePath}?${qs}` : basePath, { scroll: false });
    inputRef.current?.focus();
  }

  return (
    <div className="relative w-full md:w-96">
      <label htmlFor={id} className="sr-only">
        Search users
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
