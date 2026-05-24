/**
 * Shared table primitive for report tabs. Server component. The caller
 * provides column definitions + row data; the table handles header style,
 * row dividers, empty state, and the responsive container.
 */

import type { ReactNode } from "react";
import { Inbox } from "lucide-react";

export type ColumnDef<T> = {
  key: string;
  header: string;
  /** Cell renderer. */
  render: (row: T) => React.ReactNode;
  /** Right-align numeric columns. */
  align?: "left" | "right";
  /** Hide on mobile (collapse to multi-line). */
  hideOnMobile?: boolean;
  /** Width hint applied as inline style on header + cell. */
  width?: string;
};

export function ReportsTable<T>({
  rows,
  columns,
  rowKey,
  emptyTitle,
  emptyHint,
  emptyCta,
}: {
  rows: T[];
  columns: ColumnDef<T>[];
  rowKey: (row: T) => string;
  emptyTitle: string;
  emptyHint?: string;
  emptyCta?: ReactNode;
}) {
  if (rows.length === 0) {
    return (
      <div className="border border-dashed border-rule rounded p-8 text-center bg-paper">
        <Inbox
          size={36}
          strokeWidth={1.5}
          aria-hidden
          className="mx-auto text-slate/40"
        />
        <p className="mt-4 font-display italic font-extrabold text-[18px] text-navy">
          {emptyTitle}
        </p>
        {emptyHint && (
          <p className="mt-1 text-[14px] text-slate">{emptyHint}</p>
        )}
        {emptyCta && <div className="mt-4">{emptyCta}</div>}
      </div>
    );
  }

  return (
    <div className="bg-paper border-[1.5px] border-rule rounded overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-rule">
              {columns.map((c) => (
                <th
                  key={c.key}
                  scope="col"
                  style={c.width ? { width: c.width } : undefined}
                  className={[
                    "py-3 px-4 font-mono uppercase text-caps-sm text-slate font-semibold tracking-[0.1em]",
                    c.align === "right" ? "text-right" : "text-left",
                    c.hideOnMobile ? "hidden md:table-cell" : "",
                  ].join(" ")}
                >
                  {c.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr
                key={rowKey(r)}
                className="border-b border-rule/60 last:border-b-0 hover:bg-teal/[0.03] transition-colors"
              >
                {columns.map((c) => (
                  <td
                    key={c.key}
                    className={[
                      "py-3 px-4 align-top text-[14px] text-navy",
                      c.align === "right" ? "text-right" : "text-left",
                      c.hideOnMobile ? "hidden md:table-cell" : "",
                    ].join(" ")}
                  >
                    {c.render(r)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
