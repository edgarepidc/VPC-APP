import { redirect } from "next/navigation";

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
} from "@/modules/projects/service";

import { DeleteProjectForm } from "./delete-project-form";

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
    <main className="space-y-6">
      <section className="pmo-card p-6">
        <h1 className="pmo-title text-zinc-900">Proyectos</h1>
        <p className="mt-1 text-sm text-zinc-600">
          Organización:{" "}
          <span className="font-medium text-zinc-800">
            {tenant?.name ?? "—"}
          </span>
          {tenant?.slug ? (
            <span className="text-zinc-500"> ({tenant.slug})</span>
          ) : null}
        </p>
        {usage && (
          <p className="mt-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700">
            Plan <span className="font-semibold uppercase">{usage.plan}</span>:{" "}
            <span className="tabular-nums">
              {usage.projectCount}/{usage.limits.maxProjects}
            </span>{" "}
            proyectos usados.
          </p>
        )}

        {params.error && (
          <p className="mt-3 rounded-md border border-rose-200 bg-rose-50 p-2 text-sm text-rose-800">
            {params.error}
          </p>
        )}
        {params.ok && (
          <p className="mt-3 rounded-md border border-emerald-200 bg-emerald-50 p-2 text-sm text-emerald-800">
            {params.ok}
          </p>
        )}

        {canWrite && (
          <section className="mt-6 rounded-lg border border-zinc-200 bg-zinc-50/80 p-4">
            <h2 className="text-sm font-semibold text-zinc-900">
              Nuevo proyecto
            </h2>
            <form action={createProjectAction} className="mt-3 grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="text-xs font-medium text-zinc-600">Nombre</label>
                <input
                  name="name"
                  required
                  maxLength={200}
                  placeholder="Ej. Implementación PMO"
                  className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="text-xs font-medium text-zinc-600">
                  Descripción (opcional)
                </label>
                <textarea
                  name="description"
                  rows={2}
                  maxLength={2000}
                  placeholder="Objetivo o alcance breve"
                  className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
                />
              </div>
              <div className="sm:col-span-2">
                <button
                  type="submit"
                  className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
                >
                  Crear proyecto
                </button>
              </div>
            </form>
          </section>
        )}

        {!canWrite && (
          <p className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            Tu rol solo permite ver proyectos. Para crear o eliminar necesitas
            rol de manager o superior.
          </p>
        )}
      </section>

      <section className="pmo-card overflow-hidden p-0">
        <div className="overflow-x-auto p-6 pt-4">
          <h2 className="text-sm font-semibold text-zinc-800">Listado</h2>
          <table className="pmo-table pmo-row-hover mt-3 w-full min-w-[680px] text-sm">
            <thead>
              <tr className="border-b border-zinc-200 text-left text-zinc-500">
                <th>Proyecto</th>
                <th>Estado</th>
                <th>Descripción</th>
                {canWrite ? (
                  <th className="text-right">Acciones</th>
                ) : null}
              </tr>
            </thead>
            <tbody>
              {items.map((project) => {
                const statusBadge = getProjectStatusBadge(project.status);
                return (
                  <tr key={project.id}>
                    <td className="font-medium text-zinc-900">{project.name}</td>
                    <td>
                      <span className={statusBadge.className}>
                        {statusBadge.label}
                      </span>
                    </td>
                    <td className="text-zinc-600">
                      {project.description?.trim() ? project.description : "—"}
                    </td>
                    {canWrite ? (
                      <td className="text-right align-top">
                        <div className="flex justify-end">
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
                  <td
                    colSpan={colCount}
                    className="py-8 text-center text-zinc-500"
                  >
                    Aún no hay proyectos.{" "}
                    {canWrite
                      ? "Usa el formulario de arriba para crear el primero."
                      : "Pide a un administrador que cree proyectos."}
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
