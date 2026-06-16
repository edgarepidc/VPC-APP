"use client";

import Link from "next/link";

import { dashTabActive, dashTabIdle } from "@/lib/ui-classes";

import { TaskCreateDialog, useTaskCreateDialog } from "./task-create-dialog";
import type { TaskMemberOption } from "./task-edit-dialog";
import { buildTasksHref, type TaskView, type TasksFilterParams } from "./tasks-query";

const VIEW_LABELS: { id: TaskView; label: string }[] = [
  { id: "kanban", label: "Kanban" },
  { id: "table", label: "Tabla" },
  { id: "calendar", label: "Calendario" },
  { id: "gantt", label: "Línea de tiempo" },
];

type ProjectOption = { id: string; name: string };

type Props = {
  view: TaskView;
  filterContext: TasksFilterParams;
  canWrite: boolean;
  hasProjects: boolean;
  projects: ProjectOption[];
  members: TaskMemberOption[];
  defaultProjectId: string;
};

export function TasksViewBar({
  view,
  filterContext,
  canWrite,
  hasProjects,
  projects,
  members,
  defaultProjectId,
}: Props) {
  const { open, setOpen } = useTaskCreateDialog();

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
        <nav className="flex flex-wrap gap-2">
          {VIEW_LABELS.map(({ id, label }) => (
            <Link
              key={id}
              href={buildTasksHref({
                ...filterContext,
                view: id,
                month: id === "calendar" ? filterContext.month : undefined,
              })}
              className={view === id ? dashTabActive : dashTabIdle}
            >
              {label}
            </Link>
          ))}
        </nav>
        {canWrite ? (
          <button
            type="button"
            disabled={!hasProjects}
            onClick={() => setOpen(true)}
            className="h-9 shrink-0 whitespace-nowrap rounded-lg border border-sky-600 bg-sky-600 px-4 text-sm font-medium text-white shadow-sm transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:border-slate-300 disabled:bg-slate-200 disabled:text-slate-500"
          >
            + Nueva tarea
          </button>
        ) : null}
      </div>

      <TaskCreateDialog
        open={open}
        onClose={() => setOpen(false)}
        canWrite={canWrite}
        hasProjects={hasProjects}
        projects={projects}
        members={members}
        defaultProjectId={defaultProjectId}
        filterContext={filterContext}
      />
    </>
  );
}
