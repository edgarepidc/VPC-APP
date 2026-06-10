import Link from "next/link";
import { Fragment } from "react";
import { redirect } from "next/navigation";

import { DashboardPageHeader } from "@/app/dashboard/_components/page-header";
import {
  DELIVERABLES_PROJECT,
  PMO_ESCALATIONS_PROJECT,
  PMO_MEETINGS_PROJECT,
  PMO_PROJECT_DETAIL,
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
import { buildProjectHierarchyGroups } from "@/lib/project-hierarchy";
import { getSessionUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { listProjectsForSession } from "@/lib/project-scope";
import { assertCanAccessProject } from "@/modules/memberships/project-access";
import { canManageProjectsCatalog } from "@/lib/rbac";
import { requireTenantId } from "@/lib/tenancy";
import { getProjectStatusBadge } from "@/lib/ui";
import { PlanLimitError, getTenantUsageSnapshot } from "@/modules/platform";
import {
  createInitiative,
  createSubproject,
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

  const colCount = canManageCatalog ? 4 : 3;

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

      <section className={`${dashCard} overflow-hidden`}>
        <div className="overflow-x-auto p-4">
          <table className="pmo-table pmo-row-hover w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs font-medium uppercase text-slate-500">
                <th className="py-2">Iniciativa / subproyecto</th>
                <th className="py-2">Estado</th>
                <th className="py-2">Descripción</th>
                {canManageCatalog ? <th className="py-2 text-right">Acciones</th> : null}
              </tr>
            </thead>
            <tbody>
              {groups.map((g) => {
                const initiative = items.find((p) => p.id === g.initiative.id);
                if (!initiative) return null;
                const initBadge = getProjectStatusBadge(initiative.status);
                const moduleLinks = (projectId: string) => (
                  <div className="mt-1 flex flex-wrap gap-x-2 gap-y-0.5 text-[10px] text-slate-500">
                    <Link href={DELIVERABLES_PROJECT(projectId)} className="hover:text-slate-900 hover:underline">
                      Entregables
                    </Link>
                    <Link href={RISKS_PROJECT(projectId)} className="hover:text-slate-900 hover:underline">
                      Riesgos
                    </Link>
                    <Link href={PMO_ESCALATIONS_PROJECT(projectId)} className="hover:text-slate-900 hover:underline">
                      Escalamientos
                    </Link>
                    <Link href={PMO_MEETINGS_PROJECT(projectId)} className="hover:text-slate-900 hover:underline">
                      Reuniones
                    </Link>
                  </div>
                );

                return (
                  <Fragment key={g.initiative.id}>
                    <tr key={g.initiative.id} className="border-b border-slate-100 bg-slate-50/80">
                      <td className="py-2.5">
                        <span className="mb-1 inline-block rounded bg-slate-200 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-600">
                          Iniciativa
                        </span>
                        <Link
                          href={PMO_PROJECT_DETAIL(g.initiative.id)}
                          className="block font-semibold text-slate-900 hover:underline"
                        >
                          {g.initiative.name}
                        </Link>
                        {g.subprojects.length === 0 ? moduleLinks(g.initiative.id) : null}
                      </td>
                      <td className="py-2.5">
                        <span className={initBadge.className}>{initBadge.label}</span>
                      </td>
                      <td className="py-2.5 text-slate-600">
                        {initiative.description?.trim() || "—"}
                      </td>
                      {canManageCatalog ? (
                        <td className="py-2.5 text-right align-top">
                          <div className="flex flex-col items-end gap-2">
                            <EditProjectForm
                              updateAction={updateProjectAction}
                              projectId={initiative.id}
                              initialName={initiative.name}
                              initialDescription={initiative.description}
                              initialStatus={initiative.status}
                            />
                            <DeleteProjectForm
                              deleteAction={deleteProjectAction}
                              projectId={initiative.id}
                              projectName={initiative.name}
                            />
                          </div>
                        </td>
                      ) : null}
                    </tr>
                    {g.subprojects.map((sp) => {
                      const sub = items.find((p) => p.id === sp.id);
                      if (!sub) return null;
                      const subBadge = getProjectStatusBadge(sub.status);
                      return (
                        <tr key={sp.id} className="border-b border-slate-100">
                          <td className="py-2 pl-8">
                            <span className="mb-1 inline-block rounded bg-sky-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-sky-800">
                              Subproyecto
                            </span>
                            <Link
                              href={PMO_PROJECT_DETAIL(sp.id)}
                              className="block font-medium text-slate-900 hover:underline"
                            >
                              {sp.name}
                            </Link>
                            {moduleLinks(sp.id)}
                          </td>
                          <td className="py-2">
                            <span className={subBadge.className}>{subBadge.label}</span>
                          </td>
                          <td className="py-2 text-slate-600">
                            {sub.description?.trim() || "—"}
                          </td>
                          {canManageCatalog ? (
                            <td className="py-2 text-right align-top">
                              <div className="flex flex-col items-end gap-2">
                                <EditProjectForm
                                  updateAction={updateProjectAction}
                                  projectId={sub.id}
                                  initialName={sub.name}
                                  initialDescription={sub.description}
                                  initialStatus={sub.status}
                                />
                                <DeleteProjectForm
                                  deleteAction={deleteProjectAction}
                                  projectId={sub.id}
                                  projectName={sub.name}
                                />
                              </div>
                            </td>
                          ) : null}
                        </tr>
                      );
                    })}
                    {canManageCatalog && g.subprojects.length >= 0 ? (
                      <tr key={`${g.initiative.id}-add-sub`} className="border-b border-slate-50">
                        <td colSpan={colCount} className="py-2 pl-8">
                          <details className="text-sm">
                            <summary className="cursor-pointer font-medium text-slate-600 hover:text-slate-900">
                              + Subproyecto en {g.initiative.name}
                            </summary>
                            <form
                              action={createSubprojectAction}
                              className="mt-2 grid max-w-lg gap-2 rounded-lg border border-slate-200 bg-white p-3"
                            >
                              <input type="hidden" name="parentProjectId" value={g.initiative.id} />
                              <div>
                                <label className={uiLabel}>Nombre del subproyecto</label>
                                <input name="name" required maxLength={200} className={`mt-1 ${uiInput}`} />
                              </div>
                              <div>
                                <label className={uiLabel}>Descripción</label>
                                <input name="description" maxLength={500} className={`mt-1 ${uiInput}`} />
                              </div>
                              <button type="submit" className={uiButtonPrimary.replace("w-full ", "w-auto !py-1.5 text-xs")}>
                                Crear subproyecto
                              </button>
                            </form>
                          </details>
                        </td>
                      </tr>
                    ) : null}
                  </Fragment>
                );
              })}
              {groups.length === 0 && (
                <tr>
                  <td colSpan={colCount} className="py-6 text-center text-slate-500">
                    Sin iniciativas.
                    {canManageCatalog ? " Usa «Nueva iniciativa» arriba." : null}
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
