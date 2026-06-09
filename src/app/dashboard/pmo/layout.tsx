import { redirect } from "next/navigation";

import { getSessionUser } from "@/lib/auth/session";
import { getSessionProjectIdsFilter } from "@/lib/project-scope";
import { requireTenantId } from "@/lib/tenancy";
import { getCachedPmoSnapshot } from "@/modules/pmo/cached-snapshot";

import { buildPmoActionQueue, buildPmoNavBadges } from "./pmo-action-utils";
import { PmoSubnav } from "./pmo-subnav";

export default async function PmoHubLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const session = await getSessionUser();
  if (!session) redirect("/login");
  const tenantId = await requireTenantId();
  const projectIdsFilter = await getSessionProjectIdsFilter(session, tenantId);

  const snapshot = await getCachedPmoSnapshot(tenantId, {
    restrictToProjectIds: projectIdsFilter,
  });

  const actionQueue = buildPmoActionQueue({
    overdueDeliverables: snapshot.overdueDeliverables,
    criticalRiskRows: snapshot.criticalRiskRows,
    stakeholderAlerts: snapshot.stakeholderAlerts,
    deteriorationAlerts: snapshot.deteriorationAlerts,
    meetingCostAlerts: snapshot.meetingCostAlerts,
  });

  const badges = buildPmoNavBadges({
    overdueDeliverablesCount: snapshot.kpis.overdueDeliverables,
    criticalRisksCount: snapshot.kpis.criticalRisks,
    deteriorationAlertsCount: snapshot.deteriorationAlerts.length,
    meetingCostAlertsCount: snapshot.meetingCostAlerts.length,
    stakeholderAlertsCount: snapshot.stakeholderAlertsCount,
    actionQueueCount: actionQueue.length,
  });

  return (
    <>
      <PmoSubnav badges={badges} />
      {children}
    </>
  );
}
