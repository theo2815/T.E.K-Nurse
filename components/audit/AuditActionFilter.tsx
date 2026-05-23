"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, X } from "lucide-react";
import { useProgressRouter } from "@/lib/use-progress-router";
import { AUDIT_ACTION_GROUPS } from "@/lib/audit/constants";
import { actionLabel } from "./action-labels";
import {
  buildReportHref,
  type ReportSearchParams,
} from "@/components/reports/report-url";

/**
 * Multi-select popover. The chip-strip approach used by StatusFilter is fine
 * for 4–5 statuses but doesn't scale to ~30 action types. Click the trigger
 * → grouped checkbox list. Selected items collapse into a count chip on the
 * trigger.
 */
export function AuditActionFilter({
  selected,
  basePath,
  searchParams,
}: {
  selected: string[];
  basePath: string;
  searchParams: ReportSearchParams;
}) {
  const router = useProgressRouter();
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [draft, setDraft] = useState<string[]>(selected);

  useEffect(() => {
    setDraft(selected);
  }, [selected]);

  useEffect(() => {
    if (!open) return;
    function onDown(e: PointerEvent) {
      const t = e.target as Node;
      if (wrapperRef.current?.contains(t)) return;
      setOpen(false);
    }
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [open]);

  function toggle(value: string) {
    setDraft((d) =>
      d.includes(value) ? d.filter((v) => v !== value) : [...d, value],
    );
  }

  function apply() {
    const param = draft.length === 0 ? undefined : draft.join(",");
    router.push(
      buildReportHref(basePath, searchParams, {
        action: param,
        page: undefined,
      }),
      { scroll: false },
    );
    setOpen(false);
  }

  function clearAll() {
    setDraft([]);
    router.push(
      buildReportHref(basePath, searchParams, {
        action: undefined,
        page: undefined,
      }),
      { scroll: false },
    );
    setOpen(false);
  }

  const count = selected.length;
  const triggerLabel =
    count === 0
      ? "Any action"
      : count === 1
        ? actionLabel(selected[0])
        : `${count} actions`;

  return (
    <div className="flex flex-col gap-1.5" ref={wrapperRef}>
      <p className="font-mono uppercase text-caps-sm text-slate font-semibold tracking-[0.1em]">
        Action
      </p>
      <div className="relative">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className={[
            "w-full md:w-72 rounded border-[1.5px] py-2.5 px-3 flex items-center gap-2 text-[14px] font-mono tracking-[0.03em] transition-colors",
            count > 0
              ? "border-teal bg-teal/5 text-teal-deep"
              : "border-rule bg-white text-navy hover:border-slate/60",
          ].join(" ")}
        >
          <span className="flex-1 text-left truncate">{triggerLabel}</span>
          {count > 0 && (
            <span
              aria-hidden
              className="shrink-0 inline-flex items-center justify-center rounded-fab bg-teal text-white font-mono uppercase text-caps-sm tracking-[0.08em] font-bold px-2 min-w-[24px] py-0.5"
            >
              {count}
            </span>
          )}
          <ChevronDown
            size={14}
            strokeWidth={2}
            aria-hidden
            className="shrink-0 text-slate"
          />
        </button>
        {open && (
          <div className="tek-pop absolute z-40 mt-2 inset-x-0 md:w-[22rem] rounded border-[1.5px] border-rule bg-paper shadow-lg max-h-[420px] overflow-y-auto">
            <div className="flex items-center justify-between px-3 py-2 border-b border-rule/60 bg-paper sticky top-0">
              <span className="font-mono uppercase text-caps-sm text-slate font-semibold tracking-[0.1em]">
                Pick actions
              </span>
              <button
                type="button"
                onClick={clearAll}
                disabled={count === 0 && draft.length === 0}
                className="inline-flex items-center gap-1 font-mono uppercase text-caps-sm text-slate hover:text-red-deep disabled:text-slate/40 disabled:cursor-not-allowed tracking-[0.08em]"
              >
                <X size={12} strokeWidth={2} />
                Clear
              </button>
            </div>
            <ul className="py-1">
              {AUDIT_ACTION_GROUPS.map((g) => (
                <li key={g.group}>
                  <p className="px-3 pt-3 pb-1 font-mono uppercase text-caps-sm text-slate/80 tracking-[0.08em]">
                    {g.group}
                  </p>
                  {g.actions.map((a) => {
                    const checked = draft.includes(a);
                    return (
                      <button
                        key={a}
                        type="button"
                        role="menuitemcheckbox"
                        aria-checked={checked}
                        onClick={() => toggle(a)}
                        className="w-full px-3 py-1.5 flex items-center gap-2 text-left text-[14px] text-navy hover:bg-teal/5 transition-colors"
                      >
                        <span
                          aria-hidden
                          className={[
                            "shrink-0 size-4 rounded border-[1.5px] flex items-center justify-center",
                            checked
                              ? "bg-teal border-teal text-white"
                              : "border-rule bg-white",
                          ].join(" ")}
                        >
                          {checked && (
                            <Check size={12} strokeWidth={2.5} />
                          )}
                        </span>
                        <span className="truncate">{actionLabel(a)}</span>
                      </button>
                    );
                  })}
                </li>
              ))}
            </ul>
            <div className="sticky bottom-0 bg-paper border-t border-rule/60 px-3 py-2 flex justify-end">
              <button
                type="button"
                onClick={apply}
                className="inline-flex items-center gap-1.5 rounded bg-teal hover:bg-teal-deep text-white font-mono uppercase text-caps-sm tracking-[0.08em] font-bold px-4 py-2 transition-colors"
              >
                <Check size={12} strokeWidth={2.5} />
                Apply
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
