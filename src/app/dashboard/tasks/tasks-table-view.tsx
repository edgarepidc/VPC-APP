"use client";

import { useState } from "react";

import {
  TASK_STATUS_LABEL,
  normalizeTaskStatus,
  type TaskKanbanStatus,
} from "@/modules/tasks/constants";

import { TaskEditDialog, type TaskCardDTO } from "./task-edit-dialog";

type ProjectOption = { id: string; name: string };

type Props = {
  tasks: TaskCardDTO[];
  projects: ProjectOption[];
  canWrite: boolean;
};

export function TasksTableView({ tasks, projects, canWrite }: Props) {
  const [editTask, setEditTask] = useState<TaskCardDTO | null>(null);

  return (
    <>
      <div className="overflow-x-auto">
        <table className="pmo-table pmo-row-hover w-full min-w-[720px] text-sm">
          <thead>
            <tr className="border-b border-zinc-200 text-left text-zinc-500">
              <th>Tarea</th>
              <th>Estado</th>
              <th>Proyecto</th>
              <th>Vence</th>
              {canWrite ? <th className="text-right">Acciones</th> : null}
            </tr>
          </thead>
          <tbody>
            {tasks.map((task) => {
              const st = normalizeTaskStatus(task.status);
              return (
                <tr key={task.id}>
                  <td className="font-medium text-zinc-900">{task.title}</td>
                  <td>
                    <span className="pmo-badge">
                      {TASK_STATUS_LABEL[st as TaskKanbanStatus]}
                    </span>
                  </td>
                  <td className="text-zinc-700">{task.projectName}</td>
                  <td className="text-zinc-600">
                    {task.dueDate
                      ? new Date(task.dueDate).toLocaleDateString()
                      : "—"}
                  </td>
                  {canWrite ? (
                    <td className="text-right">
                      <button
                        type="button"
                        onClick={() => setEditTask(task)}
                        className="text-xs font-medium text-zinc-700 underline"
                      >
                        Editar
                      </button>
                    </td>
                  ) : null}
                </tr>
              );
            })}
            {tasks.length === 0 && (
              <tr>
                <td
                  colSpan={canWrite ? 5 : 4}
                  className="py-8 text-center text-zinc-500"
                >
                  No hay tareas con los filtros actuales.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <TaskEditDialog
        task={editTask}
        projects={projects}
        onClose={() => setEditTask(null)}
      />
    </>
  );
}
