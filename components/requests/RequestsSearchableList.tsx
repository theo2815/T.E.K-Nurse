"use client";

import { Fragment, useMemo, useState } from "react";
import { Info, X } from "lucide-react";
import { Input } from "@/components/ui/Input";

export type RequestsSearchableItem = {
  /** Stable key for React reconciliation. */
  id: string;
  /** Lowercased haystack pre-computed on the server. Filter is a substring
   *  match against this string. */
  searchText: string;
  /** Pre-rendered card element (server-rendered card components). */
  element: React.ReactNode;
};

type Props = {
  items: RequestsSearchableItem[];
  /** Italic info caption rendered under the list (e.g. "Queue updates live…"). */
  footer?: React.ReactNode;
};

export function RequestsSearchableList({ items, footer }: Props) {
  const [query, setQuery] = useState("");

  const trimmed = query.trim().toLowerCase();
  const filtered = useMemo(() => {
    if (!trimmed) return items;
    return items.filter((it) => it.searchText.includes(trimmed));
  }, [items, trimmed]);

  return (
    <div className="flex flex-col gap-4">
      <Input
        type="search"
        search
        placeholder="Find by student or item…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        aria-label="Search by student or item"
        autoComplete="off"
      />

      {filtered.length === 0 ? (
        <div className="border-[1.5px] border-dashed border-rule rounded p-6 text-center flex flex-col items-center gap-3">
          <p className="font-mono uppercase text-caps-sm font-semibold tracking-[0.1em] text-slate">
            No matches
          </p>
          <p className="text-[14px] text-slate">
            Nothing here matches{" "}
            <span className="font-mono text-navy">&ldquo;{query.trim()}&rdquo;</span>
            .
          </p>
          <button
            type="button"
            onClick={() => setQuery("")}
            className="inline-flex items-center gap-1.5 font-mono uppercase text-caps-sm font-bold tracking-[0.1em] text-teal-deep hover:underline underline-offset-4 decoration-teal decoration-2"
          >
            <X size={14} strokeWidth={2} />
            Clear search
          </button>
        </div>
      ) : (
        <>
          {trimmed && (
            <p className="font-mono uppercase text-caps-sm text-slate tracking-[0.08em]">
              {filtered.length} {filtered.length === 1 ? "match" : "matches"}
            </p>
          )}
          <div className="flex flex-col gap-4">
            {filtered.map((it) => (
              <Fragment key={it.id}>{it.element}</Fragment>
            ))}
          </div>
          {footer && (
            <p className="mt-2 inline-flex items-center gap-2 text-[13px] text-slate italic">
              <Info size={14} strokeWidth={1.75} />
              {footer}
            </p>
          )}
        </>
      )}
    </div>
  );
}
