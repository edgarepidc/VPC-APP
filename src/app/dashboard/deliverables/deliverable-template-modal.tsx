"use client";

import { useState } from "react";

import { uiInput, uiLabel } from "@/lib/ui-classes";
import { DELIVERABLE_TEMPLATES } from "@/modules/deliverables/templates";

import { applyDeliverableTemplateAction } from "./actions";
import type { DeliverableTrackerProject } from "./deliverables-tracker";

type DeliverableTemplateModalProps = {
  projects: DeliverableTrackerProject[];
  defaultProjectId?: string;
  onClose: () => void;
  run: (fn: () => Promise<void>) => void;
};

export function DeliverableTemplateModal({
  projects,
  defaultProjectId,
  onClose,
  run,
}: DeliverableTemplateModalProps) {
  const [projectId, setProjectId] = useState(defaultProjectId || projects[0]?.id || "");
  const [templateId, setTemplateId] = useState(DELIVERABLE_TEMPLATES[0]?.id ?? "");
  const [startDate, setStartDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [ownerName, setOwnerName] = useState("");
  const [clientName, setClientName] = useState("");

  const template = DELIVERABLE_TEMPLATES.find((t) => t.id === templateId);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:p-4 lg:items-center">
      <button
        type="button"
        className="absolute inset-0 bg-black/45"
        aria-label="Cerrar"
        onClick={onClose}
      />
      <div className="relative w-full max-w-lg rounded-t-2xl border border-slate-200 bg-white p-5 shadow-xl sm:rounded-2xl">
        <h2 className="text-lg font-semibold text-slate-900">Aplicar plantilla</h2>
        <p className="mt-1 text-sm text-slate-500">
          Crea un paquete de entregables con pesos, fechas y dependencias encadenadas.
        </p>

        <div className="mt-4 space-y-3">
          <div>
            <label className={uiLabel}>Proyecto</label>
            <select
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              className={`${uiInput} mt-1`}
            >
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={uiLabel}>Plantilla</label>
            <select
              value={templateId}
              onChange={(e) => setTemplateId(e.target.value)}
              className={`${uiInput} mt-1`}
            >
              {DELIVERABLE_TEMPLATES.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
            {template ? (
              <p className="mt-1 text-xs text-slate-500">
                {template.description} · {template.items.length} entregables
              </p>
            ) : null}
          </div>
          <div>
            <label className={uiLabel}>Fecha de inicio</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className={`${uiInput} mt-1`}
            />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className={uiLabel}>Responsable</label>
              <input
                value={ownerName}
                onChange={(e) => setOwnerName(e.target.value)}
                className={`${uiInput} mt-1`}
              />
            </div>
            <div>
              <label className={uiLabel}>Cliente</label>
              <input
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                className={`${uiInput} mt-1`}
              />
            </div>
          </div>
        </div>

        <div className="mt-5 flex gap-2">
          <button
            type="button"
            onClick={() =>
              run(async () => {
                if (!projectId || !templateId || !startDate) {
                  alert("Proyecto, plantilla y fecha de inicio son obligatorios.");
                  return;
                }
                const result = await applyDeliverableTemplateAction({
                  projectId,
                  templateId,
                  startDate,
                  ownerName: ownerName.trim(),
                  clientName: clientName.trim(),
                });
                alert(`Se crearon ${result.count} entregables.`);
                onClose();
              })
            }
            className="flex-1 rounded-lg bg-slate-900 py-2 text-sm font-medium text-white hover:bg-slate-800"
          >
            Crear entregables
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm hover:bg-slate-50"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}
