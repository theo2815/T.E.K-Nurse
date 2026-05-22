"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Search, X, User as UserIcon } from "lucide-react";
import { searchStudentsAction } from "@/app/staff/actions";
import type { StudentSearchRow } from "@/lib/supabase/queries/staff-requests";

type Props = {
  value: StudentSearchRow | null;
  onChange: (s: StudentSearchRow | null) => void;
  label?: string;
  required?: boolean;
  error?: string;
  /** When true, the picker is locked to the current value (e.g. approve mode). */
  locked?: boolean;
};

export function StudentPicker({
  value,
  onChange,
  label = "Student",
  required,
  error,
  locked,
}: Props) {
  const id = useId();
  const errorId = error ? `${id}-error` : undefined;

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<StudentSearchRow[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);

  const inputRef = useRef<HTMLInputElement>(null);
  const popRef = useRef<HTMLDivElement>(null);
  const lastQuery = useRef<string>("");

  // Debounce + fetch
  useEffect(() => {
    if (locked) return;
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }
    lastQuery.current = q;
    setLoading(true);
    const timer = setTimeout(async () => {
      const res = await searchStudentsAction(q);
      if (lastQuery.current !== q) return;
      if (res.ok) {
        setResults(res.data);
        setActiveIdx(0);
      } else {
        setResults([]);
      }
      setLoading(false);
    }, 220);
    return () => clearTimeout(timer);
  }, [query, locked]);

  // Outside click → close
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
    onChange(s);
    setQuery("");
    setResults([]);
    setOpen(false);
  }

  function clear() {
    onChange(null);
    requestAnimationFrame(() => inputRef.current?.focus());
  }

  function onKey(e: React.KeyboardEvent<HTMLInputElement>) {
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
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  // Selected chip view
  if (value) {
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label
            htmlFor={id}
            className="text-[15px] text-slate font-bold uppercase tracking-[0.08em]"
          >
            {label}
            {required && (
              <span aria-hidden className="text-teal ml-1">
                *
              </span>
            )}
          </label>
        )}
        <div
          id={id}
          className={[
            "flex items-center gap-3 rounded border-[1.5px] py-3 px-4",
            locked ? "border-rule bg-paper" : "border-teal bg-white",
          ].join(" ")}
        >
          <span
            aria-hidden
            className="shrink-0 size-9 rounded-fab bg-teal/15 flex items-center justify-center text-teal-deep"
          >
            <UserIcon size={18} strokeWidth={1.75} />
          </span>
          <div className="flex-1 min-w-0">
            <p className="font-display italic font-extrabold text-[18px] text-navy leading-tight truncate">
              {value.full_name}
            </p>
            <p className="font-mono text-[12px] text-slate/80 tracking-[0.04em] truncate">
              {value.email}
              {value.year_section && (
                <span className="ml-2 uppercase">
                  · {value.year_section}
                </span>
              )}
            </p>
          </div>
          {!locked && (
            <button
              type="button"
              onClick={clear}
              aria-label="Change student"
              className="shrink-0 p-1.5 text-slate hover:text-red-deep transition-colors"
            >
              <X size={18} strokeWidth={2} />
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label
          htmlFor={id}
          className="text-[15px] text-slate font-bold uppercase tracking-[0.08em]"
        >
          {label}
          {required && (
            <span aria-hidden className="text-teal ml-1">
              *
            </span>
          )}
        </label>
      )}
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
          aria-describedby={errorId}
          placeholder="Search by name or email"
          className={[
            "w-full rounded border-[1.5px] bg-white py-3.5 pl-11 pr-4",
            "font-mono text-[14px] tracking-[0.03em] text-navy placeholder:text-slate/60",
            "focus:outline-none transition-colors",
            error
              ? "border-red focus:border-red"
              : "border-rule focus:border-teal hover:border-slate/60",
          ].join(" ")}
        />
        <Search
          size={18}
          strokeWidth={1.75}
          aria-hidden
          className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-teal"
        />

        {open && query.trim().length >= 2 && (
          <div
            ref={popRef}
            className="tek-pop absolute z-40 mt-2 inset-x-0 rounded border-[1.5px] border-rule bg-paper shadow-lg max-h-[260px] overflow-y-auto"
          >
            {loading && (
              <div className="px-4 py-3 font-mono uppercase text-caps-sm text-slate tracking-[0.08em]">
                Searching…
              </div>
            )}
            {!loading && results.length === 0 && (
              <div className="px-4 py-3 font-mono uppercase text-caps-sm text-slate/70 tracking-[0.08em]">
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
                          "w-full text-left px-4 py-2.5 flex items-baseline gap-3",
                          "border-t border-rule/50 first:border-0",
                          active ? "bg-teal/10" : "hover:bg-teal/5",
                        ].join(" ")}
                      >
                        <span className="font-display italic font-extrabold text-[16px] text-navy truncate">
                          {r.full_name}
                        </span>
                        <span className="font-mono text-[12px] text-slate/80 tracking-[0.04em] truncate">
                          {r.email}
                          {r.year_section && (
                            <span className="ml-2 uppercase">
                              · {r.year_section}
                            </span>
                          )}
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
      {error && (
        <p id={errorId} className="text-[13px] text-red-deep font-medium">
          {error}
        </p>
      )}
    </div>
  );
}
