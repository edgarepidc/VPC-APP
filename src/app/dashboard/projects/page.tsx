import { redirect } from "next/navigation";

import { DashboardPageHeader } from "@/app/dashboard/_components/page-header";
import {
  dashAlertError,
  dashAlertOk,
  dashAlertWarn,
  dashCard,
  dashPage,
  uiButtonPrimary,
  uiInput,
  uiLabel,
} from "@/lib/ui-classes";
import { getSessionUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { hasPermission } from "@/lib/rbac";
import { requireTenantId } from "@/lib/tenancy";
import { getProjectStatusBadge } from "@/lib/ui";
import {
  PlanLimitError,
  getTenantUsageSnapshot,
} from "@/modules/platform";
import {
  createProject,
  deleteProject,
  listProjectsByTenant,
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
  const canWrite = hasPermission(session.role, "projects.write");

  const [items, usage, tenant] = await Promise.all([
    listProjectsByTenant(tenantId),
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
    if (!hasPermission(s.role, "projects.write")) {
      redirect("/dashboard/projects?error=No+tienes+permiso+para+crear+proyectos");
    }
    const name = String(formData.get("name") ?? "").trim();
    const description = String(formData.get("description") ?? "").trim();
    if (!name) {
      redirect("/dashboard/projects?error=El+nombre+del+proyecto+es+obligatorio");
    }
    try {
      await createProject({
        tenantId: s.activeTenantId,
        name,
        description,
        createdBy: s.userId,
      });
      redirect("/dashboard/projects?ok=Proyecto+creado");
    } catch (e) {
      if (e instanceof PlanLimitError) {
        redirect(`/dashboard/projects?error=${encodeURIComponent(e.message)}`);
      }
      redirect(
        `/dashboard/projects?error=${encodeURIComponent(
          e instanceof Error ? e.message : "Error+al+crear",
        )}`,
      );
    }
  }

  async function updateProjectAction(formData: FormData) {
    "use server";
    const s = await getSessionUser();
    if (!s?.activeTenantId) redirect("/login");
    if (!hasPermission(s.role, "projects.write")) {
      redirect("/dashboard/projects?error=No+tienes+permiso+para+editar");
    }
    const projectId = String(formData.get("projectId") ?? "").trim();
    const name = String(formData.get("name") ?? "").trim();
    const description = String(formData.get("description") ?? "").trim();
    const status = String(formData.get("status") ?? "active");
    if (!projectId) {
      redirect("/dashboard/projects?error=Proyecto+invalido");
    }
    if (!name) {
      redirect("/dashboard/projects?error=El+nombre+es+obligatorio");
    }
    try {
      await updateProject({
        tenantId: s.activeTenantId,
        projectId,
        name,
        description,
        status,
      });
      redirect("/dashboard/projects?ok=Proyecto+actualizado");
    } catch (e) {
      redirect(
        `/dashboard/projects?error=${encodeURIComponent(
          e instanceof Error ? e.message : "Error+al+guardar",
        )}`,
      );
    }
  }

  async function deleteProjectAction(formData: FormData) {
    "use server";
    const s = await getSessionUser();
    if (!s?.activeTenantId) redirect("/login");
    if (!hasPermission(s.role, "projects.write")) {
      redirect("/dashboard/projects?error=No+tienes+permiso+para+eliminar");
    }
    const projectId = String(formData.get("projectId") ?? "").trim();
    if (!projectId) {
      redirect("/dashboard/projects?error=Proyecto+invalido");
    }
    try {
      await deleteProject({
        tenantId: s.activeTenantId,
        projectId,
      });
      redirect("/dashboard/projects?ok=Proyecto+eliminado");
    } catch (e) {
      redirect(
        `/dashboard/projects?error=${encodeURIComponent(
          e instanceof Error ? e.message : "Error+al+eliminar",
        )}`,
      );
    }
  }

  const colCount = canWrite ? 4 : 3;

  return (
    <main className={dashPage}>
      <DashboardPageHeader
        title="Proyectos"
        description={
          <>
            {tenant?.name ?? "—"}
            {tenant?.slug ? (
              <span className="text-slate-500"> ({tenant.slug})</span>
            ) : null}
          </>
        }
      >
        {usage ? (
          <p className="mt-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
            Plan {usage.plan}: {usage.projectCount}/{usage.limits.maxProjects} proyectos
          </p>
        ) : null}
        {params.error && <p className={`mt-2 ${dashAlertError}`}>{params.error}</p>}
        {params.ok && <p className={`mt-2 ${dashAlertOk}`}>{params.ok}</p>}
      </DashboardPageHeader>

      {canWrite ? (
        <details className={`${dashCard} group`}>
          <summary className="cursor-pointer list-none px-4 py-3 text-sm font-semibold text-slate-900 marker:content-none [&::-webkit-details-marker]:hidden">
            Nuevo proyecto
          </summary>
          <form action={createProjectAction} className="grid gap-3 border-t border-slate-200 px-4 py-4 sm:grid-cols-2">
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
      ) : (
        <p className={dashAlertWarn}>
          Tu rol solo permite ver proyectos. Necesitas rol de gestor o superior para crear o editar.
        </p>
      )}

      <section className={`${dashCard} overflow-hidden`}>
        <div className="overflow-x-auto p-4">
          <table className="pmo-table pmo-row-hover w-full min-w-[600px] text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs font-medium uppercase text-slate-500">
                <th className="py-2">Proyecto</th>
                <th className="py-2">Estado</th>
                <th className="py-2">Descripción</th>
                {canWrite ? <th className="py-2 text-right">Acciones</th> : null}
              </tr>
            </thead>
            <tbody>
              {items.map((project) => {
                const statusBadge = getProjectStatusBadge(project.status);
                return (
                  <tr key={project.id} className="border-b border-slate-100">
                    <td className="py-2 font-medium text-slate-900">{project.name}</td>
                    <td className="py-2">
                      <span className={statusBadge.className}>{statusBadge.label}</span>
                    </td>
                    <td className="py-2 text-slate-600">
                      {project.description?.trim() ? project.description : "—"}
                    </td>
                    {canWrite ? (
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
                    {canWrite ? " Usa «Nuevo proyecto» arriba." : null}
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
