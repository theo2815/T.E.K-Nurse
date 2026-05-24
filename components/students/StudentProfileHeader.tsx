import { User as UserIcon, AlertTriangle, Ban, Mail } from "lucide-react";
import type { StudentDetail } from "@/lib/supabase/queries/students";
import { SpeedLines } from "@/components/SpeedLines";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0]?.[0]?.toUpperCase() ?? "?";
  return (
    (parts[0]?.[0] ?? "") + (parts[parts.length - 1]?.[0] ?? "")
  ).toUpperCase();
}

export function StudentProfileHeader({
  student,
  action,
}: {
  student: StudentDetail;
  /** Top-right action slot — e.g. the Suspend/Reinstate button. */
  action?: React.ReactNode;
}) {
  const flags: React.ReactNode[] = [];
  if (student.overdue_count > 0) {
    flags.push(
      <span
        key="overdue"
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded border border-red bg-red/10 text-red-deep font-mono uppercase text-caps-sm font-semibold tracking-[0.08em]"
      >
        <AlertTriangle size={12} strokeWidth={2.5} />
        {student.overdue_count} overdue · borrowing blocked
      </span>,
    );
  }
  if (!student.is_active) {
    flags.push(
      <span
        key="blocked"
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded border border-red-deep bg-red-deep/10 text-red-deep font-mono uppercase text-caps-sm font-semibold tracking-[0.08em]"
      >
        <Ban size={12} strokeWidth={2.5} />
        Account paused
      </span>,
    );
  }

  return (
    <header className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <SpeedLines className="w-12 h-5" />
          <p className="font-mono uppercase text-caps-sm text-teal font-semibold tracking-[0.1em]">
            Student profile
          </p>
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>

      <div className="flex flex-col md:flex-row md:items-start gap-6">
        <div
          aria-hidden
          className="shrink-0 size-20 md:size-24 rounded-fab bg-teal/15 flex items-center justify-center text-teal-deep font-display italic font-extrabold text-[32px] md:text-[40px]"
        >
          {student.full_name.trim().length > 0 ? (
            initials(student.full_name)
          ) : (
            <UserIcon size={32} strokeWidth={1.75} />
          )}
        </div>

        <div className="flex-1 min-w-0 flex flex-col gap-3">
          <div>
            <h1 className="font-display italic font-extrabold text-display md:text-[48px] text-navy leading-tight">
              {student.full_name}
            </h1>
            <p className="mt-2 flex flex-wrap items-center gap-3 font-mono text-[14px] text-slate tracking-[0.03em]">
              <span className="inline-flex items-center gap-1.5">
                <Mail size={14} strokeWidth={1.75} className="text-teal" />
                {student.email}
              </span>
              {student.student_id && (
                <span className="uppercase text-caps-md font-semibold tracking-[0.08em]">
                  · {student.student_id}
                </span>
              )}
            </p>
          </div>

          {flags.length > 0 && (
            <div className="flex flex-wrap gap-2">{flags}</div>
          )}

          {/* Current pause reason — appears inline when account is paused */}
          {!student.is_active && student.latest_suspension && (
            <div className="mt-1 border-l-4 border-red-deep bg-red-deep/5 rounded-r px-4 py-3 flex flex-col gap-1.5">
              <p className="font-mono uppercase text-caps-sm text-red-deep font-bold tracking-[0.1em]">
                Currently paused
                <span className="text-slate font-medium ml-2">
                  · {formatDateTime(student.latest_suspension.suspended_at)}
                  {student.latest_suspension.suspended_by_name && (
                    <>
                      <span className="mx-1.5">·</span>
                      by{" "}
                      <span className="text-navy font-semibold">
                        {student.latest_suspension.suspended_by_name}
                      </span>
                    </>
                  )}
                </span>
              </p>
              <p className="text-[14px] italic text-navy leading-relaxed">
                “{student.latest_suspension.reason || "(no reason recorded)"}”
              </p>
            </div>
          )}
        </div>
      </div>

      <hr className="border-rule" />

      <dl className="grid grid-cols-2 md:grid-cols-4 gap-6">
        <Stat label="Active loans" value={student.active_loan_count} tone={student.active_loan_count > 0 ? "active" : "default"} />
        <Stat label="Overdue" value={student.overdue_count} tone={student.overdue_count > 0 ? "alert" : "default"} />
        <Stat label="Lifetime borrows" value={student.lifetime_borrow_count} />
        <Stat label="Lifetime usage" value={student.lifetime_usage_count} />
      </dl>

      <p className="font-mono uppercase text-caps-sm text-slate/70 tracking-[0.08em]">
        Joined {formatDate(student.created_at)}
        {student.first_activity_at && (
          <>
            <span aria-hidden className="mx-2">·</span>
            First activity {formatDate(student.first_activity_at)}
          </>
        )}
      </p>
    </header>
  );
}

function Stat({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: number;
  tone?: "default" | "alert" | "active";
}) {
  const cls =
    tone === "alert"
      ? "text-red-deep"
      : tone === "active"
        ? "text-teal"
        : value === 0
          ? "text-slate/60"
          : "text-navy";
  return (
    <div>
      <dt className="font-mono uppercase text-caps-sm text-slate font-semibold tracking-[0.1em]">
        {label}
      </dt>
      <dd
        className={`mt-1 font-display italic font-extrabold leading-none text-[40px] md:text-[48px] tracking-[-0.02em] ${cls}`}
      >
        {value}
      </dd>
    </div>
  );
}
