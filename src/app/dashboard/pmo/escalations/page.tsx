import Link from "next/link";
import { redirect } from "next/navigation";

import { DashboardPageHeader } from "@/app/dashboard/_components/page-header";
import { ProjectHierarchyFilterSelect } from "@/app/dashboard/_components/project-hierarchy-filter-select";
import { EscalationHistoryList } from "@/app/dashboard/escalometro/escalation-history-list";
import { EscalationDeteriorationAlerts } from "@/app/dashboard/pmo/escalation-deterioration-alerts";
import { getSessionUser } from "@/lib/auth/session";
import { ESCALOMETRO_HUB } from "@/lib/dashboard-paths";
import { hasPermission } from "@/lib/rbac";
import { getProjectHierarchyForSession, getSessionProjectIdsFilter } from "@/lib/project-scope";
import { resolveProjectFilterIds } from "@/lib/project-hierarchy";
import { requireTenantId } from "@/lib/tenancy";
import { serializeEscalationChecks } from "@/lib/escalation-serialize";
import {
  dashCard,
  dashPage,
  uiInput,
  uiLabel,
} from "@/lib/ui-classes";
import {
  findGreenToRedDeteriorations,
  listEscalationChecksByTenant,
} from "@/modules/escalations/service";

export const dynamic = "force-dynamic";

type EscalationsPageProps = {
  searchParams: Promise<{ projectId?: string }>;
};

export default async function PmoEscalationsPage({ searchParams }: EscalationsPageProps) {
  const { projectId: filterProjectId = "" } = await searchParams;
  const session = await getSessionUser();
  if (!session) redirect("/login");
  const tenantId = await requireTenantId();
  const canCreateRisk = hasPermission(session.role, "tasks.write");
  const projectIdsFilter = await getSessionProjectIdsFilter(session, tenantId);
  const hierarchy = await getProjectHierarchyForSession(session, tenantId);
  const resolvedFilter = resolveProjectFilterIds(hierarchy.projects, filterProjectId || null);
  let effectiveRestrict = projectIdsFilter;
  if (resolvedFilter) {
    effectiveRestrict = projectIdsFilter
      ? resolvedFilter.filter((id) => projectIdsFilter.includes(id))
      : resolvedFilter;
  }

  const [checks, alerts] = await Promise.all([
    listEscalationChecksByTenant(tenantId, {
      restrictToProjectIds: effectiveRestrict,
      limit: 100,
    }),
    findGreenToRedDeteriorations(tenantId, {
      restrictToProjectIds: projectIdsFilter,
      withinDays: 7,
    }),
  ]);

  const rows = serializeEscalationChecks(checks);
  const alertRows = alerts.map((a) => ({
    projectId: a.projectId,
    projectName: a.projectName,
    previousAt: a.previousAt.toISOString(),
    currentAt: a.currentAt.toISOString(),
    topic: a.topic,
    title: a.title,
  }));

  return (
    <main className={dashPage}>
      <DashboardPageHeader
        title="Escalamientos"
        description="Historial completo de evaluaciones del Escalómetro por subproyecto."
      >
        <Link
          href={ESCALOMETRO_HUB}
          className="mt-2 inline-block text-sm font-medium text-slate-700 underline"
        >
          Abrir Escalómetro
        </Link>
      </DashboardPageHeader>

      <EscalationDeteriorationAlerts alerts={alertRows} />

      <section className={`${dashCard} p-4`}>
        <form method="get" className="flex flex-wrap items-end gap-2 border-b border-slate-200 pb-4">
          <label className="block">
            <span className={uiLabel}>Iniciativa / subproyecto</span>
            <ProjectHierarchyFilterSelect
              name="projectId"
              groups={hierarchy.groups}
              defaultValue={filterProjectId}
              allLabel="Todas las iniciativas"
              className={`${uiInput} mt-1 min-w-[220px]`}
            />
          </label>
          <button
            type="submit"
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Filtrar
          </button>
        </form>

        <p className="mt-3 text-sm text-slate-600">
          {rows.length} evaluación{rows.length !== 1 ? "es" : ""}
          {filterProjectId ? " en este alcance" : " en total"}
        </p>

        <ul className="mt-3 space-y-2">
          {rows.length > 0 ? (
            <EscalationHistoryList rows={rows} canCreateRisk={canCreateRisk} />
          ) : (
            <li className="rounded-lg border border-dashed border-slate-200 p-8 text-center text-sm text-slate-500">
              Sin evaluaciones registradas.
            </li>
          )}
        </ul>
      </section>
    </main>
  );
}
