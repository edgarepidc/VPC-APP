"use client";

import { useState } from "react";

import {
  PROJECT_STATUS_VALUES,
  normalizeProjectStatus,
  type ProjectStatusValue,
} from "@/modules/projects/service";

const STATUS_LABEL: Record<ProjectStatusValue, string> = {
  active: "En curso",
  planning: "Planeación",
  blocked: "Bloqueado / riesgo",
  done: "Cerrado",
};

type Props = {
  updateAction: (formData: FormData) => Promise<void>;
  projectId: string;
  initialName: string;
  initialDescription: string | null;
  initialStatus: string;
};

export function EditProjectForm({
  updateAction,
  projectId,
  initialName,
  initialDescription,
  initialStatus,
}: Props) {
  const [open, setOpen] = useState(false);

  const normalizedStatus = normalizeProjectStatus(initialStatus);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded border border-zinc-300 bg-white px-2 py-1 text-xs font-medium text-zinc-800 hover:bg-zinc-50"
      >
        Editar…
      </button>
    );
  }

  return (
    <div className="min-w-[220px] rounded border border-zinc-200 bg-zinc-50 p-2 text-left shadow-sm">
      <p className="text-[11px] font-medium text-zinc-700">Editar proyecto</p>
      <form action={updateAction} className="mt-2 space-y-2">
        <input type="hidden" name="projectId" value={projectId} />
        <div>
          <label className="text-[10px] text-zinc-600">Nombre</label>
          <input
            name="name"
            required
            maxLength={200}
            defaultValue={initialName}
            className="mt-0.5 w-full rounded border border-zinc-300 px-2 py-1 text-[12px]"
          />
        </div>
        <div>
          <label className="text-[10px] text-zinc-600">Descripción</label>
          <textarea
            name="description"
            rows={2}
            maxLength={2000}
            defaultValue={initialDescription ?? ""}
            className="mt-0.5 w-full rounded border border-zinc-300 px-2 py-1 text-[12px]"
          />
        </div>
        <div>
          <label className="text-[10px] text-zinc-600">Estado</label>
          <select
            name="status"
            defaultValue={normalizedStatus}
            className="mt-0.5 w-full rounded border border-zinc-300 px-2 py-1 text-[12px]"
          >
            {PROJECT_STATUS_VALUES.map((v) => (
              <option key={v} value={v}>
                {STATUS_LABEL[v]}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-wrap gap-2 pt-1">
          <button
            type="submit"
            className="rounded bg-zinc-800 px-2 py-1 text-[11px] font-medium text-white hover:bg-zinc-900"
          >
            Guardar
          </button>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="text-[11px] text-zinc-600 underline"
          >
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
}
