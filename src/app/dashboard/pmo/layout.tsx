import { redirect } from "next/navigation";

import { getSessionUser } from "@/lib/auth/session";
import { getProjectHierarchyForSession, getSessionProjectIdsFilter } from "@/lib/project-scope";
import { requireTenantId } from "@/lib/tenancy";
import { getCachedPmoSnapshot } from "@/modules/pmo/cached-snapshot";

import { buildPmoActionQueue } from "./pmo-action-utils";
import { PmoSubnav } from "./pmo-subnav";

export default async function PmoHubLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const session = await getSessionUser();
  if (!session) redirect("/login");
  const tenantId = await requireTenantId();
  const projectIdsFilter = await getSessionProjectIdsFilter(session, tenantId);

  const [hierarchy, snapshot] = await Promise.all([
    getProjectHierarchyForSession(session, tenantId),
    getCachedPmoSnapshot(tenantId, {
      restrictToProjectIds: projectIdsFilter,
    }),
  ]);

  const actionItems = buildPmoActionQueue({
    overdueDeliverables: snapshot.overdueDeliverables,
    criticalRiskRows: snapshot.criticalRiskRows,
    stakeholderAlerts: snapshot.stakeholderAlerts,
    deteriorationAlerts: snapshot.deteriorationAlerts,
    meetingCostAlerts: snapshot.meetingCostAlerts,
  });

  return (
    <>
      <PmoSubnav
        badgeSource={snapshot.navBadgeSource}
        actionItems={actionItems}
        projectHierarchy={hierarchy.projects}
      />
      {children}
    </>
  );
}
