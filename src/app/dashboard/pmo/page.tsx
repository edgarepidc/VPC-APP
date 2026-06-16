import { redirect } from "next/navigation";

import { dashPage } from "@/lib/ui-classes";
import { getSessionUser } from "@/lib/auth/session";
import { getProjectHierarchyForSession, getSessionProjectIdsFilter } from "@/lib/project-scope";
import { resolveProjectFilterIds } from "@/lib/project-hierarchy";
import { requireTenantId } from "@/lib/tenancy";
import { getCachedPmoSnapshot } from "@/modules/pmo/cached-snapshot";

import { buildPmoActionQueue } from "./pmo-action-utils";
import { PmoExecutiveManagerView } from "./pmo-executive-manager-view";

type PmoPageProps = {
  searchParams: Promise<{ project?: string; projectId?: string }>;
};

export default async function PmoPage({ searchParams }: PmoPageProps) {
  const params = await searchParams;
  const session = await getSessionUser();
  if (!session) redirect("/login");
  const tenantId = await requireTenantId();

  const projectIdsFilter = await getSessionProjectIdsFilter(session, tenantId);
  const hierarchy = await getProjectHierarchyForSession(session, tenantId);
  const initialProject = params.project ?? params.projectId ?? "";
  const resolvedFilter = resolveProjectFilterIds(hierarchy.projects, initialProject || null);

  let effectiveRestrict = projectIdsFilter;
  if (resolvedFilter) {
    effectiveRestrict = projectIdsFilter
      ? resolvedFilter.filter((id) => projectIdsFilter.includes(id))
      : resolvedFilter;
  }

  const snapshot = await getCachedPmoSnapshot(tenantId, {
    restrictToProjectIds: effectiveRestrict,
  });

  const actionItems = buildPmoActionQueue({
    overdueDeliverables: snapshot.overdueDeliverables,
    criticalRiskRows: snapshot.criticalRiskRows,
    stakeholderAlerts: snapshot.stakeholderAlerts,
    deteriorationAlerts: snapshot.deteriorationAlerts,
    meetingCostAlerts: snapshot.meetingCostAlerts,
  });

  return (
    <main className={dashPage}>
      <PmoExecutiveManagerView
        projectGroups={hierarchy.groups}
        projectHierarchy={hierarchy.projects}
        initialProject={initialProject}
        kpis={{
          projects: snapshot.kpis.projects,
          deliverables: snapshot.kpis.deliverables,
          overdueDeliverables: snapshot.kpis.overdueDeliverables,
          deliverableOnTimePct: snapshot.kpis.deliverableOnTimePct,
          risks: snapshot.kpis.risks,
          criticalRisks: snapshot.kpis.criticalRisks,
          escalationChecks: snapshot.kpis.escalationChecks,
          portfolioProgressPct: snapshot.kpis.portfolioProgressPct,
        }}
        escalationCounts={snapshot.escalationRadar.counts}
        meetingCounts={snapshot.meetingRoiRadar.counts}
        totalMeetingCostMxn={snapshot.meetingRoiRadar.totalCostMxn}
        actionItems={actionItems}
        projectHealth={snapshot.projectHealth}
      />
    </main>
  );
}
