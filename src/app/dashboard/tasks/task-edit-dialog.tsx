"use client";

import { useRouter } from "next/navigation";

import {
  TASK_KANBAN_STATUSES,
  TASK_STATUS_LABEL,
  normalizeTaskStatus,
  type TaskKanbanStatus,
} from "@/modules/tasks/constants";

import { updateTaskAction } from "./actions";

export type TaskCardDTO = {
  id: string;
  title: string;
  status: string;
  projectId: string;
  projectName: string;
  dueDate: string | null;
  createdAt: string;
};

type ProjectOption = { id: string; name: string };

type Props = {
  task: TaskCardDTO | null;
  projects: ProjectOption[];
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

export function TaskEditDialog({ task, projects, onClose }: Props) {
  const router = useRouter();

  if (!task) return null;

  const st = normalizeTaskStatus(task.status);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    const current = task;
    if (!current) return;
    fd.set("taskId", current.id);
    try {
      await updateTaskAction(fd);
      router.refresh();
      onClose();
    } catch (err) {
      alert(err instanceof Error ? err.message : "No se pudo guardar");
    }
  }

  return (
    <dialog
      open
      key={task.id}
      className="open:backdrop:bg-black/40 fixed left-1/2 top-1/2 z-50 w-[min(100vw-2rem,28rem)] -translate-x-1/2 -translate-y-1/2 rounded-xl border border-zinc-200 bg-white p-0 text-zinc-900 shadow-xl"
      onClose={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <form onSubmit={handleSubmit} className="p-5" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-base font-semibold">Editar tarea</h2>
        <div className="mt-4 space-y-3">
          <div>
            <label className="text-xs font-medium text-zinc-600">Título</label>
            <input
              name="title"
              required
              maxLength={500}
              defaultValue={task.title}
              className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-zinc-600">Estado</label>
            <select
              name="status"
              defaultValue={st}
              className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
            >
              {TASK_KANBAN_STATUSES.map((v) => (
                <option key={v} value={v}>
                  {TASK_STATUS_LABEL[v as TaskKanbanStatus]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-zinc-600">Proyecto</label>
            <select
              name="projectId"
              defaultValue={task.projectId}
              className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
            >
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-zinc-600">
              Fecha límite (opcional)
            </label>
            <input
              type="date"
              name="dueDate"
              defaultValue={toDateInputValue(task.dueDate)}
              className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
            />
            <p className="mt-1 text-[11px] text-zinc-500">
              Deja vacío para quitar la fecha.
            </p>
          </div>
        </div>
        <div className="mt-5 flex justify-end gap-2 border-t border-zinc-100 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-zinc-300 px-3 py-2 text-sm hover:bg-zinc-50"
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
          >
            Guardar
          </button>
        </div>
      </form>
    </dialog>
  );
}
