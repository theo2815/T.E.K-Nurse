"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/Input";
import { FilterChipRow, type Chip } from "@/components/ui/FilterChipRow";

const SEARCH_DEBOUNCE_MS = 250;

export function CatalogControls({
  chips,
  filterParam = "filter",
  searchParam = "q",
  searchPlaceholder = "Search by name or ID…",
  defaultFilter,
  preserveParams = [],
}: {
  chips: Chip[];
  filterParam?: string;
  searchParam?: string;
  searchPlaceholder?: string;
  /** Filter value to treat as the default (omitted from URL). Usually "ALL". */
  defaultFilter?: string;
  /** Extra search-param keys to preserve verbatim on every update (e.g. "type" tab). */
  preserveParams?: string[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const urlFilter = params.get(filterParam) ?? defaultFilter ?? chips[0].value;
  const urlSearch = params.get(searchParam) ?? "";

  const [search, setSearch] = useState(urlSearch);
  const [lastUrlSearch, setLastUrlSearch] = useState(urlSearch);
  const [, startTransition] = useTransition();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync local input when the URL changed externally (e.g. back/forward).
  // React-docs pattern for adjusting state on prop change without an effect.
  if (urlSearch !== lastUrlSearch) {
    setLastUrlSearch(urlSearch);
    setSearch(urlSearch);
  }

  function push(nextFilter: string, nextSearch: string) {
    const next = new URLSearchParams();
    for (const key of preserveParams) {
      const v = params.get(key);
      if (v) next.set(key, v);
    }
    if (nextFilter && nextFilter !== (defaultFilter ?? chips[0].value)) {
      next.set(filterParam, nextFilter);
    }
    if (nextSearch.trim().length > 0) {
      next.set(searchParam, nextSearch.trim());
    }
    const qs = next.toString();
    startTransition(() => {
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    });
  }

  function handleFilter(next: string) {
    push(next, search);
  }

  function handleSearch(next: string) {
    setSearch(next);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      push(urlFilter, next);
    }, SEARCH_DEBOUNCE_MS);
  }

  return (
    <div className="flex flex-col gap-5">
      <Input
        type="search"
        search
        placeholder={searchPlaceholder}
        value={search}
        onChange={(e) => handleSearch(e.target.value)}
        aria-label="Search catalog"
      />
      <FilterChipRow chips={chips} value={urlFilter} onChange={handleFilter} />
    </div>
  );
}
