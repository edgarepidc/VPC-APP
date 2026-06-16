import { redirect } from "next/navigation";

import { getSessionUser } from "@/lib/auth/session";
import { canWriteWorkspaceData } from "@/lib/workspace-access";
import { getProjectHierarchyForSession, getSessionProjectIdsFilter } from "@/lib/project-scope";
import {
  initiativeNameFor,
  projectDisplayLabel,
  workScopeProjectIds,
} from "@/lib/project-hierarchy";
import { assertCanAccessProject } from "@/modules/memberships/project-access";
import { requireTenantId } from "@/lib/tenancy";
import { createRisk, deleteRisk, getRiskById, listRisksByTenant, updateRisk } from "@/modules/risks/service";
import { listDeliverablesByTenant } from "@/modules/deliverables/service";
import { parseRiskPrefillFromSearchParams } from "@/lib/escalation-risk-prefill";
import { dashAlertError, dashAlertOk, dashPage } from "@/lib/ui-classes";

import { residualScore } from "./risk-utils";
import { RiskManagerView, type RiskClientRow } from "./risk-manager-view";

type RisksPageProps = {
  searchParams: Promise<{
    error?: string;
    ok?: string;
    id?: string;
    project?: string;
    q?: string;
    prefill?: string;
    projectId?: string;
    title?: string;
    category?: string;
    trigger?: string;
    mitigation?: string;
    probability?: string;
    residualProb?: string;
    impactAmount?: string;
  }>;
};

export default async function RisksPage({ searchParams }: RisksPageProps) {
  const params = await searchParams;
  const session = await getSessionUser();
  if (!session) redirect("/login");
  const tenantId = await requireTenantId();
  const canEdit = canWriteWorkspaceData(session);
  const riskPrefill = parseRiskPrefillFromSearchParams(params);

  const projectIdsFilter = await getSessionProjectIdsFilter(session, tenantId);

  const [hierarchy, deliverables, risks] = await Promise.all([
    getProjectHierarchyForSession(session, tenantId),
    listDeliverablesByTenant(tenantId, { restrictToProjectIds: projectIdsFilter }),
    listRisksByTenant(tenantId, { restrictToProjectIds: projectIdsFilter }),
  ]);
  const { projects: hierarchyProjects, groups: projectGroups } = hierarchy;
  const workIds = new Set(workScopeProjectIds(hierarchyProjects));
  const projects = hierarchyProjects
    .filter((p) => workIds.has(p.id))
    .map((p) => ({
      id: p.id,
      name: projectDisplayLabel(p, initiativeNameFor(hierarchyProjects, p.id)),
    }));

  async function createAction(formData: FormData) {
    "use server";
    const current = await getSessionUser();
    if (!current?.activeTenantId) redirect("/login");
    if (!canWriteWorkspaceData(current)) {
      redirect("/dashboard/risks?error=No+tienes+permiso+para+crear+riesgos");
    }

    const title = String(formData.get("title") ?? "").trim();
    const category = String(formData.get("category") ?? "Técnico").trim();
    const ownerName = String(formData.get("ownerName") ?? "").trim();
    const projectId = String(formData.get("projectId") ?? "");
    const deliverableId = String(formData.get("deliverableId") ?? "");
    const probability = Number(formData.get("probability") ?? 50);
    const residualProb = Number(formData.get("residualProb") ?? 20);
    const impactAmount = Number(formData.get("impactAmount") ?? 50000);
    const mitigation = String(formData.get("mitigation") ?? "").trim();
    const contingency = String(formData.get("contingency") ?? "").trim();
    const trigger = String(formData.get("trigger") ?? "").trim();
    const dueDateRaw = String(formData.get("dueDate") ?? "");

    if (!title || !ownerName || !projectId) {
      redirect("/dashboard/risks?error=Proyecto,+descripcion+y+owner+son+obligatorios");
    }

    try {
      await assertCanAccessProject({
        tenantId: current.activeTenantId,
        userId: current.userId,
        role: current.role,
        projectId,
        isPlatformVisit: current.isPlatformVisit,
      });
    } catch (e) {
      redirect(`/dashboard/risks?error=${encodeURIComponent((e as Error).message)}`);
    }

    await createRisk({
      tenantId: current.activeTenantId,
      projectId,
      deliverableId: deliverableId || undefined,
      title,
      category,
      ownerName,
      probability: Math.max(1, Math.min(100, probability)),
      residualProb: Math.max(1, Math.min(100, residualProb)),
      impactAmount: Math.max(0, impactAmount),
      mitigation,
      contingency,
      trigger,
      dueDate: dueDateRaw ? new Date(`${dueDateRaw}T00:00:00`) : undefined,
    });

    redirect("/dashboard/risks?ok=Riesgo+registrado");
  }

  async function updateAction(formData: FormData) {
    "use server";
    const current = await getSessionUser();
    if (!current?.activeTenantId) redirect("/login");
    if (!canWriteWorkspaceData(current)) {
      redirect("/dashboard/risks?error=No+tienes+permiso+para+editar+riesgos");
    }

    const riskId = String(formData.get("riskId") ?? "").trim();
    const ownerName = String(formData.get("ownerName") ?? "").trim();
    const residualProb = Number(formData.get("residualProb") ?? 20);
    const mitigation = String(formData.get("mitigation") ?? "").trim();
    const contingency = String(formData.get("contingency") ?? "").trim();
    const trigger = String(formData.get("trigger") ?? "").trim();
    const dueDateRaw = String(formData.get("dueDate") ?? "").trim();

    if (!riskId || !ownerName) {
      redirect("/dashboard/risks?error=Datos+incompletos+para+actualizar");
    }

    const existing = await getRiskById(current.activeTenantId, riskId);
    if (!existing) {
      redirect("/dashboard/risks?error=Riesgo+no+encontrado");
    }

    try {
      await assertCanAccessProject({
        tenantId: current.activeTenantId,
        userId: current.userId,
        role: current.role,
        projectId: existing.projectId,
        isPlatformVisit: current.isPlatformVisit,
      });
    } catch (e) {
      redirect(`/dashboard/risks?error=${encodeURIComponent((e as Error).message)}`);
    }

    if (
      residualScore(residualProb, existing.impactAmount) > 10 &&
      !contingency
    ) {
      redirect(
        `/dashboard/risks?id=${encodeURIComponent(riskId)}&error=Contingencia+obligatoria+con+score+residual+%3E+10`,
      );
    }

    const updated = await updateRisk({
      tenantId: current.activeTenantId,
      id: riskId,
      ownerName,
      residualProb,
      mitigation,
      contingency,
      trigger,
      dueDate: dueDateRaw ? new Date(`${dueDateRaw}T00:00:00`) : null,
    });

    if (updated === 0) {
      redirect("/dashboard/risks?error=Riesgo+no+encontrado");
    }

    redirect(
      `/dashboard/risks?id=${encodeURIComponent(riskId)}&ok=Riesgo+actualizado`,
    );
  }

  async function deleteAction(formData: FormData) {
    "use server";
    const current = await getSessionUser();
    if (!current?.activeTenantId) redirect("/login");
    if (!canWriteWorkspaceData(current)) {
      redirect("/dashboard/risks?error=No+tienes+permiso+para+eliminar");
    }
    const riskId = String(formData.get("riskId") ?? "").trim();
    if (!riskId) redirect("/dashboard/risks?error=Riesgo+invalido");
    await deleteRisk(current.activeTenantId, riskId);
    redirect("/dashboard/risks?ok=Riesgo+eliminado");
  }

  const risksClient: RiskClientRow[] = risks.map((r) => ({
    id: r.id,
    title: r.title,
    category: r.category,
    ownerName: r.ownerName,
    probability: r.probability,
    residualProb: r.residualProb,
    impactAmount: r.impactAmount,
    mitigation: r.mitigation,
    contingency: r.contingency,
    trigger: r.trigger,
    dueDate: r.dueDate ? r.dueDate.toISOString() : null,
    project: {
      id: r.project.id,
      name: projectDisplayLabel(
        {
          id: r.project.id,
          name: r.project.name,
          parentProjectId:
            hierarchyProjects.find((p) => p.id === r.project.id)?.parentProjectId ?? null,
        },
        initiativeNameFor(hierarchyProjects, r.project.id),
      ),
    },
    deliverable: r.deliverable,
  }));

  return (
    <main className={dashPage}>
      {params.error ? (
        <p className={`mx-auto mb-4 max-w-[1600px] px-4 ${dashAlertError}`}>{params.error}</p>
      ) : null}
      {params.ok ? (
        <p className={`mx-auto mb-4 max-w-[1600px] px-4 ${dashAlertOk}`}>{params.ok}</p>
      ) : null}
      <RiskManagerView
            risks={risksClient}
            projects={projects}
            projectGroups={projectGroups}
            projectHierarchy={hierarchyProjects}
            deliverables={deliverables.map((d) => ({
              id: d.id,
              title: d.title,
              projectId: d.projectId,
            }))}
            canEdit={canEdit}
            prefill={riskPrefill}
            initial={{
              id: params.id,
              project: params.project,
              q: params.q,
            }}
            createAction={createAction}
            updateAction={updateAction}
            deleteAction={deleteAction}
      />
    </main>
  );
}
