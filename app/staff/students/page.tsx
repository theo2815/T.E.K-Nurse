import { CatalogHeader } from "@/components/catalog/CatalogHeader";
import { Paginator } from "@/components/reports/Paginator";
import { StudentsTable } from "@/components/students/StudentsTable";
import { StudentSearchBar } from "@/components/students/StudentSearchBar";
import {
  listStudents,
  STUDENTS_PAGE_SIZE,
} from "@/lib/supabase/queries/students";
import type { ReportSearchParams } from "@/components/reports/report-url";

const BASE = "/staff/students";

export default async function StaffStudentsPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    page?: string;
  }>;
}) {
  const sp = await searchParams;
  const q = sp.q?.trim() ?? "";
  const page = Math.max(1, Number(sp.page) || 1);

  const roster = await listStudents({ q: q || undefined, page });

  const params: ReportSearchParams = {
    q: q || undefined,
    page: sp.page,
  };

  const overview =
    roster.total === 0
      ? q
        ? "NO MATCHES"
        : "NO STUDENTS YET"
      : `${roster.total} ${
          q ? `MATCH${roster.total === 1 ? "" : "ES"}` : "STUDENT" + (roster.total === 1 ? "" : "S")
        } · ALPHABETICAL`;

  return (
    <div className="mx-auto max-w-6xl px-6 md:px-12 py-12 md:py-16 flex flex-col gap-8">
      <CatalogHeader
        eyebrow="Roster"
        title="Students"
        overview={overview}
      />

      <StudentSearchBar
        initialQuery={q}
        basePath={BASE}
        searchParams={params}
      />

      <StudentsTable rows={roster.rows} />

      {roster.total > 0 && (
        <Paginator
          page={roster.page}
          pageSize={roster.pageSize || STUDENTS_PAGE_SIZE}
          total={roster.total}
          basePath={BASE}
          searchParams={params}
        />
      )}

      <p className="font-mono uppercase text-caps-sm text-slate/70 tracking-[0.08em] -mt-1">
        Click a student to see active loans + transaction history
      </p>
    </div>
  );
}
