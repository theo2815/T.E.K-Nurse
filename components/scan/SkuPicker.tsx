"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useProgressRouter } from "@/lib/use-progress-router";
import { Search, Wrench, Beaker, ArrowRight } from "lucide-react";
import { searchSkusAction } from "@/app/staff/actions";
import type { SkuSearchRow } from "@/lib/supabase/queries/sku-search";
import { PhotoFrame } from "@/components/catalog/PhotoFrame";

/**
 * Unified SKU finder used as the camera fallback on /staff/scan.
 * Search-as-you-type across equipment + consumable SKUs by qr_code or name.
 *
 * When `onResolve` is provided, the parent owns the post-pick flow (open an
 * action modal) — the picker clears its input and hands off the qr_code.
 * Otherwise it falls back to `router.push('/s/{qr}')` (slice-2 redirector).
 */
export function SkuPicker({
  autoFocus = false,
  onResolve,
}: {
  autoFocus?: boolean;
  onResolve?: (qr: string) => void;
}) {
  const router = useProgressRouter();
  const id = useId();

  const [query, setQuery] = useState("");
  const [fetchedResults, setFetchedResults] = useState<SkuSearchRow[]>([]);
  const [open, setOpen] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);

  const inputRef = useRef<HTMLInputElement>(null);
  const popRef = useRef<HTMLDivElement>(null);
  const lastQuery = useRef<string>("");

  const trimmedQ = query.trim();
  const tooShort = trimmedQ.length < 2;
  // Derived display state — when the query is too short to fetch, hide the
  // (now-stale) fetched results without writing to state inside the effect.
  const results = tooShort ? [] : fetchedResults;
  const loading = tooShort ? false : isFetching;

  // Debounce + fetch.
  // setIsFetching is called inside the timer callback (not synchronously in
  // effect setup) to satisfy react-hooks/set-state-in-effect.
  useEffect(() => {
    if (tooShort) return;
    lastQuery.current = trimmedQ;
    let cancelled = false;
    const timer = setTimeout(async () => {
      if (cancelled) return;
      setIsFetching(true);
      const res = await searchSkusAction(trimmedQ);
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

  function pick(r: SkuSearchRow) {
    setOpen(false);
    if (onResolve) {
      // Kiosk-style flow — clear the input so the next search starts fresh,
      // hand the qr_code to the parent (which opens the action modal).
      setQuery("");
      setFetchedResults([]);
      setActiveIdx(0);
      onResolve(r.qr_code);
      return;
    }
    router.push(`/s/${encodeURIComponent(r.qr_code)}`);
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

  return (
    <div className="relative">
      <label
        htmlFor={id}
        className="font-mono uppercase text-caps-sm text-slate font-semibold tracking-[0.1em] block mb-2"
      >
        Find item
      </label>
      <div className="relative">
        <input
          ref={inputRef}
          id={id}
          type="text"
          autoComplete="off"
          autoFocus={autoFocus}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKey}
          placeholder="ID or name (e.g. STH-001, stethoscope)"
          className="w-full rounded border-[1.5px] bg-white py-3.5 pl-11 pr-4
            font-mono text-[14px] tracking-[0.03em] text-navy placeholder:text-slate/60
            border-rule focus:border-teal hover:border-slate/60
            focus:outline-none transition-colors"
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
            className="tek-pop absolute z-40 mt-2 inset-x-0 rounded border-[1.5px] border-rule bg-paper shadow-lg max-h-[320px] overflow-y-auto"
          >
            {loading && (
              <div className="px-4 py-3 font-mono uppercase text-caps-sm text-slate tracking-[0.08em]">
                Searching…
              </div>
            )}
            {!loading && results.length === 0 && (
              <div className="px-4 py-4">
                <p className="font-mono uppercase text-caps-sm text-slate/70 tracking-[0.08em]">
                  No matches
                </p>
                <p className="mt-1 text-[13px] text-slate/80">
                  Try a different ID or a partial name.
                </p>
              </div>
            )}
            {!loading && results.length > 0 && (
              <ul role="listbox" aria-label="SKU matches">
                {results.map((r, i) => {
                  const active = i === activeIdx;
                  const isEq = r.type === "equipment";
                  const TypeIcon = isEq ? Wrench : Beaker;
                  return (
                    <li
                      key={`${r.type}:${r.qr_code}`}
                      role="option"
                      aria-selected={active}
                    >
                      <button
                        type="button"
                        onClick={() => pick(r)}
                        onMouseEnter={() => setActiveIdx(i)}
                        className={[
                          "w-full text-left px-4 py-3 flex items-center gap-3",
                          "border-t border-rule/50 first:border-0 group",
                          active ? "bg-teal/10" : "hover:bg-teal/5",
                        ].join(" ")}
                      >
                        <PhotoFrame
                          src={r.photo_url}
                          alt={r.name}
                          size="tiny"
                          className="shrink-0"
                        />
                        <span
                          className={[
                            "shrink-0 inline-flex items-center gap-1 px-1.5 py-0.5 rounded font-mono uppercase tracking-[0.1em] text-[10px] font-bold",
                            isEq
                              ? "bg-teal/15 text-teal-deep"
                              : "bg-navy/10 text-navy",
                          ].join(" ")}
                        >
                          <TypeIcon size={10} strokeWidth={2} />
                          {isEq ? "EQ" : "CN"}
                        </span>
                        <span className="font-mono text-[13px] tracking-[0.04em] text-navy font-semibold min-w-[72px]">
                          {r.qr_code}
                        </span>
                        <span className="flex-1 min-w-0 text-[15px] text-navy truncate">
                          {r.name}
                        </span>
                        {r.caption && (
                          <span className="hidden sm:inline italic text-[13px] text-slate truncate max-w-[160px]">
                            {r.caption}
                          </span>
                        )}
                        <ArrowRight
                          size={14}
                          strokeWidth={2}
                          aria-hidden
                          className={[
                            "shrink-0 transition-transform",
                            active
                              ? "text-teal translate-x-0.5"
                              : "text-slate/40 group-hover:text-teal",
                          ].join(" ")}
                        />
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}
      </div>
      <p className="mt-2 font-mono uppercase text-caps-sm text-slate/70 tracking-[0.08em]">
        Searches both equipment + consumables
      </p>
    </div>
  );
}
