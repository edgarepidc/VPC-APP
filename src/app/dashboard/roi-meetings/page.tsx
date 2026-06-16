import { redirect } from "next/navigation";

import { DashboardSectionShell } from "@/app/dashboard/_components/section-shell";
import { ProjectHierarchyFilterSelect } from "@/app/dashboard/_components/project-hierarchy-filter-select";
import { RoiMeetingsClient } from "@/app/dashboard/roi-meetings/roi-meetings-client";
import { RoiSessionHistoryList } from "@/app/dashboard/roi-meetings/roi-session-history-list";
import { getSessionUser } from "@/lib/auth/session";
import { canWriteWorkspaceData } from "@/lib/workspace-access";
import { getProjectHierarchyForSession, getSessionProjectIdsFilter } from "@/lib/project-scope";
import {
  initiativeNameFor,
  projectDisplayLabel,
  resolveProjectFilterIds,
  workScopeProjectIds,
} from "@/lib/project-hierarchy";
import { requireTenantId } from "@/lib/tenancy";
import { serializeMeetingRoiSessions } from "@/lib/meeting-roi-utils";
import { meetingRoiTableMissingMessage } from "@/lib/prisma-errors";
import {
  dashAlertWarn,
  dashPage,
  uiInput,
  uiLabel,
} from "@/lib/ui-classes";
import {
  isMeetingRoiStorageReady,
  listMeetingRoiSessionsByTenant,
} from "@/modules/meeting-roi/service";

export const dynamic = "force-dynamic";

type RoiMeetingsPageProps = {
  searchParams: Promise<{ projectId?: string }>;
};

export default async function RoiMeetingsPage({ searchParams }: RoiMeetingsPageProps) {
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

  const [recentSessions, storageReady] = await Promise.all([
    listMeetingRoiSessionsByTenant(tenantId, {
      restrictToProjectIds: effectiveRestrict,
      limit: 20,
    }),
    isMeetingRoiStorageReady(),
  ]);

  const historyRows = serializeMeetingRoiSessions(recentSessions);

  return (
    <main className={dashPage}>
      {!storageReady ? (
        <p className={`mb-4 ${dashAlertWarn}`} role="status">
          {meetingRoiTableMissingMessage()} Mientras tanto puedes usar la calculadora, pero los
          registros no se guardarán.
        </p>
      ) : null}

      <DashboardSectionShell eyebrow="ROI reuniones" title="Calculadora de costos" titleAs="h1">
        <RoiMeetingsClient projects={projects} projectGroups={hierarchy.groups} canSave={canSave} />
      </DashboardSectionShell>

      <DashboardSectionShell className="mt-8" eyebrow="Historial" title="Sesiones registradas">
        <div className="border-b border-slate-100 px-4 py-3 sm:px-5">
          <form method="get" className="flex w-full flex-wrap items-end gap-2">
            <label className="block min-w-0 flex-1 sm:flex-none">
              <span className={uiLabel}>Filtrar por iniciativa / subproyecto</span>
              <ProjectHierarchyFilterSelect
                name="projectId"
                groups={hierarchy.groups}
                defaultValue={filterProjectId}
                allLabel="Todas las iniciativas"
                className={`${uiInput} mt-1 w-full min-w-0 sm:min-w-[220px]`}
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
            <RoiSessionHistoryList rows={historyRows} canEdit={canSave} />
          ) : (
            <li className="rounded-lg border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500">
              {filterProjectId
                ? "No hay sesiones registradas para este alcance."
                : "Aún no hay sesiones registradas. Configura la calculadora y pulsa Registrar sesión."}
            </li>
          )}
        </ul>
      </DashboardSectionShell>
    </main>
  );
}
