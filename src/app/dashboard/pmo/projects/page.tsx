import Link from "next/link";
import { redirect } from "next/navigation";

import { DashboardPageHeader } from "@/app/dashboard/_components/page-header";
import {
  DELIVERABLES_PROJECT,
  PMO_ESCALATIONS_PROJECT,
  PMO_MEETINGS_PROJECT,
  PMO_TEAM,
  RISKS_PROJECT,
} from "@/lib/dashboard-paths";
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
import { getSessionUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { listProjectsForSession } from "@/lib/project-scope";
import { assertCanAccessProject } from "@/modules/memberships/project-access";
import { canManageProjectsCatalog } from "@/lib/rbac";
import { requireTenantId } from "@/lib/tenancy";
import { getProjectStatusBadge } from "@/lib/ui";
import {
  PlanLimitError,
  getTenantUsageSnapshot,
} from "@/modules/platform";
import {
  createProject,
  deleteProject,
  updateProject,
} from "@/modules/projects/service";

import { DeleteProjectForm } from "./delete-project-form";
import { EditProjectForm } from "./edit-project-form";

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

  async function createProjectAction(formData: FormData) {
    "use server";
    const s = await getSessionUser();
    if (!s?.activeTenantId) redirect("/login");
    if (!canManageProjectsCatalog(s.role)) {
      redirect("/dashboard/pmo/projects?error=No+tienes+permiso+para+crear+proyectos");
    }
    const name = String(formData.get("name") ?? "").trim();
    const description = String(formData.get("description") ?? "").trim();
    if (!name) {
      redirect("/dashboard/pmo/projects?error=El+nombre+del+proyecto+es+obligatorio");
    }
    try {
      await createProject({
        tenantId: s.activeTenantId,
        name,
        description,
        createdBy: s.userId,
      });
      redirect("/dashboard/pmo/projects?ok=Proyecto+creado");
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
    if (!projectId) {
      redirect("/dashboard/pmo/projects?error=Proyecto+invalido");
    }
    if (!name) {
      redirect("/dashboard/pmo/projects?error=El+nombre+es+obligatorio");
    }
    try {
      await updateProject({
        tenantId: s.activeTenantId,
        projectId,
        name,
        description,
        status,
      });
      redirect("/dashboard/pmo/projects?ok=Proyecto+actualizado");
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
    if (!projectId) {
      redirect("/dashboard/pmo/projects?error=Proyecto+invalido");
    }
    try {
      await deleteProject({
        tenantId: s.activeTenantId,
        projectId,
      });
      redirect("/dashboard/pmo/projects?ok=Proyecto+eliminado");
    } catch (e) {
      redirect(
        `/dashboard/pmo/projects?error=${encodeURIComponent(
          e instanceof Error ? e.message : "Error+al+eliminar",
        )}`,
      );
    }
  }

  const colCount = canManageCatalog ? 4 : 3;

  return (
    <main className={dashPage}>
      <DashboardPageHeader
        title="Proyectos"
        description={
          <>
            {tenant?.name ?? "—"}
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
            Plan {usage.plan}: {usage.projectCount}/{usage.limits.maxProjects} proyectos
          </p>
        ) : null}
        {params.error && <p className={`mt-2 ${dashAlertError}`}>{params.error}</p>}
        {params.ok && <p className={`mt-2 ${dashAlertOk}`}>{params.ok}</p>}
      </DashboardPageHeader>

      {canManageCatalog ? (
        <details className={`${dashCard} group`}>
          <summary className={dashDetailsSummary}>
            Nuevo proyecto
          </summary>
          <form action={createProjectAction} className={`grid gap-3 sm:grid-cols-2 ${dashDetailsBody}`}>
            <div className="sm:col-span-2">
              <label className={uiLabel}>Nombre</label>
              <input name="name" required maxLength={200} className={`mt-1 ${uiInput}`} />
            </div>
            <div className="sm:col-span-2">
              <label className={uiLabel}>Descripción (opcional)</label>
              <textarea
                name="description"
                rows={2}
                maxLength={2000}
                className={`mt-1 ${uiInput}`}
              />
            </div>
            <div className="sm:col-span-2">
              <button type="submit" className={uiButtonPrimary.replace("w-full ", "w-auto ")}>
                Crear proyecto
              </button>
            </div>
          </form>
        </details>
      ) : null}

      <section className={`${dashCard} overflow-hidden`}>
        <div className="overflow-x-auto p-4">
          <table className="pmo-table pmo-row-hover w-full min-w-[600px] text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs font-medium uppercase text-slate-500">
                <th className="py-2">Proyecto</th>
                <th className="py-2">Estado</th>
                <th className="py-2">Descripción</th>
                {canManageCatalog ? <th className="py-2 text-right">Acciones</th> : null}
              </tr>
            </thead>
            <tbody>
              {items.map((project) => {
                const statusBadge = getProjectStatusBadge(project.status);
                return (
                  <tr key={project.id} className="border-b border-slate-100">
                    <td className="py-2">
                      <Link
                        href={DELIVERABLES_PROJECT(project.id)}
                        className="font-medium text-slate-900 hover:underline"
                      >
                        {project.name}
                      </Link>
                      <div className="mt-1 flex flex-wrap gap-x-2 gap-y-0.5 text-[10px] text-slate-500">
                        <Link href={DELIVERABLES_PROJECT(project.id)} className="hover:text-slate-900 hover:underline">
                          Entregables
                        </Link>
                        <Link href={RISKS_PROJECT(project.id)} className="hover:text-slate-900 hover:underline">
                          Riesgos
                        </Link>
                        <Link href={PMO_ESCALATIONS_PROJECT(project.id)} className="hover:text-slate-900 hover:underline">
                          Escalamientos
                        </Link>
                        <Link href={PMO_MEETINGS_PROJECT(project.id)} className="hover:text-slate-900 hover:underline">
                          Reuniones
                        </Link>
                      </div>
                    </td>
                    <td className="py-2">
                      <span className={statusBadge.className}>{statusBadge.label}</span>
                    </td>
                    <td className="py-2 text-slate-600">
                      {project.description?.trim() ? project.description : "—"}
                    </td>
                    {canManageCatalog ? (
                      <td className="py-2 text-right align-top">
                        <div className="flex flex-col items-end gap-2">
                          <EditProjectForm
                            updateAction={updateProjectAction}
                            projectId={project.id}
                            initialName={project.name}
                            initialDescription={project.description}
                            initialStatus={project.status}
                          />
                          <DeleteProjectForm
                            deleteAction={deleteProjectAction}
                            projectId={project.id}
                            projectName={project.name}
                          />
                        </div>
                      </td>
                    ) : null}
                  </tr>
                );
              })}
              {items.length === 0 && (
                <tr>
                  <td colSpan={colCount} className="py-6 text-center text-slate-500">
                    Sin proyectos.
                    {canManageCatalog ? " Usa «Nuevo proyecto» arriba." : null}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
