import { redirect } from "next/navigation";

import { DashboardSectionShell } from "@/app/dashboard/_components/section-shell";
import { ProjectHierarchyFilterSelect } from "@/app/dashboard/_components/project-hierarchy-filter-select";
import { EscalometroClient } from "@/app/dashboard/escalometro/escalometro-client";
import { EscalationHistoryList } from "@/app/dashboard/escalometro/escalation-history-list";
import { getSessionUser } from "@/lib/auth/session";
import { canWriteWorkspaceData } from "@/lib/workspace-access";
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
  const canSave = canWriteWorkspaceData(session);

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
      {!storageReady ? (
        <p className={`mb-4 ${dashAlertWarn}`} role="status">
          {escalationTableMissingMessage()} Mientras tanto puedes usar la herramienta, pero los
          registros no se guardarán.
        </p>
      ) : null}

      <DashboardSectionShell eyebrow="Escalómetro" title="Evaluación de escalamiento" titleAs="h1">
        <EscalometroClient projects={projects} projectGroups={hierarchy.groups} canSave={canSave} />
      </DashboardSectionShell>

      <DashboardSectionShell className="mt-8" eyebrow="Historial" title="Registros recientes">
        <div className="border-b border-slate-100 px-4 py-3 sm:px-5">
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
        <ul className="space-y-2 p-4">
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
      </DashboardSectionShell>
    </main>
  );
}
