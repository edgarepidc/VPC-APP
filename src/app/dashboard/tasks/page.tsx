import Link from "next/link";
import { redirect } from "next/navigation";

import { getSessionUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/rbac";
import { requireTenantId } from "@/lib/tenancy";
import { normalizeTaskStatus } from "@/modules/tasks/constants";
import { listProjectsByTenant } from "@/modules/projects/service";
import { listTasksByTenant } from "@/modules/tasks/service";

import { createTaskWithContextAction } from "./actions";
import { KanbanBoard } from "./kanban-board";
import { TasksCalendarView } from "./tasks-calendar-view";
import { TasksGanttView } from "./tasks-gantt-view";
import { TasksTableView } from "./tasks-table-view";
import type { TaskCardDTO } from "./task-edit-dialog";

export const dynamic = "force-dynamic";

const VIEWS = ["kanban", "table", "calendar", "gantt"] as const;
type View = (typeof VIEWS)[number];

function normalizeView(raw: string | undefined): View {
  const v = raw?.trim().toLowerCase();
  return VIEWS.includes(v as View) ? (v as View) : "kanban";
}

function tasksHref(view: View, project: string, q: string): string {
  const sp = new URLSearchParams();
  sp.set("view", view);
  if (project.trim()) sp.set("project", project.trim());
  if (q.trim()) sp.set("q", q.trim());
  return `/dashboard/tasks?${sp.toString()}`;
}

type PageProps = {
  searchParams: Promise<{
    ok?: string;
    error?: string;
    view?: string;
    project?: string;
    q?: string;
  }>;
};

export default async function TasksPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const session = await getSessionUser();
  if (!session) redirect("/login");

  const tenantId = await requireTenantId();
  const canWrite = hasPermission(session.role, "tasks.write");
  const view = normalizeView(params.view);
  const projectFilter = params.project?.trim() || undefined;
  const qFilter = params.q?.trim() || undefined;

  const [items, projects] = await Promise.all([
    listTasksByTenant(tenantId, {
      projectId: projectFilter,
      q: qFilter,
    }),
    listProjectsByTenant(tenantId),
  ]);

  const taskCards: TaskCardDTO[] = items.map((t) => ({
    id: t.id,
    title: t.title,
    status: normalizeTaskStatus(t.status),
    projectId: t.projectId,
    projectName: t.project.name,
    dueDate: t.dueDate?.toISOString() ?? null,
    createdAt: t.createdAt.toISOString(),
  }));

  const projectOptions = projects.map((p) => ({ id: p.id, name: p.name }));
  const hasProjects = projects.length > 0;

  const pf = projectFilter ?? "";
  const qf = qFilter ?? "";

  return (
    <main className="space-y-6">
      <section className="pmo-card p-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="pmo-title text-zinc-900">Tareas</h1>
            <p className="mt-1 max-w-2xl text-sm text-zinc-600">
              Kanban con arrastre entre columnas, tabla con edición, calendario
              por fecha límite y un diagrama de tiempo simple. Inspirado en
              herramientas como Trello, Linear y Jira: filtros por proyecto y
              texto, varias vistas; lo que falta para un Gantt “de libro” son
              dependencias entre tareas y librería de timeline.
            </p>
          </div>
        </div>

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

        <nav className="mt-5 flex flex-wrap gap-2 border-b border-zinc-200 pb-3">
          {(
            [
              ["kanban", "Kanban"],
              ["table", "Tabla"],
              ["calendar", "Calendario"],
              ["gantt", "Línea de tiempo"],
            ] as const
          ).map(([v, label]) => (
            <Link
              key={v}
              href={tasksHref(v, pf, qf)}
              className={
                view === v
                  ? "rounded-md bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white"
                  : "rounded-md border border-zinc-200 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
              }
            >
              {label}
            </Link>
          ))}
        </nav>

        <form
          method="GET"
          action="/dashboard/tasks"
          className="mt-4 flex flex-wrap items-end gap-3 rounded-lg border border-zinc-200 bg-zinc-50/80 p-4"
        >
          <input type="hidden" name="view" value={view} />
          <div>
            <label className="text-xs font-medium text-zinc-600">Proyecto</label>
            <select
              name="project"
              defaultValue={pf}
              className="mt-1 block min-w-[200px] rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm"
            >
              <option value="">Todos los proyectos</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          <div className="min-w-[200px] flex-1">
            <label className="text-xs font-medium text-zinc-600">Buscar</label>
            <input
              name="q"
              type="search"
              defaultValue={qf}
              placeholder="Título de la tarea…"
              className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm"
            />
          </div>
          <button
            type="submit"
            className="rounded-md bg-zinc-800 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-900"
          >
            Aplicar filtros
          </button>
          {(pf || qf) && (
            <Link
              href={tasksHref(view, "", "")}
              className="text-sm font-medium text-zinc-600 underline"
            >
              Limpiar
            </Link>
          )}
        </form>

        {canWrite && hasProjects && (
          <section className="mt-6 rounded-lg border border-zinc-200 bg-zinc-50/80 p-4">
            <h2 className="text-sm font-semibold text-zinc-900">Nueva tarea</h2>
            <form action={createTaskWithContextAction} className="mt-3 grid gap-3 sm:grid-cols-2">
              <input type="hidden" name="view" value={view} />
              <input type="hidden" name="project" value={pf} />
              <input type="hidden" name="q" value={qf} />
              <div className="sm:col-span-2">
                <label className="text-xs font-medium text-zinc-600">Proyecto</label>
                <select
                  name="projectId"
                  required
                  defaultValue={
                    pf && projects.some((p) => p.id === pf)
                      ? pf
                      : (projects[0]?.id ?? "")
                  }
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
                <label className="text-xs font-medium text-zinc-600">
                  Fecha límite (opcional)
                </label>
                <input
                  type="date"
                  name="dueDate"
                  className="mt-1 w-full max-w-xs rounded-md border border-zinc-300 px-3 py-2 text-sm"
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
            No hay proyectos.{" "}
            <Link href="/dashboard/projects" className="font-medium underline">
              Crea un proyecto
            </Link>{" "}
            primero.
          </p>
        )}

        {!canWrite && (
          <p className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            Tu rol solo permite ver tareas.
          </p>
        )}
      </section>

      <section className="pmo-card overflow-hidden p-6">
        {view === "kanban" && (
          <KanbanBoard tasks={taskCards} projects={projectOptions} canWrite={canWrite} />
        )}
        {view === "table" && (
          <TasksTableView tasks={taskCards} projects={projectOptions} canWrite={canWrite} />
        )}
        {view === "calendar" && <TasksCalendarView tasks={taskCards} />}
        {view === "gantt" && <TasksGanttView tasks={taskCards} />}
      </section>
    </main>
  );
}
