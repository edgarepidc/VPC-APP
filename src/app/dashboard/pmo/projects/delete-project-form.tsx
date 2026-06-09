"use client";

import { useState } from "react";

type Props = {
  deleteAction: (formData: FormData) => Promise<void>;
  projectId: string;
  projectName: string;
};

export function DeleteProjectForm({
  deleteAction,
  projectId,
  projectName,
}: Props) {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded border border-rose-200 bg-white px-2 py-1 text-xs font-medium text-rose-800 hover:bg-rose-50"
      >
        Eliminar…
      </button>
    );
  }

  return (
    <div className="rounded border border-rose-200 bg-rose-50 p-2 text-left">
      <p className="text-[11px] text-rose-950">
        ¿Eliminar <span className="font-semibold">{projectName}</span>? Se
        borran tareas, entregables, riesgos e interesados de este proyecto.
      </p>
      <form action={deleteAction} className="mt-2 flex flex-wrap gap-2">
        <input type="hidden" name="projectId" value={projectId} />
        <button
          type="submit"
          className="rounded bg-rose-700 px-2 py-1 text-[11px] font-medium text-white hover:bg-rose-800"
        >
          Sí, eliminar
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-[11px] font-medium text-rose-800 underline"
        >
          Cancelar
        </button>
      </form>
    </div>
  );
}
