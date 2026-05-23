import Link from "next/link";
import { User as UserIcon, AlertTriangle, Ban } from "lucide-react";
import type { StudentRosterRow } from "@/lib/supabase/queries/students";
import { ReportsTable, type ColumnDef } from "@/components/reports/ReportsTable";
import { timeAgo } from "@/lib/time-ago";

function StudentBadge({
  tone,
  icon: Icon,
  children,
}: {
  tone: "alert" | "block" | "active";
  icon: React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }>;
  children: React.ReactNode;
}) {
  const cls =
    tone === "alert"
      ? "border-red bg-red/10 text-red-deep"
      : tone === "block"
        ? "border-red-deep bg-red-deep/10 text-red-deep"
        : "border-teal bg-teal/10 text-teal-deep";
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border font-mono uppercase text-caps-sm font-semibold tracking-[0.08em] ${cls}`}
    >
      <Icon size={11} strokeWidth={2.5} />
      {children}
    </span>
  );
}

export function StudentsTable({ rows }: { rows: StudentRosterRow[] }) {
  const columns: ColumnDef<StudentRosterRow>[] = [
    {
      key: "student",
      header: "Student",
      render: (r) => (
        <Link
          href={`/staff/students/${r.id}`}
          className="group flex items-center gap-3"
        >
          <span
            aria-hidden
            className="shrink-0 size-9 rounded-fab bg-teal/15 flex items-center justify-center text-teal-deep"
          >
            <UserIcon size={16} strokeWidth={1.75} />
          </span>
          <div className="min-w-0 flex flex-col">
            <span className="text-[15px] text-navy font-semibold truncate group-hover:text-teal-deep transition-colors">
              {r.full_name}
            </span>
            <span className="font-mono text-[12px] text-slate/80 tracking-[0.04em] truncate">
              {r.email}
            </span>
          </div>
        </Link>
      ),
    },
    {
      key: "year_section",
      header: "Year · Section",
      width: "140px",
      hideOnMobile: true,
      render: (r) =>
        r.year_section ? (
          <span className="font-mono uppercase text-caps-md text-slate tracking-[0.06em]">
            {r.year_section}
          </span>
        ) : (
          <span className="font-mono uppercase text-caps-sm text-slate/50 tracking-[0.08em]">
            —
          </span>
        ),
    },
    {
      key: "loans",
      header: "Active",
      width: "100px",
      align: "right",
      render: (r) => (
        <span
          className={`font-display italic font-extrabold text-[22px] leading-none ${
            r.active_loan_count > 0 ? "text-teal" : "text-slate/60"
          }`}
        >
          {r.active_loan_count}
        </span>
      ),
    },
    {
      key: "flags",
      header: "Flags",
      width: "200px",
      hideOnMobile: true,
      render: (r) => {
        const flags: React.ReactNode[] = [];
        if (r.overdue_count > 0) {
          flags.push(
            <StudentBadge key="o" tone="alert" icon={AlertTriangle}>
              {r.overdue_count} overdue
            </StudentBadge>,
          );
        }
        if (!r.is_active) {
          flags.push(
            <StudentBadge key="b" tone="block" icon={Ban}>
              Blocked
            </StudentBadge>,
          );
        }
        if (flags.length === 0) {
          return (
            <span className="font-mono uppercase text-caps-sm text-slate/50 tracking-[0.08em]">
              —
            </span>
          );
        }
        return <div className="flex flex-wrap gap-1.5">{flags}</div>;
      },
    },
    {
      key: "last_activity",
      header: "Last activity",
      width: "140px",
      align: "right",
      hideOnMobile: true,
      render: (r) =>
        r.last_activity_at ? (
          <span className="font-mono uppercase text-caps-md text-slate tracking-[0.04em]">
            {timeAgo(r.last_activity_at)}
          </span>
        ) : (
          <span className="font-mono uppercase text-caps-sm text-slate/50 tracking-[0.08em]">
            Never
          </span>
        ),
    },
  ];

  return (
    <ReportsTable
      rows={rows}
      columns={columns}
      rowKey={(r) => r.id}
      emptyTitle="No students match"
      emptyHint="Try a different search, or clear it to see everyone."
    />
  );
}
