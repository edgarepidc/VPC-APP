"use client";

import { useState } from "react";

import { TaskEditDialog, type TaskCardDTO, type TaskMemberOption } from "./task-edit-dialog";
import { TaskPriorityDot, taskGanttBarClass } from "./task-ui";

type ProjectOption = { id: string; name: string };

type Props = {
  tasks: TaskCardDTO[];
  projects: ProjectOption[];
  members: TaskMemberOption[];
  canWrite: boolean;
};

/** Vista tipo timeline simple: inicio = creación, fin = vence o +3 días. */
export function TasksGanttView({ tasks, projects, members, canWrite }: Props) {
  const [editTask, setEditTask] = useState<TaskCardDTO | null>(null);

  if (tasks.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-slate-500">
        No hay tareas para mostrar en el diagrama.
      </p>
    );
  }

  const ranges = tasks.map((t) => {
    const start = new Date(t.createdAt).getTime();
    const end = t.dueDate ? new Date(t.dueDate).getTime() : start + 3 * 86400000;
    return { task: t, start, end: Math.max(end, start + 86400000) };
  });

  const min = Math.min(...ranges.map((r) => r.start));
  const max = Math.max(...ranges.map((r) => r.end));
  const span = Math.max(max - min, 86400000);

  return (
    <>
      <div className="space-y-3">
        <p className="text-sm text-slate-600">
          Barra desde creación hasta fecha límite. El color refleja prioridad (verde si está
          hecha).
          {canWrite ? " Haz clic en una fila para editar." : null}
        </p>
        <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50/50 p-3">
          {ranges.map(({ task, start, end }) => {
            const left = ((start - min) / span) * 100;
            const width = Math.max(((end - start) / span) * 100, 2);
            return (
              <button
                key={task.id}
                type="button"
                disabled={!canWrite}
                onClick={canWrite ? () => setEditTask(task) : undefined}
                className={`grid w-full grid-cols-[minmax(0,1fr)_minmax(120px,2fr)] items-center gap-2 text-left text-sm ${
                  canWrite ? "cursor-pointer rounded-md px-1 py-0.5 hover:bg-white/80" : ""
                }`}
              >
                <p className="flex min-w-0 items-center gap-2 truncate font-medium text-slate-900">
                  <TaskPriorityDot priority={task.priority} />
                  <span className="truncate" title={task.title}>
                    {task.title}
                  </span>
                </p>
                <div className="relative h-7 rounded bg-slate-200/80">
                  <div
                    className={`absolute top-1 h-5 rounded ${taskGanttBarClass(task.priority, task.status)}`}
                    style={{
                      left: `${left}%`,
                      width: `${width}%`,
                      maxWidth: "100%",
                    }}
                    title={`${task.projectName}${task.dueDate ? ` · vence ${new Date(task.dueDate).toLocaleDateString()}` : ""}`}
                  />
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <TaskEditDialog
        task={editTask}
        projects={projects}
        members={members}
        onClose={() => setEditTask(null)}
      />
    </>
  );
}
