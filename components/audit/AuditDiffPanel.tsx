"use client";

import { useMemo, useState } from "react";
import { ArrowRight, Eye, EyeOff, Plus, Minus, Pencil } from "lucide-react";

/**
 * Side-by-side BEFORE / AFTER renderer for an audit row's JSON snapshots.
 *
 * Default mode: only changed keys (additions, removals, edits). The audit
 * triggers store full `to_jsonb(old/new)` payloads, which means most rows
 * have a dozen+ unchanged fields (created_at, ids, etc.) that bury the
 * actually-interesting delta. The "Show all fields" toggle reveals the
 * unchanged keys in muted text for forensic completeness.
 */
export function AuditDiffPanel({
  before,
  after,
  notes,
}: {
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  notes: string | null;
}) {
  const [showAll, setShowAll] = useState(false);
  const diff = useMemo(() => buildDiff(before, after), [before, after]);
  const visible = showAll
    ? diff
    : diff.filter((d) => d.kind !== "unchanged");

  return (
    <div className="bg-paper border-[1.5px] border-rule rounded p-4 md:p-5 flex flex-col gap-4">
      {notes && (
        <div className="border-l-[3px] border-amber pl-3 py-1">
          <p className="font-mono uppercase text-caps-sm text-slate font-semibold tracking-[0.1em]">
            Notes
          </p>
          <p className="text-[14px] text-navy italic mt-0.5 whitespace-pre-wrap break-words">
            {notes}
          </p>
        </div>
      )}

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <DiffLegend diff={diff} />
        {diff.some((d) => d.kind === "unchanged") && (
          <button
            type="button"
            onClick={() => setShowAll((v) => !v)}
            className="inline-flex items-center gap-1.5 font-mono uppercase text-caps-sm text-slate hover:text-teal-deep tracking-[0.08em] transition-colors"
          >
            {showAll ? (
              <>
                <EyeOff size={12} strokeWidth={2} />
                Changed only
              </>
            ) : (
              <>
                <Eye size={12} strokeWidth={2} />
                Show all fields
              </>
            )}
          </button>
        )}
      </div>

      {before === null && after === null ? (
        <p className="text-[14px] text-slate italic">
          No before / after snapshot recorded for this event.
        </p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
          <SnapshotColumn
            title="Before"
            rows={visible}
            side="before"
          />
          <SnapshotColumn
            title="After"
            rows={visible}
            side="after"
          />
        </div>
      )}
    </div>
  );
}

type DiffKind = "added" | "removed" | "changed" | "unchanged";

type DiffRow = {
  key: string;
  kind: DiffKind;
  before: unknown;
  after: unknown;
};

function buildDiff(
  before: Record<string, unknown> | null,
  after: Record<string, unknown> | null,
): DiffRow[] {
  const beforeObj = before ?? {};
  const afterObj = after ?? {};
  const keys = new Set<string>([
    ...Object.keys(beforeObj),
    ...Object.keys(afterObj),
  ]);
  const rows: DiffRow[] = [];
  for (const key of keys) {
    const hasBefore = key in beforeObj;
    const hasAfter = key in afterObj;
    const b = beforeObj[key];
    const a = afterObj[key];
    let kind: DiffKind;
    if (!hasBefore && hasAfter) kind = "added";
    else if (hasBefore && !hasAfter) kind = "removed";
    else if (deepEqual(b, a)) kind = "unchanged";
    else kind = "changed";
    rows.push({ key, kind, before: b, after: a });
  }
  return rows.sort((x, y) => {
    // Show diffs first (added/removed/changed), then unchanged. Within a
    // group, alphabetical by key.
    const rank = (k: DiffKind) => (k === "unchanged" ? 1 : 0);
    const rDiff = rank(x.kind) - rank(y.kind);
    if (rDiff !== 0) return rDiff;
    return x.key.localeCompare(y.key);
  });
}

function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a === null || b === null) return a === b;
  if (typeof a !== "object" || typeof b !== "object") return false;
  // Cheap structural compare via JSON.stringify — fine for to_jsonb output
  // which is finite, ordered, and has no functions/symbols.
  try {
    return JSON.stringify(a) === JSON.stringify(b);
  } catch {
    return false;
  }
}

function SnapshotColumn({
  title,
  rows,
  side,
}: {
  title: string;
  rows: DiffRow[];
  side: "before" | "after";
}) {
  return (
    <div className="border border-rule rounded bg-white overflow-hidden">
      <div className="px-3 py-1.5 bg-paper border-b border-rule font-mono uppercase text-caps-sm text-slate font-semibold tracking-[0.1em]">
        {title}
      </div>
      <ul>
        {rows.length === 0 && (
          <li className="px-3 py-3 text-[13px] text-slate italic">
            (no fields)
          </li>
        )}
        {rows.map((d) => (
          <li
            key={d.key}
            className={[
              "px-3 py-2 border-t border-rule/40 first:border-t-0 flex items-start gap-2",
              kindBg(d.kind, side),
            ].join(" ")}
          >
            <span aria-hidden className="shrink-0 mt-0.5">
              {kindGlyph(d.kind, side)}
            </span>
            <div className="flex-1 min-w-0">
              <p className="font-mono uppercase text-caps-sm text-slate/80 tracking-[0.08em] truncate">
                {d.key}
              </p>
              <p
                className={[
                  "text-[13px] mt-0.5 break-words font-mono tracking-[0.01em]",
                  d.kind === "unchanged" ? "text-slate/60" : "text-navy",
                ].join(" ")}
              >
                {renderValue(side === "before" ? d.before : d.after, d.kind, side)}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function kindBg(kind: DiffKind, side: "before" | "after"): string {
  if (kind === "unchanged") return "bg-white";
  if (kind === "added") return side === "after" ? "bg-green/5" : "bg-white";
  if (kind === "removed") return side === "before" ? "bg-red/5" : "bg-white";
  return side === "after" ? "bg-teal/5" : "bg-amber/5"; // changed
}

function kindGlyph(kind: DiffKind, side: "before" | "after"): React.ReactNode {
  const cls = "text-slate/60";
  if (kind === "unchanged") {
    return <ArrowRight size={12} strokeWidth={1.75} className={cls} />;
  }
  if (kind === "added") {
    return side === "after" ? (
      <Plus size={12} strokeWidth={2.25} className="text-green" />
    ) : (
      <span aria-hidden className="inline-block size-3" />
    );
  }
  if (kind === "removed") {
    return side === "before" ? (
      <Minus size={12} strokeWidth={2.25} className="text-red-deep" />
    ) : (
      <span aria-hidden className="inline-block size-3" />
    );
  }
  return <Pencil size={12} strokeWidth={2} className="text-teal-deep" />;
}

function renderValue(
  v: unknown,
  kind: DiffKind,
  side: "before" | "after",
): React.ReactNode {
  // Suppress the empty side of added/removed rows so the cell is visually
  // anchored to the column where the data actually lives.
  if (kind === "added" && side === "before") {
    return <span className="italic text-slate/60">—</span>;
  }
  if (kind === "removed" && side === "after") {
    return <span className="italic text-slate/60">—</span>;
  }
  if (v === null || v === undefined) {
    return <span className="italic text-slate/60">null</span>;
  }
  if (typeof v === "string") return v;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  // Object / array — pretty-print.
  try {
    return (
      <span className="whitespace-pre-wrap">{JSON.stringify(v, null, 2)}</span>
    );
  } catch {
    return <span className="italic text-slate/60">[unserializable]</span>;
  }
}

function DiffLegend({ diff }: { diff: DiffRow[] }) {
  const counts = {
    changed: diff.filter((d) => d.kind === "changed").length,
    added: diff.filter((d) => d.kind === "added").length,
    removed: diff.filter((d) => d.kind === "removed").length,
    unchanged: diff.filter((d) => d.kind === "unchanged").length,
  };
  const parts: { label: string; n: number; cls: string }[] = [];
  if (counts.changed > 0)
    parts.push({
      label: `${counts.changed} changed`,
      n: counts.changed,
      cls: "text-teal-deep",
    });
  if (counts.added > 0)
    parts.push({
      label: `${counts.added} added`,
      n: counts.added,
      cls: "text-green",
    });
  if (counts.removed > 0)
    parts.push({
      label: `${counts.removed} removed`,
      n: counts.removed,
      cls: "text-red-deep",
    });
  if (parts.length === 0 && counts.unchanged > 0) {
    parts.push({
      label: `${counts.unchanged} fields · no change`,
      n: counts.unchanged,
      cls: "text-slate",
    });
  }
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 font-mono uppercase text-caps-sm tracking-[0.08em] font-semibold">
      {parts.map((p) => (
        <span key={p.label} className={p.cls}>
          {p.label}
        </span>
      ))}
    </div>
  );
}
