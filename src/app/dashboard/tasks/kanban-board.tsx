"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import {
  TASK_KANBAN_STATUSES,
  TASK_STATUS_LABEL,
  normalizeTaskStatus,
  type TaskKanbanStatus,
} from "@/modules/tasks/constants";

import { moveTaskAction } from "./actions";
import { TaskEditDialog, type TaskCardDTO } from "./task-edit-dialog";

type ProjectOption = { id: string; name: string };

type Props = {
  tasks: TaskCardDTO[];
  projects: ProjectOption[];
  canWrite: boolean;
};

export function KanbanBoard({ tasks, projects, canWrite }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [dragId, setDragId] = useState<string | null>(null);
  const [editTask, setEditTask] = useState<TaskCardDTO | null>(null);

  const byColumn = useMemo(() => {
    const m: Record<TaskKanbanStatus, TaskCardDTO[]> = {
      todo: [],
      in_progress: [],
      done: [],
    };
    for (const t of tasks) {
      const st = normalizeTaskStatus(t.status);
      m[st].push(t);
    }
    return m;
  }, [tasks]);

  function moveTo(column: TaskKanbanStatus) {
    if (!dragId || !canWrite) return;
    const fd = new FormData();
    fd.set("taskId", dragId);
    fd.set("status", column);
    startTransition(async () => {
      try {
        await moveTaskAction(fd);
        router.refresh();
      } catch {
        alert("No se pudo mover la tarea.");
      } finally {
        setDragId(null);
      }
    });
  }

  return (
    <>
      <div
        className={`flex min-h-[420px] gap-4 overflow-x-auto pb-2 ${isPending ? "opacity-60" : ""}`}
      >
        {TASK_KANBAN_STATUSES.map((col) => (
          <section
            key={col}
            className="flex w-[min(100%,280px)] shrink-0 flex-col rounded-lg border border-zinc-200 bg-zinc-50/80"
            onDragOver={(e) => {
              e.preventDefault();
              e.dataTransfer.dropEffect = "move";
            }}
            onDrop={(e) => {
              e.preventDefault();
              moveTo(col);
            }}
          >
            <header className="border-b border-zinc-200 px-3 py-2">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-600">
                {TASK_STATUS_LABEL[col]}
              </h3>
              <p className="text-[11px] text-zinc-500">
                {byColumn[col].length} tarjeta
                {byColumn[col].length === 1 ? "" : "s"}
              </p>
            </header>
            <div className="flex flex-1 flex-col gap-2 p-2">
              {byColumn[col].map((task) => (
                <article
                  key={task.id}
                  draggable={canWrite}
                  onDragStart={(e) => {
                    if (!canWrite) return;
                    setDragId(task.id);
                    e.dataTransfer.effectAllowed = "move";
                    e.dataTransfer.setData("text/task-id", task.id);
                  }}
                  onDragEnd={() => setDragId(null)}
                  className={`cursor-grab rounded-md border border-zinc-200 bg-white p-3 shadow-sm active:cursor-grabbing ${
                    dragId === task.id ? "ring-2 ring-zinc-400" : ""
                  }`}
                >
                  <p className="text-sm font-medium text-zinc-900">{task.title}</p>
                  <p className="mt-1 text-[11px] text-zinc-500">{task.projectName}</p>
                  {task.dueDate && (
                    <p className="mt-1 text-[11px] text-amber-800">
                      Vence:{" "}
                      {new Date(task.dueDate).toLocaleDateString(undefined, {
                        day: "numeric",
                        month: "short",
                      })}
                    </p>
                  )}
                  {canWrite && (
                    <button
                      type="button"
                      onClick={() => setEditTask(task)}
                      className="mt-2 text-[11px] font-medium text-zinc-700 underline"
                    >
                      Editar
                    </button>
                  )}
                </article>
              ))}
              {byColumn[col].length === 0 && (
                <p className="py-6 text-center text-[12px] text-zinc-400">
                  {canWrite
                    ? "Arrastra tarjetas aquí"
                    : "Sin tareas en esta columna"}
                </p>
              )}
            </div>
          </section>
        ))}
      </div>
      <TaskEditDialog
        task={editTask}
        projects={projects}
        onClose={() => setEditTask(null)}
      />
    </>
  );
}
