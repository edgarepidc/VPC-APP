"use client";

import { useEffect, useState } from "react";

import {
  TASK_PRIORITIES,
  TASK_PRIORITY_LABEL,
} from "@/modules/tasks/constants";

import { createTaskWithContextAction } from "./actions";
import type { TaskMemberOption } from "./task-edit-dialog";
import type { TasksFilterParams } from "./tasks-query";

type ProjectOption = { id: string; name: string };

type Props = {
  open: boolean;
  onClose: () => void;
  canWrite: boolean;
  hasProjects: boolean;
  projects: ProjectOption[];
  members: TaskMemberOption[];
  defaultProjectId: string;
  filterContext: TasksFilterParams;
};

export function TaskCreateDialog({
  open,
  onClose,
  canWrite,
  hasProjects,
  projects,
  members,
  defaultProjectId,
  filterContext,
}: Props) {
  if (!open || !canWrite || !hasProjects) return null;

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
        aria-labelledby="task-create-title"
        className="relative w-full max-w-lg overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-2xl"
      >
        <div className="relative border-b border-sky-200 bg-sky-50/80 px-5 py-4">
          <span className="absolute inset-y-0 left-0 w-1 rounded-l-2xl bg-sky-500" aria-hidden />
          <button
            type="button"
            className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-md border border-slate-200 bg-white text-slate-500 transition hover:border-red-200 hover:bg-red-50 hover:text-red-700"
            onClick={onClose}
            aria-label="Cerrar"
          >
            ✕
          </button>
          <h2 id="task-create-title" className="pr-10 text-base font-semibold text-slate-900">
            Nueva tarea
          </h2>
          <p className="mt-1 text-xs text-slate-600">Completa los datos y crea la tarea en el tablero.</p>
        </div>
        <form action={createTaskWithContextAction} className="space-y-3 p-5 text-sm text-slate-900">
          <input type="hidden" name="view" value={filterContext.view} />
          <input type="hidden" name="project" value={filterContext.project} />
          <input type="hidden" name="q" value={filterContext.q} />
          {filterContext.assignee ? (
            <input type="hidden" name="assignee" value={filterContext.assignee} />
          ) : null}
          {filterContext.priority ? (
            <input type="hidden" name="priorityFilter" value={filterContext.priority} />
          ) : null}
          {filterContext.status ? (
            <input type="hidden" name="statusFilter" value={filterContext.status} />
          ) : null}
          {filterContext.month ? <input type="hidden" name="month" value={filterContext.month} /> : null}
          <div>
            <label className="text-xs font-medium text-slate-600">Subproyecto</label>
            <select
              name="projectId"
              required
              defaultValue={defaultProjectId}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
            >
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600">Título</label>
            <input
              name="title"
              required
              maxLength={500}
              autoFocus
              placeholder="Describe la tarea"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="text-xs font-medium text-slate-600">Prioridad</label>
              <select
                name="priority"
                defaultValue="medium"
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
              >
                {TASK_PRIORITIES.map((p) => (
                  <option key={p} value={p}>
                    {TASK_PRIORITY_LABEL[p]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600">Fecha límite (opcional)</label>
              <input
                type="date"
                name="dueDate"
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
              />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600">Responsable (opcional)</label>
            <select
              name="assigneeUserId"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
            >
              <option value="">Sin asignar</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name?.trim() || m.email}
                </option>
              ))}
            </select>
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
              className="rounded-lg border border-sky-600 bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-700"
            >
              Crear tarea
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/** Escucha el atajo `N` y expone control para el botón de la barra de vistas. */
export function useTaskCreateDialog() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    function onOpenCreate() {
      setOpen(true);
    }
    window.addEventListener("tasks:open-create", onOpenCreate);
    return () => window.removeEventListener("tasks:open-create", onOpenCreate);
  }, []);

  return { open, setOpen };
}
