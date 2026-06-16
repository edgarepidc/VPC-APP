"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import {
  TASK_KANBAN_COLUMN_THEME,
  TASK_KANBAN_STATUSES,
  TASK_PRIORITIES,
  TASK_PRIORITY_LABEL,
  normalizeTaskPriority,
  normalizeTaskStatus,
  TASK_STATUS_LABEL,
  type TaskKanbanStatus,
} from "@/modules/tasks/constants";
import {
  newChecklistId,
  serializeTaskChecklist,
  type TaskChecklistItem,
} from "@/modules/tasks/json";

import { updateTaskAction } from "./actions";
import { TaskPriorityBadge, TaskStatusBadge } from "./task-ui";

export type TaskMemberOption = {
  id: string;
  name: string | null;
  email: string;
};

export type TaskCardDTO = {
  id: string;
  title: string;
  status: string;
  priority: string;
  checklist: TaskChecklistItem[];
  projectId: string;
  projectName: string;
  dueDate: string | null;
  createdAt: string;
  assigneeUserId: string | null;
  assigneeName: string | null;
  assigneeEmail: string | null;
};

type ProjectOption = { id: string; name: string };

type Props = {
  task: TaskCardDTO | null;
  projects: ProjectOption[];
  members: TaskMemberOption[];
  onClose: () => void;
};

function toDateInputValue(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const y = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${mo}-${day}`;
}

function TaskEditForm({
  task,
  projects,
  members,
  onClose,
}: {
  task: TaskCardDTO;
  projects: ProjectOption[];
  members: TaskMemberOption[];
  onClose: () => void;
}) {
  const router = useRouter();
  const st = normalizeTaskStatus(task.status);
  const pr = normalizeTaskPriority(task.priority);
  const statusTheme = TASK_KANBAN_COLUMN_THEME[st];
  const [checklist, setChecklist] = useState<TaskChecklistItem[]>(task.checklist);
  const [newItem, setNewItem] = useState("");

  function addChecklistItem() {
    const text = newItem.trim();
    if (!text) return;
    setChecklist((prev) => [...prev, { id: newChecklistId(), text, done: false }]);
    setNewItem("");
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    fd.set("taskId", task.id);
    fd.set("checklistJson", JSON.stringify(serializeTaskChecklist(checklist)));
    try {
      await updateTaskAction(fd);
      router.refresh();
      onClose();
    } catch (err) {
      alert(err instanceof Error ? err.message : "No se pudo guardar");
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" role="presentation">
      <button
        type="button"
        className="absolute inset-0 bg-black/30 backdrop-blur-sm"
        aria-label="Cerrar"
        onMouseDown={(e) => {
          e.preventDefault();
          onClose();
        }}
      />
      <div
        role="dialog"
        aria-modal="true"
        className="relative max-h-[min(90vh,720px)] w-full max-w-lg overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-2xl"
      >
        <div className={`relative border-b px-5 py-4 ${statusTheme.columnBorder} bg-white/90`}>
          <span className={`absolute inset-y-0 left-0 w-1 rounded-l-2xl ${statusTheme.accent}`} aria-hidden />
          <button
            type="button"
            className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-md border border-slate-200 bg-slate-50 text-slate-500 transition hover:border-red-200 hover:bg-red-50 hover:text-red-700"
            onClick={onClose}
            aria-label="Cerrar"
          >
            ✕
          </button>
          <div className="flex flex-wrap items-center gap-2 pr-10">
            <TaskStatusBadge status={st} />
            <TaskPriorityBadge priority={pr} />
          </div>
          <h2 className="mt-2 pr-10 text-base font-semibold leading-snug text-slate-900">
            Editar tarea
          </h2>
          <p className="mt-1 text-xs text-slate-500">{task.projectName}</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3 p-5 text-sm text-slate-900">
          <div>
            <label className="text-xs font-medium text-slate-600">Título</label>
            <input
              name="title"
              required
              maxLength={500}
              defaultValue={task.title}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-100"
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="text-xs font-medium text-slate-600">Estado</label>
              <select
                name="status"
                defaultValue={st}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
              >
                {TASK_KANBAN_STATUSES.map((v) => (
                  <option key={v} value={v}>
                    {TASK_STATUS_LABEL[v as TaskKanbanStatus]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600">Prioridad</label>
              <select
                name="priority"
                defaultValue={pr}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
              >
                {TASK_PRIORITIES.map((v) => (
                  <option key={v} value={v}>
                    {TASK_PRIORITY_LABEL[v]}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600">Proyecto</label>
            <select
              name="projectId"
              defaultValue={task.projectId}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
            >
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600">Responsable</label>
            <select
              name="assigneeUserId"
              defaultValue={task.assigneeUserId ?? ""}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
            >
              <option value="">Sin asignar</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name?.trim() || m.email}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600">Fecha límite (opcional)</label>
            <input
              type="date"
              name="dueDate"
              defaultValue={toDateInputValue(task.dueDate)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
            />
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50/80 p-3">
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-600">
              Checklist
            </label>
            <ul className="mt-2 space-y-1.5">
              {checklist.map((item) => (
                <li key={item.id} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={item.done}
                    onChange={() =>
                      setChecklist((prev) =>
                        prev.map((row) =>
                          row.id === item.id ? { ...row, done: !row.done } : row,
                        ),
                      )
                    }
                    className="rounded border-slate-300"
                  />
                  <input
                    value={item.text}
                    onChange={(e) =>
                      setChecklist((prev) =>
                        prev.map((row) =>
                          row.id === item.id ? { ...row, text: e.target.value } : row,
                        ),
                      )
                    }
                    className="min-w-0 flex-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-xs"
                  />
                  <button
                    type="button"
                    onClick={() => setChecklist((prev) => prev.filter((row) => row.id !== item.id))}
                    className="text-xs text-slate-400 hover:text-red-600"
                    aria-label="Quitar ítem"
                  >
                    ✕
                  </button>
                </li>
              ))}
            </ul>
            <div className="mt-2 flex gap-2">
              <input
                value={newItem}
                onChange={(e) => setNewItem(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addChecklistItem();
                  }
                }}
                placeholder="Nuevo ítem…"
                className="min-w-0 flex-1 rounded-md border border-slate-300 bg-white px-2 py-1.5 text-xs"
              />
              <button
                type="button"
                onClick={addChecklistItem}
                className="shrink-0 rounded-md border border-slate-300 bg-white px-2 py-1.5 text-xs font-medium hover:bg-slate-50"
              >
                Añadir
              </button>
            </div>
          </div>
          <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm hover:bg-slate-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
            >
              Guardar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function TaskEditDialog({ task, projects, members, onClose }: Props) {
  if (!task) return null;
  return (
    <TaskEditForm
      key={task.id}
      task={task}
      projects={projects}
      members={members}
      onClose={onClose}
    />
  );
}
