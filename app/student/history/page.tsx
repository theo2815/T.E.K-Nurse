import { redirect } from "next/navigation";
import { ClipboardList } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import {
  getMyHistoryStats,
  listMyTransactionHistory,
  STUDENT_HISTORY_PAGE_SIZE,
} from "@/lib/supabase/queries/student-history";
import { SpeedLines } from "@/components/SpeedLines";
import { StudentHistoryTable } from "@/components/students/StudentHistoryTable";
import { Paginator } from "@/components/reports/Paginator";
import type { ReportSearchParams } from "@/components/reports/report-url";

export default async function StudentHistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [stats, historyPage] = await Promise.all([
    getMyHistoryStats(user.id),
    listMyTransactionHistory({ userId: user.id, page }),
  ]);

  const histParams: ReportSearchParams = { page: sp.page };

  return (
    <div className="mx-auto max-w-5xl px-6 md:px-12 py-12 md:py-16 flex flex-col gap-10">
      <header className="flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <SpeedLines className="w-12 h-5" />
          <p className="font-mono uppercase text-caps-sm text-teal font-semibold tracking-[0.1em]">
            Archive
          </p>
        </div>
        <h1 className="font-display italic font-extrabold text-display md:text-[48px] text-navy leading-[1.05]">
          History
        </h1>
        <p className="text-[15px] text-slate max-w-prose leading-relaxed">
          Every borrow you returned and every consumable you used, in one
          chronological log. Pending and approved requests live on{" "}
          <a
            href="/student/requests"
            className="text-navy font-semibold underline underline-offset-2 decoration-teal decoration-2 hover:text-teal-deep transition-colors"
          >
            Requests
          </a>
          .
        </p>
      </header>

      <section className="bg-paper border-[1.5px] border-rule rounded p-5 md:p-7 grid grid-cols-2 md:grid-cols-3 gap-6">
        <Stat label="Lifetime borrows" value={stats.lifetime_borrows} />
        <Stat label="Lifetime usages" value={stats.lifetime_usages} />
        <Stat
          label="Lost"
          value={stats.lost_count}
          tone={stats.lost_count > 0 ? "alert" : "default"}
        />
      </section>

      <section className="flex flex-col gap-4">
        <header className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <ClipboardList size={16} strokeWidth={1.75} className="text-teal" />
            <h2 className="font-display italic font-extrabold text-[22px] text-navy">
              Transactions
            </h2>
          </div>
          {historyPage.total > 0 && (
            <p className="font-mono uppercase text-caps-sm text-slate tracking-[0.08em]">
              {historyPage.total} EVENTS · NEWEST FIRST
            </p>
          )}
        </header>

        <StudentHistoryTable
          items={historyPage.rows}
          role="student"
          emptyTitle="No activity yet"
          emptyHint="When you borrow equipment or use consumables, every event lands here."
        />

        {historyPage.total > historyPage.pageSize && (
          <Paginator
            page={historyPage.page}
            pageSize={historyPage.pageSize || STUDENT_HISTORY_PAGE_SIZE}
            total={historyPage.total}
            basePath="/student/history"
            searchParams={histParams}
          />
        )}
      </section>

      <p className="font-mono uppercase text-caps-sm text-slate/70 tracking-[0.08em] -mt-2">
        Times shown in Asia/Manila · returned borrows use the return time, otherwise the borrow time
      </p>
    </div>
  );
}

function Stat({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: number;
  tone?: "default" | "alert";
}) {
  const cls =
    tone === "alert"
      ? "text-red-deep"
      : value === 0
        ? "text-slate/60"
        : "text-navy";
  return (
    <div className="flex flex-col gap-1.5">
      <dt className="font-mono uppercase text-caps-sm text-slate font-semibold tracking-[0.1em]">
        {label}
      </dt>
      <dd
        className={`font-display italic font-extrabold leading-none text-[40px] md:text-[48px] tracking-[-0.02em] ${cls}`}
      >
        {value}
      </dd>
    </div>
  );
}
