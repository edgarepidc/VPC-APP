import Link from "next/link";
import { redirect } from "next/navigation";

import { DashboardPageHeader } from "@/app/dashboard/_components/page-header";
import { PMO_TEAM } from "@/lib/dashboard-paths";
import {
  dashAlertError,
  dashAlertOk,
  dashCard,
  dashDetailsBody,
  dashDetailsSummary,
  dashPage,
  uiButtonPrimary,
  uiInput,
  uiLabel,
} from "@/lib/ui-classes";
import { buildProjectHierarchyGroups } from "@/lib/project-hierarchy";
import { getSessionUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { listProjectsForSession } from "@/lib/project-scope";
import { assertCanAccessProject } from "@/modules/memberships/project-access";
import { canManageProjectsCatalog } from "@/lib/rbac";
import { requireTenantId } from "@/lib/tenancy";
import { PlanLimitError, getTenantUsageSnapshot } from "@/modules/platform";
import {
  createInitiative,
  createSubproject,
  deleteProject,
  updateProject,
} from "@/modules/projects/service";

import { ProjectHierarchyCards } from "./project-hierarchy-cards";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<{ ok?: string; error?: string }>;
};

export default async function ProjectsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const session = await getSessionUser();
  if (!session) redirect("/login");

  const tenantId = await requireTenantId();
  const canManageCatalog = canManageProjectsCatalog(session.role);

  const [items, usage, tenant] = await Promise.all([
    listProjectsForSession(session, tenantId),
    getTenantUsageSnapshot(tenantId),
    db.tenant.findUnique({
      where: { id: tenantId },
      select: { name: true, slug: true },
    }),
  ]);

  const groups = buildProjectHierarchyGroups(
    items.map((p) => ({
      id: p.id,
      name: p.name,
      parentProjectId: p.parentProjectId,
      sortOrder: p.sortOrder,
      status: p.status,
    })),
  );

  async function createInitiativeAction(formData: FormData) {
    "use server";
    const s = await getSessionUser();
    if (!s?.activeTenantId) redirect("/login");
    if (!canManageProjectsCatalog(s.role)) {
      redirect("/dashboard/pmo/projects?error=No+tienes+permiso+para+crear+iniciativas");
    }
    const name = String(formData.get("name") ?? "").trim();
    const description = String(formData.get("description") ?? "").trim();
    if (!name) {
      redirect("/dashboard/pmo/projects?error=El+nombre+de+la+iniciativa+es+obligatorio");
    }
    try {
      await createInitiative({
        tenantId: s.activeTenantId,
        name,
        description,
        createdBy: s.userId,
      });
      redirect("/dashboard/pmo/projects?ok=Iniciativa+creada");
    } catch (e) {
      if (e instanceof PlanLimitError) {
        redirect(`/dashboard/pmo/projects?error=${encodeURIComponent(e.message)}`);
      }
      redirect(
        `/dashboard/pmo/projects?error=${encodeURIComponent(
          e instanceof Error ? e.message : "Error+al+crear",
        )}`,
      );
    }
  }

  async function createSubprojectAction(formData: FormData) {
    "use server";
    const s = await getSessionUser();
    if (!s?.activeTenantId) redirect("/login");
    if (!canManageProjectsCatalog(s.role)) {
      redirect("/dashboard/pmo/projects?error=No+tienes+permiso");
    }
    const parentProjectId = String(formData.get("parentProjectId") ?? "").trim();
    const name = String(formData.get("name") ?? "").trim();
    const description = String(formData.get("description") ?? "").trim();
    if (!parentProjectId || !name) {
      redirect("/dashboard/pmo/projects?error=Datos+invalidos");
    }
    try {
      await createSubproject({
        tenantId: s.activeTenantId,
        parentProjectId,
        name,
        description,
        createdBy: s.userId,
      });
      redirect("/dashboard/pmo/projects?ok=Subproyecto+creado");
    } catch (e) {
      redirect(
        `/dashboard/pmo/projects?error=${encodeURIComponent(
          e instanceof Error ? e.message : "Error+al+crear+subproyecto",
        )}`,
      );
    }
  }

  async function updateProjectAction(formData: FormData) {
    "use server";
    const s = await getSessionUser();
    if (!s?.activeTenantId) redirect("/login");
    if (!canManageProjectsCatalog(s.role)) {
      redirect("/dashboard/pmo/projects?error=No+tienes+permiso+para+editar");
    }
    const projectId = String(formData.get("projectId") ?? "").trim();
    try {
      await assertCanAccessProject({
        tenantId: s.activeTenantId,
        userId: s.userId,
        role: s.role,
        projectId,
        isPlatformVisit: s.isPlatformVisit,
      });
    } catch (e) {
      redirect(
        `/dashboard/pmo/projects?error=${encodeURIComponent((e as Error).message)}`,
      );
    }
    const name = String(formData.get("name") ?? "").trim();
    const description = String(formData.get("description") ?? "").trim();
    const status = String(formData.get("status") ?? "active");
    if (!projectId || !name) {
      redirect("/dashboard/pmo/projects?error=Datos+invalidos");
    }
    try {
      await updateProject({
        tenantId: s.activeTenantId,
        projectId,
        name,
        description,
        status,
      });
      redirect("/dashboard/pmo/projects?ok=Guardado");
    } catch (e) {
      redirect(
        `/dashboard/pmo/projects?error=${encodeURIComponent(
          e instanceof Error ? e.message : "Error+al+guardar",
        )}`,
      );
    }
  }

  async function deleteProjectAction(formData: FormData) {
    "use server";
    const s = await getSessionUser();
    if (!s?.activeTenantId) redirect("/login");
    if (!canManageProjectsCatalog(s.role)) {
      redirect("/dashboard/pmo/projects?error=No+tienes+permiso+para+eliminar");
    }
    const projectId = String(formData.get("projectId") ?? "").trim();
    if (!projectId) redirect("/dashboard/pmo/projects?error=Invalido");
    try {
      await deleteProject({ tenantId: s.activeTenantId, projectId });
      redirect("/dashboard/pmo/projects?ok=Eliminado");
    } catch (e) {
      redirect(
        `/dashboard/pmo/projects?error=${encodeURIComponent(
          e instanceof Error ? e.message : "Error+al+eliminar",
        )}`,
      );
    }
  }

  return (
    <main className={dashPage}>
      <DashboardPageHeader
        title="Iniciativas y subproyectos"
        description={
          <>
            Las <strong>iniciativas</strong> agrupan el portafolio; los{" "}
            <strong>subproyectos</strong> son donde el equipo registra entregables, riesgos y
            tareas. {tenant?.name ?? "—"}
          </>
        }
      >
        <Link
          href={PMO_TEAM}
          className="mt-2 inline-block text-sm font-medium text-slate-700 underline"
        >
          Gestionar equipo y accesos
        </Link>
        {usage ? (
          <p className="mt-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
            Plan {usage.plan}: {usage.projectCount}/{usage.limits.maxProjects} iniciativas
          </p>
        ) : null}
        {params.error && <p className={`mt-2 ${dashAlertError}`}>{params.error}</p>}
        {params.ok && <p className={`mt-2 ${dashAlertOk}`}>{params.ok}</p>}
      </DashboardPageHeader>

      {canManageCatalog ? (
        <details className={`${dashCard} group`}>
          <summary className={dashDetailsSummary}>Nueva iniciativa</summary>
          <form action={createInitiativeAction} className={`grid gap-3 sm:grid-cols-2 ${dashDetailsBody}`}>
            <div className="sm:col-span-2">
              <label className={uiLabel}>Nombre de la iniciativa</label>
              <input name="name" required maxLength={200} className={`mt-1 ${uiInput}`} />
            </div>
            <div className="sm:col-span-2">
              <label className={uiLabel}>Descripción (opcional)</label>
              <textarea name="description" rows={2} maxLength={2000} className={`mt-1 ${uiInput}`} />
            </div>
            <div className="sm:col-span-2">
              <button type="submit" className={uiButtonPrimary.replace("w-full ", "w-auto ")}>
                Crear iniciativa
              </button>
            </div>
          </form>
        </details>
      ) : null}

      <section className={`${dashCard} p-4 sm:p-5`}>
        <ProjectHierarchyCards
          groups={groups}
          items={items.map((p) => ({
            id: p.id,
            name: p.name,
            description: p.description,
            status: p.status,
            parentProjectId: p.parentProjectId,
          }))}
          canManageCatalog={canManageCatalog}
          createSubprojectAction={createSubprojectAction}
          updateProjectAction={updateProjectAction}
          deleteProjectAction={deleteProjectAction}
        />
      </section>
    </main>
  );
}
