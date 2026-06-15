import { redirect } from "next/navigation";

import { ProjectHierarchyFilterSelect } from "@/app/dashboard/_components/project-hierarchy-filter-select";
import { MinuteHistoryList } from "@/app/dashboard/minutes/minute-history-list";
import { MinutesPrivacyNotice } from "@/app/dashboard/minutes/minutes-privacy-notice";
import { MinutesClient } from "@/app/dashboard/minutes/minutes-client";
import { MinutesSectionShell } from "@/app/dashboard/minutes/minutes-section-shell";
import { isMinuteAiConfigured } from "@/lib/ai/generate-minute";
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
import { dashAlertWarn, dashPage, uiInput, uiLabel } from "@/lib/ui-classes";
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

      <MinutesSectionShell
        className="mt-8"
        eyebrow="Historial"
        title="Minutas guardadas"
        subtitle="Consulta y abre minutas anteriores. El contenido se conserva en Markdown para copiarlo a Loop, Notion u otros editores."
        headerExtra={
          <form method="get" className="flex w-full flex-wrap items-end gap-2">
            <label className="block min-w-0 flex-1 sm:max-w-xs">
              <span className={uiLabel}>Filtrar por iniciativa / subproyecto</span>
              <ProjectHierarchyFilterSelect
                name="projectId"
                groups={hierarchy.groups}
                defaultValue={filterProjectId}
                allLabel="Todas las iniciativas"
                className={`${uiInput} mt-1 w-full sm:min-w-[220px]`}
              />
            </label>
            <button
              type="submit"
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50"
            >
              Filtrar
            </button>
          </form>
        }
      >
        <div className="p-4">
          <MinuteHistoryList rows={recentMinutes} />
        </div>
      </MinutesSectionShell>

      <MinutesPrivacyNotice />
    </main>
  );
}
