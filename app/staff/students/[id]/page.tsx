import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, Package, ClipboardList } from "lucide-react";
import {
  getStudentDetail,
  getStudentSuspensionHistory,
  listStudentActiveLoans,
  listStudentTransactionHistory,
  STUDENT_HISTORY_PAGE_SIZE,
} from "@/lib/supabase/queries/students";
import { StudentProfileHeader } from "@/components/students/StudentProfileHeader";
import { StudentActiveLoans } from "@/components/students/StudentActiveLoans";
import { StudentHistoryTable } from "@/components/students/StudentHistoryTable";
import { StudentSuspensionHistory } from "@/components/students/StudentSuspensionHistory";
import { SuspendStudentButton } from "@/components/students/SuspendStudentButton";
import { Paginator } from "@/components/reports/Paginator";
import type { ReportSearchParams } from "@/components/reports/report-url";

export default async function StaffStudentDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);

  const student = await getStudentDetail(id);
  if (!student) notFound();

  const [activeLoans, history, suspensionHistory] = await Promise.all([
    listStudentActiveLoans(id),
    listStudentTransactionHistory({ studentId: id, page }),
    getStudentSuspensionHistory(id),
  ]);

  const base = `/staff/students/${id}`;
  const histParams: ReportSearchParams = { page: sp.page };

  return (
    <div className="mx-auto max-w-6xl px-6 md:px-12 py-12 md:py-16 flex flex-col gap-10">
      <Link
        href="/staff/students"
        className="inline-flex items-center gap-1.5 self-start font-mono uppercase text-caps-sm text-slate hover:text-teal-deep tracking-[0.08em] font-semibold transition-colors"
      >
        <ChevronLeft size={14} strokeWidth={2} />
        Back to roster
      </Link>

      <StudentProfileHeader
        student={student}
        action={
          <SuspendStudentButton
            student={{
              id: student.id,
              full_name: student.full_name,
              email: student.email,
              is_active: student.is_active,
            }}
          />
        }
      />

      <section className="flex flex-col gap-4">
        <header className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <Package size={16} strokeWidth={1.75} className="text-teal" />
            <h2 className="font-display italic font-extrabold text-[22px] text-navy">
              Active loans
            </h2>
          </div>
          {student.active_loan_count > 0 && (
            <p className="font-mono uppercase text-caps-sm text-slate tracking-[0.08em]">
              {student.active_loan_count} OUT · DUE-SOONEST FIRST
            </p>
          )}
        </header>
        <StudentActiveLoans loans={activeLoans} />
      </section>

      <section className="flex flex-col gap-4">
        <header className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <ClipboardList size={16} strokeWidth={1.75} className="text-teal" />
            <h2 className="font-display italic font-extrabold text-[22px] text-navy">
              Transaction history
            </h2>
          </div>
          {history.total > 0 && (
            <p className="font-mono uppercase text-caps-sm text-slate tracking-[0.08em]">
              {history.total} EVENTS · NEWEST FIRST
            </p>
          )}
        </header>

        <StudentHistoryTable items={history.rows} />

        {history.total > history.pageSize && (
          <Paginator
            page={history.page}
            pageSize={history.pageSize || STUDENT_HISTORY_PAGE_SIZE}
            total={history.total}
            basePath={base}
            searchParams={histParams}
          />
        )}
      </section>

      <StudentSuspensionHistory events={suspensionHistory} />

      <p className="font-mono uppercase text-caps-sm text-slate/70 tracking-[0.08em] -mt-2">
        Profile editing arrives in Phase 13 · staff actions on loans live on /staff/scan + /staff/loans
      </p>
    </div>
  );
}
