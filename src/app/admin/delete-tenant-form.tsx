"use client";

import { useState } from "react";

type Props = {
  deleteAction: (formData: FormData) => Promise<void>;
  tenantId: string;
  tenantSlug: string;
  tenantName: string;
  /** Tras borrar: ir a cartera (`/admin`) o a lista de tenants */
  next: "cartera" | "tenants";
  /** Estilos para encajar en la tabla de la cartera */
  compact?: boolean;
};

export function DeleteTenantForm({
  deleteAction,
  tenantId,
  tenantSlug,
  tenantName,
  next,
  compact,
}: Props) {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={
          compact
            ? "rounded-md border border-rose-200 bg-white px-2 py-1 text-[11px] font-medium text-rose-800 hover:bg-rose-50"
            : "rounded-md border border-rose-200 bg-white px-2 py-1 text-xs font-medium text-rose-800 hover:bg-rose-50"
        }
      >
        Eliminar…
      </button>
    );
  }

  return (
    <div
      className={
        compact
          ? "min-w-[200px] rounded-md border border-rose-200 bg-rose-50 p-2 text-left shadow-sm"
          : "rounded-md border border-rose-200 bg-rose-50 p-3 text-left"
      }
    >
      <p className="text-[11px] leading-snug text-rose-950">
        Se eliminará <span className="font-semibold">{tenantName}</span> y todo
        lo asociado (proyectos, miembros, riesgos, etc.). No se puede deshacer.
      </p>
      <form action={deleteAction} className="mt-2 space-y-2">
        <input type="hidden" name="tenantId" value={tenantId} />
        <input type="hidden" name="next" value={next} />
        <label className="block text-[11px] text-rose-900">
          Escribe el slug{" "}
          <code className="rounded bg-white px-1 font-mono text-[11px]">
            {tenantSlug}
          </code>{" "}
          para confirmar:
          <input
            name="confirmSlug"
            required
            autoComplete="off"
            placeholder={tenantSlug}
            className="mt-1 block w-full rounded border border-rose-300 px-2 py-1 text-[12px] text-slate-900"
          />
        </label>
        <div className="flex flex-wrap gap-2">
          <button
            type="submit"
            className="rounded bg-rose-700 px-2 py-1 text-[11px] font-medium text-white hover:bg-rose-800"
          >
            Eliminar definitivamente
          </button>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="text-[11px] font-medium text-rose-800 underline"
          >
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
}
