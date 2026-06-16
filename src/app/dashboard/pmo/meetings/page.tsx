import { redirect } from "next/navigation";

import { DashboardSectionShell } from "@/app/dashboard/_components/section-shell";
import { ProjectHierarchyFilterSelect } from "@/app/dashboard/_components/project-hierarchy-filter-select";
import { RoiSessionHistoryList } from "@/app/dashboard/roi-meetings/roi-session-history-list";
import { MeetingCostAlerts } from "@/app/dashboard/pmo/meeting-cost-alerts";
import { getSessionUser } from "@/lib/auth/session";
import { canWriteWorkspaceData } from "@/lib/workspace-access";
import { getProjectHierarchyForSession, getSessionProjectIdsFilter } from "@/lib/project-scope";
import { resolveProjectFilterIds } from "@/lib/project-hierarchy";
import { requireTenantId } from "@/lib/tenancy";
import { serializeMeetingRoiSessions } from "@/lib/meeting-roi-utils";
import {
  dashCard,
  dashPage,
  uiInput,
  uiLabel,
} from "@/lib/ui-classes";
import {
  findMeetingCostAlerts,
  listMeetingRoiSessionsByTenant,
} from "@/modules/meeting-roi/service";

export const dynamic = "force-dynamic";

type PmoMeetingsPageProps = {
  searchParams: Promise<{ projectId?: string }>;
};

export default async function PmoMeetingsPage({ searchParams }: PmoMeetingsPageProps) {
  const { projectId: filterProjectId = "" } = await searchParams;
  const session = await getSessionUser();
  if (!session) redirect("/login");
  const tenantId = await requireTenantId();
  const canEdit = canWriteWorkspaceData(session);
  const projectIdsFilter = await getSessionProjectIdsFilter(session, tenantId);
  const hierarchy = await getProjectHierarchyForSession(session, tenantId);
  const resolvedFilter = resolveProjectFilterIds(hierarchy.projects, filterProjectId || null);
  let effectiveRestrict = projectIdsFilter;
  if (resolvedFilter) {
    effectiveRestrict = projectIdsFilter
      ? resolvedFilter.filter((id) => projectIdsFilter.includes(id))
      : resolvedFilter;
  }

  const [sessions, alerts] = await Promise.all([
    listMeetingRoiSessionsByTenant(tenantId, {
      restrictToProjectIds: effectiveRestrict,
      limit: 100,
    }),
    findMeetingCostAlerts(tenantId, {
      restrictToProjectIds: projectIdsFilter,
      withinDays: 7,
    }),
  ]);

  const rows = serializeMeetingRoiSessions(sessions);
  const alertRows = alerts.map((a) => ({
    projectId: a.projectId,
    projectName: a.projectName,
    sessionName: a.sessionName,
    costLevel: a.costLevel,
    totalCost: a.totalCost,
    diagnosisTitle: a.diagnosisTitle,
    createdAt: a.createdAt.toISOString(),
    alertType: a.alertType,
  }));

  const totalCost = rows.reduce((sum, row) => sum + row.totalCost, 0);

  return (
    <main className={dashPage}>
      <DashboardSectionShell eyebrow="PMO" title="Reuniones" titleAs="h1">
        <div className="space-y-4 p-4">
      <MeetingCostAlerts alerts={alertRows} />

      <section className={`${dashCard} p-4`}>
        <form method="get" className="flex flex-wrap items-end gap-2 border-b border-slate-200 pb-4">
          <label className="block min-w-0 flex-1 sm:flex-none">
            <span className={uiLabel}>Iniciativa / subproyecto</span>
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

        <p className="mt-3 text-sm text-slate-600">
          {rows.length} sesión{rows.length !== 1 ? "es" : ""}
          {filterProjectId ? " en este alcance" : " en total"}
          {rows.length > 0 && (
            <span className="text-slate-500">
              {" "}
              · inversión acumulada{" "}
              {totalCost.toLocaleString("es-MX", {
                style: "currency",
                currency: "MXN",
                maximumFractionDigits: 0,
              })}
            </span>
          )}
        </p>

        <ul className="mt-3 space-y-2">
          {rows.length > 0 ? (
            <RoiSessionHistoryList rows={rows} canEdit={canEdit} />
          ) : (
            <li className="rounded-lg border border-dashed border-slate-200 p-8 text-center text-sm text-slate-500">
              Sin sesiones registradas.
            </li>
          )}
        </ul>
      </section>
        </div>
      </DashboardSectionShell>
    </main>
  );
}
