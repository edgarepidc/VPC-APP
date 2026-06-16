"use client";

import { useRouter } from "next/navigation";

import {
  TASK_KANBAN_COLUMN_THEME,
  TASK_KANBAN_STATUSES,
  TASK_STATUS_LABEL,
  normalizeTaskStatus,
  type TaskKanbanStatus,
} from "@/modules/tasks/constants";

import { updateTaskAction } from "./actions";

export type TaskMemberOption = {
  id: string;
  name: string | null;
  email: string;
};

export type TaskCardDTO = {
  id: string;
  title: string;
  status: string;
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

export function TaskEditDialog({ task, projects, members, onClose }: Props) {
  const router = useRouter();

  if (!task) return null;

  const st = normalizeTaskStatus(task.status);
  const statusTheme = TASK_KANBAN_COLUMN_THEME[st];

  function handleClose() {
    onClose();
  }

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
      handleClose();
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
          handleClose();
        }}
      />
      <div
        role="dialog"
        aria-modal="true"
        className="relative max-h-[min(90vh,640px)] w-full max-w-md overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-2xl"
      >
        <div className={`relative border-b px-5 py-4 ${statusTheme.columnBorder} bg-white/90`}>
          <span className={`absolute inset-y-0 left-0 w-1 rounded-l-2xl ${statusTheme.accent}`} aria-hidden />
          <button
            type="button"
            className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-md border border-slate-200 bg-slate-50 text-slate-500 transition hover:border-red-200 hover:bg-red-50 hover:text-red-700"
            onClick={handleClose}
            aria-label="Cerrar"
          >
            ✕
          </button>
          <p className="pr-10 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
            {TASK_STATUS_LABEL[st]}
          </p>
          <h2 className="mt-0.5 pr-10 text-base font-semibold leading-snug text-slate-900">
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
            <p className="mt-1 text-[11px] text-slate-500">Deja vacío para quitar la fecha.</p>
          </div>
          <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
            <button
              type="button"
              onClick={handleClose}
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
