import { redirect } from "next/navigation";

import { PmoEscalationsManagerView } from "@/app/dashboard/pmo/pmo-escalations-manager-view";
import { getSessionUser } from "@/lib/auth/session";
import { canWriteWorkspaceData } from "@/lib/workspace-access";
import { getProjectHierarchyForSession, getSessionProjectIdsFilter } from "@/lib/project-scope";
import { requireTenantId } from "@/lib/tenancy";
import { serializeEscalationChecks } from "@/lib/escalation-serialize";
import { dashPage } from "@/lib/ui-classes";
import {
  findGreenToRedDeteriorations,
  listEscalationChecksByTenant,
} from "@/modules/escalations/service";

export const dynamic = "force-dynamic";

type EscalationsPageProps = {
  searchParams: Promise<{
    id?: string;
    project?: string;
    projectId?: string;
    q?: string;
    tier?: string;
  }>;
};

export default async function PmoEscalationsPage({ searchParams }: EscalationsPageProps) {
  const params = await searchParams;
  const session = await getSessionUser();
  if (!session) redirect("/login");
  const tenantId = await requireTenantId();
  const canCreateRisk = canWriteWorkspaceData(session);
  const projectIdsFilter = await getSessionProjectIdsFilter(session, tenantId);
  const hierarchy = await getProjectHierarchyForSession(session, tenantId);

  const [checks, alerts] = await Promise.all([
    listEscalationChecksByTenant(tenantId, {
      restrictToProjectIds: projectIdsFilter,
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
  const initialProject = params.project ?? params.projectId;

  return (
    <main className={dashPage}>
      <PmoEscalationsManagerView
        projectGroups={hierarchy.groups}
        projectHierarchy={hierarchy.projects}
        historyRows={rows}
        deteriorationAlerts={alertRows}
        canCreateRisk={canCreateRisk}
        initial={{
          id: params.id,
          project: initialProject,
          q: params.q,
          tier: params.tier,
        }}
      />
    </main>
  );
}
