import Link from "next/link";
import { redirect } from "next/navigation";

import { DashboardPageHeader } from "@/app/dashboard/_components/page-header";
import { ProjectHierarchyFilterSelect } from "@/app/dashboard/_components/project-hierarchy-filter-select";
import { MinuteHistoryList } from "@/app/dashboard/minutes/minute-history-list";
import { MinutesClient } from "@/app/dashboard/minutes/minutes-client";
import { isMinuteAiConfigured } from "@/lib/ai/generate-minute";
import { PMO_HUB } from "@/lib/dashboard-paths";
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
import { meetingMinuteTableMissingMessage } from "@/lib/prisma-errors";
import { dashAlertWarn, dashCard, dashPage, uiInput, uiLabel } from "@/lib/ui-classes";
import {
  isMeetingMinuteStorageReady,
  listMeetingMinutesByTenant,
} from "@/modules/meeting-minutes/service";

export const dynamic = "force-dynamic";

type MinutesPageProps = {
  searchParams: Promise<{ projectId?: string }>;
};

export default async function MinutesPage({ searchParams }: MinutesPageProps) {
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

  const [recentMinutes, storageReady] = await Promise.all([
    listMeetingMinutesByTenant(tenantId, {
      restrictToProjectIds: effectiveRestrict,
      limit: 30,
    }),
    isMeetingMinuteStorageReady(),
  ]);

  const aiAvailable = isMinuteAiConfigured();

  return (
    <main className={dashPage}>
      <DashboardPageHeader
        title="Minutas"
        description="Genera minutas estructuradas a partir de la transcripción de tus reuniones. Solo se guarda el resultado final."
      >
        <Link
          href={PMO_HUB}
          className="text-sm font-medium text-slate-600 underline hover:text-slate-900"
        >
          Volver al PMO
        </Link>
      </DashboardPageHeader>

      {!storageReady ? (
        <p className={`mb-4 ${dashAlertWarn}`} role="status">
          {meetingMinuteTableMissingMessage()}
        </p>
      ) : null}

      <MinutesClient
        projects={projects}
        projectGroups={hierarchy.groups}
        canSave={canSave && storageReady}
        aiAvailable={aiAvailable}
      />

      <section className={`mt-8 ${dashCard} p-4`}>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Minutas guardadas</h2>
            <span className="text-xs text-slate-500">Historial por subproyecto</span>
          </div>
          <form method="get" className="flex w-full flex-wrap items-end gap-2 sm:w-auto">
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
        <div className="mt-4">
          <MinuteHistoryList rows={recentMinutes} />
        </div>
      </section>
    </main>
  );
}
