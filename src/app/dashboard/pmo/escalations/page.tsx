import { redirect } from "next/navigation";

import { DashboardPageHeader } from "@/app/dashboard/_components/page-header";
import { EscalationHistoryList } from "@/app/dashboard/escalometro/escalation-history-list";
import { EscalationDeteriorationAlerts } from "@/app/dashboard/pmo/escalation-deterioration-alerts";
import { getSessionUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/rbac";
import { getSessionProjectIdsFilter, listProjectsForSession } from "@/lib/project-scope";
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

  const [projects, checks, alerts] = await Promise.all([
    listProjectsForSession(session, tenantId),
    listEscalationChecksByTenant(tenantId, {
      restrictToProjectIds: projectIdsFilter,
      projectId: filterProjectId || undefined,
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
        description="Historial completo de evaluaciones del Escalómetro por proyecto."
      />

      <EscalationDeteriorationAlerts alerts={alertRows} />

      <section className={`${dashCard} p-4`}>
        <form method="get" className="flex flex-wrap items-end gap-2 border-b border-slate-200 pb-4">
          <label className="block">
            <span className={uiLabel}>Proyecto</span>
            <select
              name="projectId"
              defaultValue={filterProjectId}
              className={`${uiInput} mt-1 min-w-[220px]`}
            >
              <option value="">Todos</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
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
          {filterProjectId ? " en este proyecto" : " en total"}
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
