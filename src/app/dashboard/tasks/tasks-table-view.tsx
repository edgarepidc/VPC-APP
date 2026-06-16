"use client";

import { useState } from "react";

import { TaskEditDialog, type TaskCardDTO, type TaskMemberOption } from "./task-edit-dialog";
import {
  TaskChecklistProgress,
  TaskPriorityBadge,
  TaskStatusBadge,
} from "./task-ui";

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
        <table className="pmo-table pmo-row-hover w-full min-w-[860px] text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-slate-500">
              <th>Tarea</th>
              <th>Prioridad</th>
              <th>Estado</th>
              <th>Checklist</th>
              <th>Proyecto</th>
              <th>Responsable</th>
              <th>Vence</th>
            </tr>
          </thead>
          <tbody>
            {tasks.map((task) => (
              <tr
                key={task.id}
                className={canWrite ? "cursor-pointer" : undefined}
                onClick={canWrite ? () => setEditTask(task) : undefined}
              >
                <td className="font-medium text-slate-900">{task.title}</td>
                <td>
                  <TaskPriorityBadge priority={task.priority} />
                </td>
                <td>
                  <TaskStatusBadge status={task.status} />
                </td>
                <td className="min-w-[7rem]">
                  {task.checklist.length > 0 ? (
                    <TaskChecklistProgress items={task.checklist} />
                  ) : (
                    <span className="text-slate-400">—</span>
                  )}
                </td>
                <td className="text-slate-700">{task.projectName}</td>
                <td className="text-slate-600">
                  {task.assigneeName?.trim() ||
                    (task.assigneeEmail ? task.assigneeEmail.split("@")[0] : "—")}
                </td>
                <td className="text-slate-600">
                  {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : "—"}
                </td>
              </tr>
            ))}
            {tasks.length === 0 && (
              <tr>
                <td colSpan={7} className="py-8 text-center text-slate-500">
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
