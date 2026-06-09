import Link from "next/link";
import { redirect } from "next/navigation";

import { DashboardPageHeader } from "@/app/dashboard/_components/page-header";
import {
  dashAlertError,
  dashAlertOk,
  dashAlertWarn,
  dashCard,
  dashCardBody,
  dashDetailsBody,
  dashDetailsSummary,
  dashPage,
  dashTabActive,
  dashTabIdle,
  uiLabel,
} from "@/lib/ui-classes";
import { PMO_HUB, PMO_PROJECTS } from "@/lib/dashboard-paths";
import { getSessionUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/rbac";
import { getSessionProjectIdsFilter, listProjectsForSession } from "@/lib/project-scope";
import { requireTenantId } from "@/lib/tenancy";
import { normalizeTaskStatus } from "@/modules/tasks/constants";
import { listMemberUsersForTenant } from "@/modules/memberships/service";
import { listTasksByTenant } from "@/modules/tasks/service";

import { createTaskWithContextAction } from "./actions";
import { KanbanBoard } from "./kanban-board";
import { TasksCalendarView } from "./tasks-calendar-view";
import { TasksGanttView } from "./tasks-gantt-view";
import { TasksTableView } from "./tasks-table-view";
import type { TaskCardDTO, TaskMemberOption } from "./task-edit-dialog";

export const dynamic = "force-dynamic";

const VIEWS = ["kanban", "table", "calendar", "gantt"] as const;
type View = (typeof VIEWS)[number];

function normalizeView(raw: string | undefined): View {
  const v = raw?.trim().toLowerCase();
  return VIEWS.includes(v as View) ? (v as View) : "kanban";
}

/** `m` es índice de mes 0–11. */
function parseYearMonth(raw: string | undefined): { y: number; m: number } {
  const now = new Date();
  const defY = now.getFullYear();
  const defM = now.getMonth();
  if (!raw?.trim()) return { y: defY, m: defM };
  const match = /^(\d{4})-(\d{2})$/.exec(raw.trim());
  if (!match) return { y: defY, m: defM };
  const y = Number(match[1]);
  const month = Number(match[2]) - 1;
  if (y < 1970 || y > 2100 || month < 0 || month > 11) return { y: defY, m: defM };
  return { y, m: month };
}

function formatYearMonth(y: number, mIndex: number): string {
  return `${y}-${String(mIndex + 1).padStart(2, "0")}`;
}

function addMonths(y: number, mIndex: number, delta: number): { y: number; m: number } {
  const d = new Date(y, mIndex + delta, 1);
  return { y: d.getFullYear(), m: d.getMonth() };
}

function tasksHref(view: View, project: string, q: string, month?: string): string {
  const sp = new URLSearchParams();
  sp.set("view", view);
  if (project.trim()) sp.set("project", project.trim());
  if (q.trim()) sp.set("q", q.trim());
  if (month && /^\d{4}-\d{2}$/.test(month)) sp.set("month", month);
  return `/dashboard/tasks?${sp.toString()}`;
}

type PageProps = {
  searchParams: Promise<{
    ok?: string;
    error?: string;
    view?: string;
    project?: string;
    q?: string;
    month?: string;
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
  const pf = projectFilter ?? "";
  const qf = qFilter ?? "";

  const { y: calY, m: calM } = parseYearMonth(params.month);
  const monthQueryValue = formatYearMonth(calY, calM);
  const prevCal = addMonths(calY, calM, -1);
  const nextCal = addMonths(calY, calM, 1);
  const prevMonthHref = tasksHref("calendar", pf, qf, formatYearMonth(prevCal.y, prevCal.m));
  const nextMonthHref = tasksHref("calendar", pf, qf, formatYearMonth(nextCal.y, nextCal.m));
  const serverNow = new Date();
  const highlightTodayDay =
    serverNow.getFullYear() === calY && serverNow.getMonth() === calM
      ? serverNow.getDate()
      : null;

  const projectIdsFilter = await getSessionProjectIdsFilter(session, tenantId);

  const [items, projects, memberRows] = await Promise.all([
    listTasksByTenant(tenantId, {
      projectId: projectFilter,
      q: qFilter,
      restrictToProjectIds: projectIdsFilter,
    }),
    listProjectsForSession(session, tenantId),
    listMemberUsersForTenant(tenantId),
  ]);

  const members: TaskMemberOption[] = memberRows.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
  }));

  const taskCards: TaskCardDTO[] = items.map((t) => ({
    id: t.id,
    title: t.title,
    status: normalizeTaskStatus(t.status),
    projectId: t.projectId,
    projectName: t.project.name,
    dueDate: t.dueDate?.toISOString() ?? null,
    createdAt: t.createdAt.toISOString(),
    assigneeUserId: t.assigneeUserId ?? null,
    assigneeName: t.assignee?.name ?? null,
    assigneeEmail: t.assignee?.email ?? null,
  }));

  const undatedTasks = taskCards.filter((t) => !t.dueDate);

  const projectOptions = projects.map((p) => ({ id: p.id, name: p.name }));
  const hasProjects = projects.length > 0;

  return (
    <main className={dashPage}>
      <DashboardPageHeader
        title="Tareas"
        description="Kanban, tabla, calendario y Gantt. Filtra por proyecto o texto."
      >
        <Link
          href={PMO_HUB}
          className="mt-2 inline-block text-sm font-medium text-slate-700 underline"
        >
          Ver resumen PMO
        </Link>
        {params.error && <p className={dashAlertError}>{params.error}</p>}
        {params.ok && <p className={dashAlertOk}>{params.ok}</p>}
      </DashboardPageHeader>

      <section className={`${dashCard} ${dashCardBody}`}>
        <nav className="flex flex-wrap gap-2 border-b border-slate-200 pb-3">
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
              href={tasksHref(v, pf, qf, v === "calendar" ? monthQueryValue : undefined)}
              className={view === v ? dashTabActive : dashTabIdle}
            >
              {label}
            </Link>
          ))}
        </nav>

        <form
          method="GET"
          action="/dashboard/tasks"
          className="mt-4 flex flex-wrap items-end gap-3 border-b border-slate-200 pb-4"
        >
          <input type="hidden" name="view" value={view} />
          {view === "calendar" ? (
            <input type="hidden" name="month" value={monthQueryValue} />
          ) : null}
          <div>
            <label className={uiLabel}>Proyecto</label>
            <select
              name="project"
              defaultValue={pf}
              className="mt-1 block min-w-[200px] rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
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
            <label className={uiLabel}>Buscar</label>
            <input
              name="q"
              type="search"
              defaultValue={qf}
              placeholder="Título de la tarea…"
              className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
            />
          </div>
          <button
            type="submit"
            className="rounded-md bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-900"
          >
            Aplicar filtros
          </button>
          {(pf || qf) && (
            <Link
              href={tasksHref(
                view,
                "",
                "",
                view === "calendar" ? monthQueryValue : undefined,
              )}
              className="text-sm font-medium text-slate-600 underline"
            >
              Limpiar
            </Link>
          )}
        </form>

        {canWrite && hasProjects && (
          <details className={`${dashCard} mt-4`}>
            <summary className={dashDetailsSummary}>Nueva tarea</summary>
            <form action={createTaskWithContextAction} className={`grid gap-3 sm:grid-cols-2 ${dashDetailsBody}`}>
              <input type="hidden" name="view" value={view} />
              <input type="hidden" name="project" value={pf} />
              <input type="hidden" name="q" value={qf} />
              {view === "calendar" ? (
                <input type="hidden" name="month" value={monthQueryValue} />
              ) : null}
              <div className="sm:col-span-2">
                <label className={uiLabel}>Proyecto</label>
                <select
                  name="projectId"
                  required
                  defaultValue={
                    pf && projects.some((p) => p.id === pf)
                      ? pf
                      : (projects[0]?.id ?? "")
                  }
                  className="mt-1 w-full max-w-md rounded-md border border-slate-300 px-3 py-2 text-sm"
                >
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className={uiLabel}>Título</label>
                <input
                  name="title"
                  required
                  maxLength={500}
                  placeholder="Describe la tarea"
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
              <div className="sm:col-span-2">
                <label className={uiLabel}>Fecha límite (opcional)</label>
                <input
                  type="date"
                  name="dueDate"
                  className="mt-1 w-full max-w-xs rounded-md border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
              <div className="sm:col-span-2">
                <label className={uiLabel}>Responsable (opcional)</label>
                <select
                  name="assigneeUserId"
                  className="mt-1 w-full max-w-md rounded-md border border-slate-300 px-3 py-2 text-sm"
                >
                  <option value="">Sin asignar</option>
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name?.trim() || m.email}
                    </option>
                  ))}
                </select>
              </div>
              <div className="sm:col-span-2">
                <button
                  type="submit"
                  className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
                >
                  Crear tarea
                </button>
              </div>
            </form>
          </details>
        )}

        {canWrite && !hasProjects && (
          <p className={`mt-4 ${dashAlertWarn}`}>
            No hay proyectos.{" "}
            <Link href={PMO_PROJECTS} className="font-medium underline">
              Crea un proyecto
            </Link>{" "}
            primero.
          </p>
        )}

        {!canWrite && (
          <p className={`mt-4 ${dashAlertWarn}`}>
            Tu rol solo permite ver tareas.
          </p>
        )}
      </section>

      <section className={`${dashCard} overflow-hidden ${dashCardBody}`}>
        {view === "kanban" && (
          <KanbanBoard
            tasks={taskCards}
            projects={projectOptions}
            members={members}
            canWrite={canWrite}
          />
        )}
        {view === "table" && (
          <TasksTableView
            tasks={taskCards}
            projects={projectOptions}
            members={members}
            canWrite={canWrite}
          />
        )}
        {view === "calendar" && (
          <TasksCalendarView
            tasks={taskCards}
            calendarMonth={calM + 1}
            calendarYear={calY}
            prevMonthHref={prevMonthHref}
            nextMonthHref={nextMonthHref}
            highlightTodayDay={highlightTodayDay}
            undatedTasks={undatedTasks}
          />
        )}
        {view === "gantt" && <TasksGanttView tasks={taskCards} />}
      </section>
    </main>
  );
}
