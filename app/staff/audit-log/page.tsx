import { CatalogHeader } from "@/components/catalog/CatalogHeader";
import { DateRangePicker } from "@/components/reports/DateRangePicker";
import { HeroStat } from "@/components/reports/HeroStat";
import { Paginator } from "@/components/reports/Paginator";
import type { ReportSearchParams } from "@/components/reports/report-url";
import { resolveRange } from "@/lib/reports/date-range";
import {
  AUDIT_ENTITY_TYPES,
  getActorLabelById,
  listAuditLog,
  type AuditEntityType,
} from "@/lib/supabase/queries/audit";
import { AuditActionFilter } from "@/components/audit/AuditActionFilter";
import { AuditActorFilter } from "@/components/audit/AuditActorFilter";
import { AuditEntityFilter } from "@/components/audit/AuditEntityFilter";
import { AuditLogTable } from "@/components/audit/AuditLogTable";

const BASE = "/staff/audit-log";

function parseEntity(v: string | undefined): AuditEntityType | null {
  if (!v) return null;
  return (AUDIT_ENTITY_TYPES as readonly string[]).includes(v)
    ? (v as AuditEntityType)
    : null;
}

function parseActions(v: string | undefined): string[] {
  if (!v) return [];
  return v
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

export default async function StaffAuditLogPage({
  searchParams,
}: {
  searchParams: Promise<{
    from?: string;
    to?: string;
    preset?: string;
    actor?: string;
    action?: string;
    entity?: string;
    page?: string;
    open?: string;
  }>;
}) {
  const sp = await searchParams;
  const range = resolveRange({
    preset: sp.preset,
    from: sp.from,
    to: sp.to,
  });
  const actorId = sp.actor && sp.actor.length > 0 ? sp.actor : undefined;
  const actions = parseActions(sp.action);
  const entity = parseEntity(sp.entity);
  const page = Math.max(1, Number.parseInt(sp.page ?? "1", 10) || 1);
  const openId = sp.open && sp.open.length > 0 ? sp.open : null;

  const params: ReportSearchParams = {
    from: sp.from,
    to: sp.to,
    preset: sp.preset,
    actor: sp.actor,
    action: sp.action,
    entity: sp.entity,
    page: sp.page,
    open: sp.open,
  };

  const [report, actor] = await Promise.all([
    listAuditLog({
      from: range.from,
      to: range.to,
      actorId,
      actionTypes: actions.length > 0 ? actions : undefined,
      entityType: entity ?? undefined,
      page,
    }),
    actorId ? getActorLabelById(actorId) : Promise.resolve(null),
  ]);

  return (
    <div className="mx-auto max-w-6xl px-6 md:px-12 py-12 md:py-16 flex flex-col gap-8">
      <CatalogHeader
        eyebrow="Trace"
        title="Audit log"
        overview={`${report.totals.events.toLocaleString()} EVENTS · ${range.from} → ${range.to}`}
      />

      <DateRangePicker
        basePath={BASE}
        searchParams={params}
        from={range.from}
        to={range.to}
        preset={range.preset}
      />

      <div className="grid grid-cols-3 gap-4 md:gap-6 bg-paper border-[1.5px] border-rule rounded p-5 md:p-6">
        <HeroStat
          label="Events"
          value={report.totals.events.toLocaleString()}
          size="md"
        />
        <HeroStat
          label="Actors"
          value={report.totals.actors.toLocaleString()}
          tone="active"
          size="md"
          caption={report.totals.actors === 1 ? "one person" : "people"}
        />
        <HeroStat
          label="System"
          value={report.totals.system.toLocaleString()}
          tone="default"
          size="md"
          caption="cron / scheduled"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-4 md:gap-6">
        <AuditActorFilter
          value={actor}
          basePath={BASE}
          searchParams={params}
        />
        <AuditActionFilter
          selected={actions}
          basePath={BASE}
          searchParams={params}
        />
      </div>

      <AuditEntityFilter
        selected={entity}
        basePath={BASE}
        searchParams={params}
      />

      <AuditLogTable
        rows={report.rows}
        openId={openId}
        basePath={BASE}
        searchParams={params}
      />

      <Paginator
        page={report.page}
        pageSize={report.pageSize}
        total={report.total}
        basePath={BASE}
        searchParams={params}
      />
    </div>
  );
}
