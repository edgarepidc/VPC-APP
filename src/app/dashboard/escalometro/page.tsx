import { redirect } from "next/navigation";

import { EscalometroManagerView } from "@/app/dashboard/escalometro/escalometro-manager-view";
import { getSessionUser } from "@/lib/auth/session";
import { canWriteWorkspaceData } from "@/lib/workspace-access";
import { getProjectHierarchyForSession, getSessionProjectIdsFilter } from "@/lib/project-scope";
import {
  projectDisplayLabel,
  initiativeNameFor,
  workScopeProjectIds,
} from "@/lib/project-hierarchy";
import { requireTenantId } from "@/lib/tenancy";
import { dashAlertWarn, dashPage } from "@/lib/ui-classes";
import { serializeEscalationChecks } from "@/lib/escalation-serialize";
import { escalationTableMissingMessage } from "@/lib/prisma-errors";
import {
  isEscalationStorageReady,
  listEscalationChecksByTenant,
} from "@/modules/escalations/service";

export const dynamic = "force-dynamic";

type EscalometroPageProps = {
  searchParams: Promise<{
    project?: string;
    projectId?: string;
    q?: string;
    tier?: string;
  }>;
};

export default async function EscalometroPage({ searchParams }: EscalometroPageProps) {
  const params = await searchParams;
  const session = await getSessionUser();
  if (!session) redirect("/login");
  const tenantId = await requireTenantId();
  const canSave = canWriteWorkspaceData(session);

  const projectIdsFilter = await getSessionProjectIdsFilter(session, tenantId);
  const hierarchy = await getProjectHierarchyForSession(session, tenantId);

  const workIds = new Set(workScopeProjectIds(hierarchy.projects));
  const projects = hierarchy.projects
    .filter((p) => workIds.has(p.id))
    .map((p) => ({
      id: p.id,
      name: projectDisplayLabel(p, initiativeNameFor(hierarchy.projects, p.id)),
    }));

  const [recentChecks, storageReady] = await Promise.all([
    listEscalationChecksByTenant(tenantId, {
      restrictToProjectIds: projectIdsFilter,
      limit: 50,
    }),
    isEscalationStorageReady(),
  ]);

  const historyRows = serializeEscalationChecks(recentChecks);
  const initialProject = params.project ?? params.projectId;

  return (
    <main className={dashPage}>
      {!storageReady ? (
        <p className={`mb-4 ${dashAlertWarn}`} role="status">
          {escalationTableMissingMessage()} Mientras tanto puedes usar la herramienta, pero los
          registros no se guardarán.
        </p>
      ) : null}

      <EscalometroManagerView
        projects={projects}
        projectGroups={hierarchy.groups}
        projectHierarchy={hierarchy.projects}
        historyRows={historyRows}
        canSave={canSave}
        initial={{
          project: initialProject,
          q: params.q,
          tier: params.tier,
        }}
      />
    </main>
  );
}
