"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useProgressRouter } from "@/lib/use-progress-router";
import { Search, X, User as UserIcon } from "lucide-react";
import { searchStudentsAction } from "@/app/staff/actions";
import type { StudentSearchRow } from "@/lib/supabase/queries/staff-requests";
import type { StudentLabel } from "@/lib/supabase/queries/reports";
import { buildReportHref, type ReportSearchParams } from "./report-url";

type Props = {
  value: StudentLabel | null;
  basePath: string;
  searchParams: ReportSearchParams;
};

export function StudentFilter({ value, basePath, searchParams }: Props) {
  const id = useId();
  const router = useProgressRouter();
  const [query, setQuery] = useState("");
  const [fetchedResults, setFetchedResults] = useState<StudentSearchRow[]>([]);
  const [open, setOpen] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);

  const inputRef = useRef<HTMLInputElement>(null);
  const popRef = useRef<HTMLDivElement>(null);
  const lastQuery = useRef<string>("");

  const trimmedQ = query.trim();
  const tooShort = trimmedQ.length < 2;
  const results = tooShort ? [] : fetchedResults;
  const loading = tooShort ? false : isFetching;

  useEffect(() => {
    if (tooShort) return;
    lastQuery.current = trimmedQ;
    let cancelled = false;
    const timer = setTimeout(async () => {
      if (cancelled) return;
      setIsFetching(true);
      const res = await searchStudentsAction(trimmedQ);
      if (cancelled || lastQuery.current !== trimmedQ) return;
      if (res.ok) {
        setFetchedResults(res.data);
        setActiveIdx(0);
      } else {
        setFetchedResults([]);
      }
      setIsFetching(false);
    }, 220);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [trimmedQ, tooShort]);

  useEffect(() => {
    if (!open) return;
    function onDown(e: PointerEvent) {
      const t = e.target as Node;
      if (inputRef.current?.contains(t) || popRef.current?.contains(t)) return;
      setOpen(false);
    }
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [open]);

  function pick(s: StudentSearchRow) {
    router.push(
      buildReportHref(basePath, searchParams, {
        student: s.id,
        page: undefined,
      }),
      { scroll: false },
    );
    setOpen(false);
    setQuery("");
  }

  function clear() {
    router.push(
      buildReportHref(basePath, searchParams, {
        student: undefined,
        page: undefined,
      }),
      { scroll: false },
    );
  }

  function onKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Escape") {
      setOpen(false);
      return;
    }
    if (!open) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx((i) => Math.min(results.length - 1, i + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((i) => Math.max(0, i - 1));
    } else if (e.key === "Enter") {
      const r = results[activeIdx];
      if (r) {
        e.preventDefault();
        pick(r);
      }
    }
  }

  if (value) {
    return (
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor={id}
          className="font-mono uppercase text-caps-sm text-slate font-semibold tracking-[0.1em]"
        >
          Student
        </label>
        <div
          id={id}
          className="inline-flex items-center gap-2 rounded border-[1.5px] border-teal bg-teal/5 py-2 pl-3 pr-2 w-full md:w-auto"
        >
          <UserIcon
            size={14}
            strokeWidth={1.75}
            aria-hidden
            className="text-teal-deep shrink-0"
          />
          <span className="text-[14px] text-navy font-semibold truncate max-w-[180px]">
            {value.full_name}
          </span>
          {value.year_section && (
            <span className="font-mono uppercase text-caps-sm text-slate tracking-[0.06em] hidden md:inline">
              {value.year_section}
            </span>
          )}
          <button
            type="button"
            onClick={clear}
            aria-label="Clear student filter"
            className="shrink-0 p-1 text-slate hover:text-red-deep transition-colors"
          >
            <X size={14} strokeWidth={2} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1.5">
      <label
        htmlFor={id}
        className="font-mono uppercase text-caps-sm text-slate font-semibold tracking-[0.1em]"
      >
        Student
      </label>
      <div className="relative">
        <input
          ref={inputRef}
          id={id}
          type="text"
          autoComplete="off"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKey}
          placeholder="Name or email…"
          className="w-full md:w-72 rounded border-[1.5px] bg-white py-2.5 pl-9 pr-3 font-mono text-[13px] tracking-[0.03em] text-navy placeholder:text-slate/60 border-rule focus:border-teal hover:border-slate/60 focus:outline-none transition-colors"
        />
        <Search
          size={14}
          strokeWidth={1.75}
          aria-hidden
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-teal"
        />
        {open && trimmedQ.length >= 2 && (
          <div
            ref={popRef}
            className="tek-pop absolute z-40 mt-2 inset-x-0 md:w-72 rounded border-[1.5px] border-rule bg-paper shadow-lg max-h-[260px] overflow-y-auto"
          >
            {loading && (
              <div className="px-3 py-2 font-mono uppercase text-caps-sm text-slate tracking-[0.08em]">
                Searching…
              </div>
            )}
            {!loading && results.length === 0 && (
              <div className="px-3 py-2 font-mono uppercase text-caps-sm text-slate/70 tracking-[0.08em]">
                No matches
              </div>
            )}
            {!loading && results.length > 0 && (
              <ul role="listbox" aria-label="Student matches">
                {results.map((r, i) => {
                  const active = i === activeIdx;
                  return (
                    <li key={r.id} role="option" aria-selected={active}>
                      <button
                        type="button"
                        onClick={() => pick(r)}
                        onMouseEnter={() => setActiveIdx(i)}
                        className={[
                          "w-full text-left px-3 py-2 flex items-baseline gap-2 border-t border-rule/50 first:border-0",
                          active ? "bg-teal/10" : "hover:bg-teal/5",
                        ].join(" ")}
                      >
                        <span className="text-[14px] text-navy font-semibold truncate">
                          {r.full_name}
                        </span>
                        <span className="font-mono text-[11px] text-slate/80 tracking-[0.04em] truncate">
                          {r.email}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
