import Link from "next/link";
import { redirect } from "next/navigation";

import { DashboardPageHeader } from "@/app/dashboard/_components/page-header";
import { ProjectHierarchyFilterSelect } from "@/app/dashboard/_components/project-hierarchy-filter-select";
import { EscalometroClient } from "@/app/dashboard/escalometro/escalometro-client";
import { EscalationHistoryList } from "@/app/dashboard/escalometro/escalation-history-list";
import { getSessionUser } from "@/lib/auth/session";
import { PMO_ESCALATIONS } from "@/lib/dashboard-paths";
import { hasPermission } from "@/lib/rbac";
import { getProjectHierarchyForSession, getSessionProjectIdsFilter } from "@/lib/project-scope";
import {
  projectDisplayLabel,
  initiativeNameFor,
  resolveProjectFilterIds,
  workScopeProjectIds,
} from "@/lib/project-hierarchy";
import { requireTenantId } from "@/lib/tenancy";
import {
  dashAlertWarn,
  dashCard,
  dashPage,
  uiInput,
  uiLabel,
} from "@/lib/ui-classes";
import { serializeEscalationChecks } from "@/lib/escalation-serialize";
import { escalationTableMissingMessage } from "@/lib/prisma-errors";
import {
  isEscalationStorageReady,
  listEscalationChecksByTenant,
} from "@/modules/escalations/service";

export const dynamic = "force-dynamic";

type EscalometroPageProps = {
  searchParams: Promise<{ projectId?: string }>;
};

export default async function EscalometroPage({ searchParams }: EscalometroPageProps) {
  const { projectId: filterProjectId = "" } = await searchParams;
  const session = await getSessionUser();
  if (!session) redirect("/login");
  const tenantId = await requireTenantId();
  const canSave = hasPermission(session.role, "tasks.write");

  const projectIdsFilter = await getSessionProjectIdsFilter(session, tenantId);
  const hierarchy = await getProjectHierarchyForSession(session, tenantId);
  const resolvedFilter = resolveProjectFilterIds(hierarchy.projects, filterProjectId || null);
  let effectiveRestrict = projectIdsFilter;
  if (resolvedFilter) {
    effectiveRestrict = projectIdsFilter
      ? resolvedFilter.filter((id) => projectIdsFilter.includes(id))
      : resolvedFilter;
  }

  const workIds = new Set(workScopeProjectIds(hierarchy.projects));
  const projects = hierarchy.projects
    .filter((p) => workIds.has(p.id))
    .map((p) => ({
      id: p.id,
      name: projectDisplayLabel(p, initiativeNameFor(hierarchy.projects, p.id)),
    }));

  const [recentChecks, storageReady] = await Promise.all([
    listEscalationChecksByTenant(tenantId, {
      restrictToProjectIds: effectiveRestrict,
      limit: 20,
    }),
    isEscalationStorageReady(),
  ]);

  const historyRows = serializeEscalationChecks(recentChecks);

  return (
    <main className={dashPage}>
      <DashboardPageHeader
        title="Escalómetro"
        description="Evalúa el nivel de escalamiento en 6 dimensiones y registra el resultado por proyecto."
      >
        <Link
          href={PMO_ESCALATIONS}
          className="mt-2 inline-block text-sm font-medium text-slate-700 underline"
        >
          Ver resumen PMO de escalamientos
        </Link>
      </DashboardPageHeader>

      {!storageReady && (
        <p className={dashAlertWarn} role="status">
          {escalationTableMissingMessage()} Mientras tanto puedes usar la herramienta, pero los
          registros no se guardarán.
        </p>
      )}

      <EscalometroClient projects={projects} projectGroups={hierarchy.groups} canSave={canSave} />

      <section className={`${dashCard} p-4`}>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Registros recientes</h2>
            <span className="text-xs text-slate-500">
              Historial ligero — distinto al registro de riesgos
            </span>
          </div>
          <form method="get" className="flex flex-wrap items-end gap-2">
            <label className="block">
              <span className={uiLabel}>Filtrar por iniciativa / subproyecto</span>
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
        </div>
        <ul className="mt-3 space-y-2">
          {historyRows.length > 0 ? (
            <EscalationHistoryList rows={historyRows} canCreateRisk={canSave} />
          ) : (
            <li className="rounded-lg border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500">
              {filterProjectId
                ? "No hay evaluaciones para este proyecto."
                : "Aún no hay evaluaciones registradas. Completa el escalómetro y pulsa Evaluar."}
            </li>
          )}
        </ul>
      </section>
    </main>
  );
}
