import Link from "next/link";
import { redirect } from "next/navigation";

import { getSessionUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/rbac";
import { requireTenantId } from "@/lib/tenancy";
import { listProjectsByTenant } from "@/modules/projects/service";
import { createTask, listTasksByTenant } from "@/modules/tasks/service";

export const dynamic = "force-dynamic";

const TASK_STATUS_LABEL: Record<string, string> = {
  todo: "Por hacer",
  in_progress: "En curso",
  done: "Hecha",
};

type PageProps = {
  searchParams: Promise<{ ok?: string; error?: string }>;
};

export default async function TasksPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const session = await getSessionUser();
  if (!session) redirect("/login");

  const tenantId = await requireTenantId();
  const canWrite = hasPermission(session.role, "tasks.write");

  const [items, projects] = await Promise.all([
    listTasksByTenant(tenantId),
    listProjectsByTenant(tenantId),
  ]);

  async function createTaskAction(formData: FormData) {
    "use server";
    const s = await getSessionUser();
    if (!s?.activeTenantId) redirect("/login");
    if (!hasPermission(s.role, "tasks.write")) {
      redirect("/dashboard/tasks?error=No+tienes+permiso+para+crear+tareas");
    }
    const projectId = String(formData.get("projectId") ?? "").trim();
    const title = String(formData.get("title") ?? "").trim();
    if (!projectId || !title) {
      redirect("/dashboard/tasks?error=Proyecto+y+titulo+son+obligatorios");
    }
    try {
      await createTask({
        tenantId: s.activeTenantId,
        projectId,
        title,
      });
      redirect("/dashboard/tasks?ok=Tarea+creada");
    } catch (e) {
      redirect(
        `/dashboard/tasks?error=${encodeURIComponent(
          e instanceof Error ? e.message : "Error+al+crear",
        )}`,
      );
    }
  }

  const hasProjects = projects.length > 0;

  return (
    <main className="space-y-6">
      <section className="pmo-card p-6">
        <h1 className="pmo-title text-zinc-900">Tareas</h1>
        <p className="mt-1 text-sm text-zinc-600">
          Tareas del proyecto que elijas dentro de esta organización.
        </p>

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

        {canWrite && hasProjects && (
          <section className="mt-6 rounded-lg border border-zinc-200 bg-zinc-50/80 p-4">
            <h2 className="text-sm font-semibold text-zinc-900">Nueva tarea</h2>
            <form action={createTaskAction} className="mt-3 grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="text-xs font-medium text-zinc-600">Proyecto</label>
                <select
                  name="projectId"
                  required
                  defaultValue={projects[0]?.id}
                  className="mt-1 w-full max-w-md rounded-md border border-zinc-300 px-3 py-2 text-sm"
                >
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="text-xs font-medium text-zinc-600">Título</label>
                <input
                  name="title"
                  required
                  maxLength={500}
                  placeholder="Describe la tarea"
                  className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
                />
              </div>
              <div className="sm:col-span-2">
                <button
                  type="submit"
                  className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
                >
                  Crear tarea
                </button>
              </div>
            </form>
          </section>
        )}

        {canWrite && !hasProjects && (
          <p className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            No hay proyectos en esta organización.{" "}
            <Link href="/dashboard/projects" className="font-medium underline">
              Crea un proyecto
            </Link>{" "}
            para poder registrar tareas aquí.
          </p>
        )}

        {!canWrite && (
          <p className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            Tu rol solo permite ver tareas.
          </p>
        )}
      </section>

      <section className="pmo-card overflow-hidden p-0">
        <div className="overflow-x-auto p-6 pt-4">
          <h2 className="text-sm font-semibold text-zinc-800">Listado</h2>
          <table className="pmo-table pmo-row-hover mt-3 w-full min-w-[680px] text-sm">
            <thead>
              <tr className="border-b border-zinc-200 text-left text-zinc-500">
                <th>Tarea</th>
                <th>Estado</th>
                <th>Proyecto</th>
              </tr>
            </thead>
            <tbody>
              {items.map((task) => (
                <tr key={task.id}>
                  <td className="font-medium text-zinc-900">{task.title}</td>
                  <td>
                    <span className="pmo-badge">
                      {TASK_STATUS_LABEL[task.status] ?? task.status}
                    </span>
                  </td>
                  <td className="text-zinc-700">
                    <span className="font-medium text-zinc-900">
                      {task.project.name}
                    </span>
                  </td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr>
                  <td colSpan={3} className="py-8 text-center text-zinc-500">
                    {hasProjects
                      ? "Aún no hay tareas. Crea la primera con el formulario de arriba."
                      : "Sin proyectos no hay tareas que mostrar."}
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
