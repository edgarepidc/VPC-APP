import Link from "next/link";
import { redirect } from "next/navigation";

import { getSessionUser } from "@/lib/auth/session";
import { PMO_STAKEHOLDERS } from "@/lib/dashboard-paths";
import { canWriteWorkspaceData } from "@/lib/workspace-access";
import { getProjectHierarchyForSession, getSessionProjectIdsFilter } from "@/lib/project-scope";
import {
  initiativeNameFor,
  projectDisplayLabel,
  workScopeProjectIds,
} from "@/lib/project-hierarchy";
import { assertCanAccessProject } from "@/modules/memberships/project-access";
import { requireTenantId } from "@/lib/tenancy";
import {
  createStakeholder,
  deleteStakeholder,
  listStakeholdersByTenant,
  updateStakeholder,
} from "@/modules/stakeholders/service";

import { DashboardPageHeader } from "@/app/dashboard/_components/page-header";
import { dashAlertError, dashAlertOk, dashPage } from "@/lib/ui-classes";

import { StakeholderManagerView } from "./stakeholder-manager-view";

type StakeholdersPageProps = {
  searchParams: Promise<{
    error?: string;
    ok?: string;
    id?: string;
    project?: string;
    projectId?: string;
    q?: string;
  }>;
};

function parseStakeholderForm(formData: FormData) {
  return {
    projectId: String(formData.get("projectId") ?? ""),
    name: String(formData.get("name") ?? "").trim(),
    role: String(formData.get("role") ?? "").trim(),
    influence: Math.max(0, Math.min(10, Number(formData.get("influence") ?? 5))),
    interest: Math.max(0, Math.min(10, Number(formData.get("interest") ?? 5))),
    observation: String(formData.get("observation") ?? "").trim(),
  };
}

export default async function StakeholdersPage({ searchParams }: StakeholdersPageProps) {
  const params = await searchParams;
  const session = await getSessionUser();
  if (!session) redirect("/login");
  const tenantId = await requireTenantId();
  const canEdit = canWriteWorkspaceData(session);

  const projectIdsFilter = await getSessionProjectIdsFilter(session, tenantId);

  const [hierarchy, stakeholders] = await Promise.all([
    getProjectHierarchyForSession(session, tenantId),
    listStakeholdersByTenant(tenantId, { restrictToProjectIds: projectIdsFilter }),
  ]);
  const { projects: hierarchyProjects, groups: projectGroups } = hierarchy;
  const workIds = new Set(workScopeProjectIds(hierarchyProjects));
  const projects = hierarchyProjects
    .filter((p) => workIds.has(p.id))
    .map((p) => ({
      id: p.id,
      name: projectDisplayLabel(p, initiativeNameFor(hierarchyProjects, p.id)),
    }));

  async function assertProjectAccess(projectId: string, tenantIdActive: string) {
    const current = await getSessionUser();
    if (!current?.activeTenantId) redirect("/login");
    try {
      await assertCanAccessProject({
        tenantId: tenantIdActive,
        userId: current.userId,
        role: current.role,
        projectId,
        isPlatformVisit: current.isPlatformVisit,
      });
    } catch (e) {
      redirect(
        `/dashboard/stakeholders?error=${encodeURIComponent((e as Error).message)}`,
      );
    }
  }

  async function createAction(formData: FormData) {
    "use server";
    const current = await getSessionUser();
    if (!current?.activeTenantId) redirect("/login");
    if (!canWriteWorkspaceData(current)) {
      redirect("/dashboard/stakeholders?error=No+tienes+permiso+para+crear+interesados");
    }

    const parsed = parseStakeholderForm(formData);
    if (!parsed.projectId || !parsed.name) {
      redirect("/dashboard/stakeholders?error=Subproyecto+y+nombre+son+obligatorios");
    }

    await assertProjectAccess(parsed.projectId, current.activeTenantId);

    await createStakeholder({
      tenantId: current.activeTenantId,
      ...parsed,
    });

    redirect("/dashboard/stakeholders?ok=Interesado+registrado");
  }

  async function updateAction(formData: FormData) {
    "use server";
    const current = await getSessionUser();
    if (!current?.activeTenantId) redirect("/login");
    if (!canWriteWorkspaceData(current)) {
      redirect("/dashboard/stakeholders?error=No+tienes+permiso+para+editar+interesados");
    }

    const stakeholderId = String(formData.get("stakeholderId") ?? "").trim();
    const parsed = parseStakeholderForm(formData);
    if (!stakeholderId || !parsed.projectId || !parsed.name) {
      redirect("/dashboard/stakeholders?error=Datos+incompletos+para+actualizar");
    }

    await assertProjectAccess(parsed.projectId, current.activeTenantId);

    const updated = await updateStakeholder({
      tenantId: current.activeTenantId,
      id: stakeholderId,
      ...parsed,
    });
    if (updated === 0) {
      redirect("/dashboard/stakeholders?error=Interesado+no+encontrado");
    }

    redirect(
      `/dashboard/stakeholders?id=${encodeURIComponent(stakeholderId)}&ok=Interesado+actualizado`,
    );
  }

  async function deleteAction(formData: FormData) {
    "use server";
    const current = await getSessionUser();
    if (!current?.activeTenantId) redirect("/login");
    if (!canWriteWorkspaceData(current)) {
      redirect("/dashboard/stakeholders?error=No+tienes+permiso+para+eliminar");
    }

    const stakeholderId = String(formData.get("stakeholderId") ?? "").trim();
    if (!stakeholderId) redirect("/dashboard/stakeholders?error=Interesado+invalido");

    await deleteStakeholder(current.activeTenantId, stakeholderId);
    redirect("/dashboard/stakeholders?ok=Interesado+eliminado");
  }

  const matrixItems = stakeholders.map((item) => ({
    id: item.id,
    name: item.name,
    role: item.role,
    influence: item.influence,
    interest: item.interest,
    observation: item.observation,
    projectId: item.projectId,
    projectName: projectDisplayLabel(
      hierarchyProjects.find((p) => p.id === item.projectId) ?? {
        id: item.projectId,
        name: item.project.name,
        parentProjectId: null,
      },
      initiativeNameFor(hierarchyProjects, item.projectId),
    ),
  }));

  const initialProject = params.project ?? params.projectId;

  return (
    <main className={dashPage}>
      <DashboardPageHeader
        title="Interesados"
        description="Matriz de poder e interés por subproyecto."
      >
        <Link
          href={PMO_STAKEHOLDERS}
          className="mt-2 inline-block text-sm font-medium text-slate-700 underline"
        >
          Ver resumen PMO de interesados
        </Link>
        {params.error && <p className={`mt-2 ${dashAlertError}`}>{params.error}</p>}
        {params.ok && <p className={`mt-2 ${dashAlertOk}`}>{params.ok}</p>}
      </DashboardPageHeader>

      <StakeholderManagerView
        stakeholders={matrixItems}
        projects={projects}
        projectGroups={projectGroups}
        projectHierarchy={hierarchyProjects}
        canEdit={canEdit}
        initial={{
          id: params.id,
          project: initialProject,
          q: params.q,
        }}
        createAction={createAction}
        updateAction={updateAction}
        deleteAction={deleteAction}
      />
    </main>
  );
}
