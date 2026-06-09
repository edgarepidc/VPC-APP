import Link from "next/link";
import { redirect } from "next/navigation";

import { getSessionUser } from "@/lib/auth/session";
import { PMO_RISKS } from "@/lib/dashboard-paths";
import { hasPermission } from "@/lib/rbac";
import { getSessionProjectIdsFilter, listProjectsForSession } from "@/lib/project-scope";
import { assertCanAccessProject } from "@/modules/memberships/project-access";
import { requireTenantId } from "@/lib/tenancy";
import { createRisk, deleteRisk, listRisksByTenant } from "@/modules/risks/service";
import { listDeliverablesByTenant } from "@/modules/deliverables/service";

import { DashboardPageHeader } from "@/app/dashboard/_components/page-header";
import { dashAlertError, dashAlertOk, dashPage } from "@/lib/ui-classes";

import { parseRiskPrefillFromSearchParams } from "@/lib/escalation-risk-prefill";

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
  const canEdit = hasPermission(session.role, "tasks.write");
  const riskPrefill = parseRiskPrefillFromSearchParams(params);

  const projectIdsFilter = await getSessionProjectIdsFilter(session, tenantId);

  const [projects, deliverables, risks] = await Promise.all([
    listProjectsForSession(session, tenantId),
    listDeliverablesByTenant(tenantId, { restrictToProjectIds: projectIdsFilter }),
    listRisksByTenant(tenantId, { restrictToProjectIds: projectIdsFilter }),
  ]);

  async function createAction(formData: FormData) {
    "use server";
    const current = await getSessionUser();
    if (!current?.activeTenantId) redirect("/login");
    if (!hasPermission(current.role, "tasks.write")) {
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

  async function deleteAction(formData: FormData) {
    "use server";
    const current = await getSessionUser();
    if (!current?.activeTenantId) redirect("/login");
    if (!hasPermission(current.role, "tasks.write")) {
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
    project: r.project,
    deliverable: r.deliverable,
  }));

  return (
    <main className={dashPage}>
      <DashboardPageHeader
        title="Riesgos"
        description="Matriz, exposición y registro de riesgos."
      >
        <Link
          href={PMO_RISKS}
          className="mt-2 inline-block text-sm font-medium text-slate-700 underline"
        >
          Ver resumen PMO de riesgos
        </Link>
        {params.error && <p className={`mt-2 ${dashAlertError}`}>{params.error}</p>}
        {params.ok && <p className={`mt-2 ${dashAlertOk}`}>{params.ok}</p>}
      </DashboardPageHeader>

      <RiskManagerView
        risks={risksClient}
        projects={projects}
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
        deleteAction={deleteAction}
      />
    </main>
  );
}
