"use client";

import { useState } from "react";

import {
  TASK_STATUS_LABEL,
  normalizeTaskStatus,
  type TaskKanbanStatus,
} from "@/modules/tasks/constants";

import { TaskEditDialog, type TaskCardDTO, type TaskMemberOption } from "./task-edit-dialog";

type ProjectOption = { id: string; name: string };

type Props = {
  tasks: TaskCardDTO[];
  projects: ProjectOption[];
  members: TaskMemberOption[];
  canWrite: boolean;
};

export function TasksTableView({ tasks, projects, members, canWrite }: Props) {
  const [editTask, setEditTask] = useState<TaskCardDTO | null>(null);

  return (
    <>
      <div className="overflow-x-auto">
        <table className="pmo-table pmo-row-hover w-full min-w-[720px] text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-slate-500">
              <th>Tarea</th>
              <th>Estado</th>
              <th>Proyecto</th>
              <th>Responsable</th>
              <th>Vence</th>
              {canWrite ? <th className="text-right">Acciones</th> : null}
            </tr>
          </thead>
          <tbody>
            {tasks.map((task) => {
              const st = normalizeTaskStatus(task.status);
              return (
                <tr key={task.id}>
                  <td className="font-medium text-slate-900">{task.title}</td>
                  <td>
                    <span className="pmo-badge">
                      {TASK_STATUS_LABEL[st as TaskKanbanStatus]}
                    </span>
                  </td>
                  <td className="text-slate-700">{task.projectName}</td>
                  <td className="text-slate-600">
                    {task.assigneeName?.trim() ||
                      (task.assigneeEmail
                        ? task.assigneeEmail.split("@")[0]
                        : "—")}
                  </td>
                  <td className="text-slate-600">
                    {task.dueDate
                      ? new Date(task.dueDate).toLocaleDateString()
                      : "—"}
                  </td>
                  {canWrite ? (
                    <td className="text-right">
                      <button
                        type="button"
                        onClick={() => setEditTask(task)}
                        className="text-xs font-medium text-slate-700 underline"
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
                  colSpan={canWrite ? 6 : 5}
                  className="py-8 text-center text-slate-500"
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
        members={members}
        onClose={() => setEditTask(null)}
      />
    </>
  );
}
