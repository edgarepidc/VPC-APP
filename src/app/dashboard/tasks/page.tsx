import Link from "next/link";
import { redirect } from "next/navigation";

import { DashboardSectionShell } from "@/app/dashboard/_components/section-shell";
import {
  dashAlertError,
  dashAlertOk,
  dashAlertWarn,
  dashCardBody,
  dashPage,
} from "@/lib/ui-classes";
import { PMO_PROJECTS } from "@/lib/dashboard-paths";
import { getSessionUser } from "@/lib/auth/session";
import { canWriteWorkspaceData } from "@/lib/workspace-access";
import { getProjectHierarchyForSession, getSessionProjectIdsFilter } from "@/lib/project-scope";
import {
  initiativeNameFor,
  projectDisplayLabel,
  resolveProjectFilterIds,
  workScopeProjectIds,
} from "@/lib/project-hierarchy";
import { requireTenantId } from "@/lib/tenancy";
import {
  normalizeTaskPriority,
  normalizeTaskStatus,
} from "@/modules/tasks/constants";
import { parseTaskChecklist } from "@/modules/tasks/json";
import { listMemberUsersForTenant } from "@/modules/memberships/service";
import { listTasksByTenant } from "@/modules/tasks/service";

import { KanbanBoard } from "./kanban-board";
import { TasksFilterBar } from "./tasks-filter-bar";
import { TasksHeaderControls } from "./tasks-header-controls";
import { TasksCalendarView } from "./tasks-calendar-view";
import { TasksGanttView } from "./tasks-gantt-view";
import { TasksKeyboardLayer, TasksShortcutsHint } from "./tasks-keyboard-layer";
import { buildTasksHref, normalizeTaskView, type TaskView } from "./tasks-query";
import { TasksTableView } from "./tasks-table-view";
import { TasksViewBar } from "./tasks-view-bar";
import type { TaskCardDTO, TaskMemberOption } from "./task-edit-dialog";

export const dynamic = "force-dynamic";

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

function resolveAssigneeFilter(
  raw: string | undefined,
  currentUserId: string,
): string | null | undefined {
  const v = raw?.trim();
  if (!v) return undefined;
  if (v === "none") return null;
  if (v === "me") return currentUserId;
  return v;
}

type PageProps = {
  searchParams: Promise<{
    ok?: string;
    error?: string;
    view?: string;
    project?: string;
    q?: string;
    assignee?: string;
    priority?: string;
    status?: string;
    month?: string;
  }>;
};

export default async function TasksPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const session = await getSessionUser();
  if (!session) redirect("/login");

  const tenantId = await requireTenantId();
  const canWrite = canWriteWorkspaceData(session);
  const view = normalizeTaskView(params.view);
  const projectFilter = params.project?.trim() || undefined;
  const qFilter = params.q?.trim() || undefined;
  const pf = projectFilter ?? "";
  const qf = qFilter ?? "";
  const assigneeParam = params.assignee?.trim() ?? "";
  const priorityParam = params.priority?.trim() ?? "";
  const statusParam = params.status?.trim() ?? "";

  const { y: calY, m: calM } = parseYearMonth(params.month);
  const monthQueryValue = formatYearMonth(calY, calM);
  const prevCal = addMonths(calY, calM, -1);
  const nextCal = addMonths(calY, calM, 1);

  const filterContext = {
    view,
    project: pf,
    q: qf,
    assignee: assigneeParam || undefined,
    priority: priorityParam || undefined,
    status: statusParam || undefined,
    month: view === "calendar" ? monthQueryValue : undefined,
  };

  const prevMonthHref = buildTasksHref({
    ...filterContext,
    view: "calendar",
    month: formatYearMonth(prevCal.y, prevCal.m),
  });
  const nextMonthHref = buildTasksHref({
    ...filterContext,
    view: "calendar",
    month: formatYearMonth(nextCal.y, nextCal.m),
  });

  const serverNow = new Date();
  const highlightTodayDay =
    serverNow.getFullYear() === calY && serverNow.getMonth() === calM
      ? serverNow.getDate()
      : null;

  const projectIdsFilter = await getSessionProjectIdsFilter(session, tenantId);
  const hierarchy = await getProjectHierarchyForSession(session, tenantId);
  const resolvedFilter = resolveProjectFilterIds(hierarchy.projects, pf || null);
  let effectiveRestrict = projectIdsFilter;
  if (resolvedFilter) {
    effectiveRestrict = projectIdsFilter
      ? resolvedFilter.filter((id) => projectIdsFilter.includes(id))
      : resolvedFilter;
  }

  const assigneeUserId = resolveAssigneeFilter(assigneeParam, session.userId);

  const [items, memberRows] = await Promise.all([
    listTasksByTenant(tenantId, {
      q: qFilter,
      restrictToProjectIds: effectiveRestrict,
      assigneeUserId,
      priority: priorityParam || undefined,
      status: statusParam || undefined,
    }),
    listMemberUsersForTenant(tenantId),
  ]);

  const workIds = new Set(workScopeProjectIds(hierarchy.projects));
  const projectOptions = hierarchy.projects
    .filter((p) => workIds.has(p.id))
    .map((p) => ({
      id: p.id,
      name: projectDisplayLabel(p, initiativeNameFor(hierarchy.projects, p.id)),
    }));
  const defaultTaskProjectId =
    (pf && projectOptions.some((p) => p.id === pf) ? pf : null) ??
    (pf && resolvedFilter?.[0]) ??
    projectOptions[0]?.id ??
    "";

  const hasProjects = projectOptions.length > 0;

  const members: TaskMemberOption[] = memberRows.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
  }));

  const taskCards: TaskCardDTO[] = items.map((t) => ({
    id: t.id,
    title: t.title,
    status: normalizeTaskStatus(t.status),
    priority: normalizeTaskPriority(t.priority),
    checklist: parseTaskChecklist(t.checklist),
    projectId: t.projectId,
    projectName: projectDisplayLabel(
      {
        id: t.projectId,
        name: t.project.name,
        parentProjectId:
          hierarchy.projects.find((p) => p.id === t.projectId)?.parentProjectId ?? null,
      },
      initiativeNameFor(hierarchy.projects, t.projectId),
    ),
    dueDate: t.dueDate?.toISOString() ?? null,
    createdAt: t.createdAt.toISOString(),
    assigneeUserId: t.assigneeUserId ?? null,
    assigneeName: t.assignee?.name ?? null,
    assigneeEmail: t.assignee?.email ?? null,
  }));

  const undatedTasks = taskCards.filter((t) => !t.dueDate);

  return (
    <main className={dashPage}>
      <TasksKeyboardLayer canWrite={canWrite} />
      <DashboardSectionShell
        eyebrow="Tareas"
        title="Seguimiento de actividades"
        titleAs="h1"
        headerTrailing={
          <TasksHeaderControls
            key={`${pf}-${qf}-${assigneeParam}-${priorityParam}-${statusParam}`}
            view={view}
            project={pf}
            q={qf}
            assignee={assigneeParam}
            priority={priorityParam}
            status={statusParam}
            month={view === "calendar" ? monthQueryValue : undefined}
            groups={hierarchy.groups}
          />
        }
      >
        {params.error ? (
          <p className={`mx-4 mt-4 ${dashAlertError}`}>{params.error}</p>
        ) : null}
        {params.ok ? <p className={`mx-4 mt-4 ${dashAlertOk}`}>{params.ok}</p> : null}

        <section className={`border-t border-slate-100 ${dashCardBody}`}>
          <TasksViewBar
            view={view as TaskView}
            filterContext={filterContext}
            canWrite={canWrite}
            hasProjects={hasProjects}
            projects={projectOptions}
            members={members}
            defaultProjectId={defaultTaskProjectId}
          />

          <TasksFilterBar
            view={view}
            project={pf}
            q={qf}
            assignee={assigneeParam}
            priority={priorityParam}
            status={statusParam}
            month={view === "calendar" ? monthQueryValue : undefined}
            members={members}
          />

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
            <p className={`mt-4 ${dashAlertWarn}`}>Tu rol solo permite ver tareas.</p>
          )}
        </section>

        <section className={`border-t border-slate-100 ${dashCardBody}`}>
          {view === "kanban" && (
            <KanbanBoard
              tasks={taskCards}
              projects={projectOptions}
              members={members}
              canWrite={canWrite}
              defaultProjectId={defaultTaskProjectId}
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
              projects={projectOptions}
              members={members}
              canWrite={canWrite}
            />
          )}
          {view === "gantt" && (
            <TasksGanttView
              tasks={taskCards}
              projects={projectOptions}
              members={members}
              canWrite={canWrite}
            />
          )}
          <TasksShortcutsHint canWrite={canWrite} />
        </section>
      </DashboardSectionShell>
    </main>
  );
}
