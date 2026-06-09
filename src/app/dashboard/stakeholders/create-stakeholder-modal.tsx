"use client";

import { useMemo, useState } from "react";

import {
  QUADRANT_PLAYBOOK,
  getQuadrantId,
  type QuadrantId,
} from "@/lib/stakeholder-playbook";
import { dashKpiLabel, uiInput } from "@/lib/ui-classes";

import type { MatrixStakeholder } from "./stakeholder-matrix-client";
import { STAKEHOLDER_FIELD_HINTS } from "./stakeholder-field-hints";
import { StakeholderFieldLabel } from "./stakeholder-field-label";

const qPreviewBg: Record<QuadrantId, string> = {
  q1: "bg-green-50 border-green-200 text-green-900",
  q2: "bg-amber-50 border-amber-200 text-amber-900",
  q3: "bg-blue-50 border-blue-200 text-blue-900",
  q4: "bg-slate-50 border-slate-200 text-slate-700",
};

type CreateStakeholderModalProps = {
  projects: { id: string; name: string }[];
  editStakeholder?: MatrixStakeholder | null;
  defaultProjectId?: string;
  createAction: (formData: FormData) => void | Promise<void>;
  updateAction: (formData: FormData) => void | Promise<void>;
  onClose: () => void;
};

export function CreateStakeholderModal({
  projects,
  editStakeholder = null,
  defaultProjectId = "",
  createAction,
  updateAction,
  onClose,
}: CreateStakeholderModalProps) {
  const isEdit = Boolean(editStakeholder);
  const [formProjectId, setFormProjectId] = useState(
    editStakeholder?.projectId ?? defaultProjectId ?? "",
  );
  const [influence, setInfluence] = useState(editStakeholder?.influence ?? 5);
  const [interest, setInterest] = useState(editStakeholder?.interest ?? 5);

  const quadrant = useMemo(() => {
    const id = getQuadrantId(influence, interest);
    return QUADRANT_PLAYBOOK[id];
  }, [influence, interest]);

  const selectedProject = projects.find((p) => p.id === formProjectId);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:p-4 lg:items-center">
      <button
        type="button"
        className="absolute inset-0 bg-black/45"
        aria-label="Cerrar"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="stakeholder-modal-title"
        className="relative flex max-h-[min(94dvh,860px)] w-full max-w-3xl flex-col overflow-hidden rounded-t-2xl border border-slate-200 bg-white shadow-xl sm:rounded-2xl"
      >
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-slate-200 px-5 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Mapa de poder e interés
            </p>
            <h2 id="stakeholder-modal-title" className="mt-1 text-lg font-semibold text-slate-900">
              {isEdit ? "Editar interesado" : "Nuevo interesado"}
            </h2>
            {selectedProject ? (
              <p className="mt-0.5 text-sm text-slate-500">{selectedProject.name}</p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-200 px-2 py-1 text-slate-500 hover:bg-slate-50"
            aria-label="Cerrar"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          <form action={isEdit ? updateAction : createAction} className="space-y-4">
            {isEdit ? <input type="hidden" name="stakeholderId" value={editStakeholder!.id} /> : null}

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="sm:col-span-2">
                <StakeholderFieldLabel hint={STAKEHOLDER_FIELD_HINTS.project} required>
                  Proyecto
                </StakeholderFieldLabel>
                <select
                  name="projectId"
                  required
                  value={formProjectId}
                  onChange={(e) => setFormProjectId(e.target.value)}
                  className={uiInput}
                >
                  <option value="">Seleccionar…</option>
                  {projects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.name}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                <StakeholderFieldLabel hint={STAKEHOLDER_FIELD_HINTS.name} required>
                  Nombre
                </StakeholderFieldLabel>
                <input
                  name="name"
                  required
                  defaultValue={editStakeholder?.name ?? ""}
                  placeholder="Ej. María González"
                  className={uiInput}
                />
              </label>

              <label>
                <StakeholderFieldLabel hint={STAKEHOLDER_FIELD_HINTS.role}>
                  Cargo / rol
                </StakeholderFieldLabel>
                <input
                  name="role"
                  defaultValue={editStakeholder?.role ?? ""}
                  placeholder="Ej. Directora de TI"
                  className={uiInput}
                />
              </label>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <StakeholderFieldLabel hint={STAKEHOLDER_FIELD_HINTS.influence}>
                  Influencia
                </StakeholderFieldLabel>
                <div className="mt-2 flex items-center gap-3">
                  <input
                    type="range"
                    min={0}
                    max={10}
                    value={influence}
                    onChange={(e) => setInfluence(Number(e.target.value))}
                    className="w-full accent-slate-800"
                  />
                  <span className="w-8 font-mono text-sm font-semibold text-slate-900">
                    {influence}
                  </span>
                </div>
                <input type="hidden" name="influence" value={influence} />
              </div>

              <div>
                <StakeholderFieldLabel hint={STAKEHOLDER_FIELD_HINTS.interest}>
                  Interés
                </StakeholderFieldLabel>
                <div className="mt-2 flex items-center gap-3">
                  <input
                    type="range"
                    min={0}
                    max={10}
                    value={interest}
                    onChange={(e) => setInterest(Number(e.target.value))}
                    className="w-full accent-slate-800"
                  />
                  <span className="w-8 font-mono text-sm font-semibold text-slate-900">
                    {interest}
                  </span>
                </div>
                <input type="hidden" name="interest" value={interest} />
              </div>
            </div>

            <div className={`rounded-lg border px-4 py-3 ${qPreviewBg[quadrant.id]}`}>
              <p className={dashKpiLabel}>Cuadrante previsto</p>
              <p className="text-sm font-semibold">{quadrant.fullLabel}</p>
              <p className="mt-1 text-xs opacity-90">Estrategia: {quadrant.strategy}</p>
            </div>

            <label>
              <StakeholderFieldLabel hint={STAKEHOLDER_FIELD_HINTS.observation}>
                Observación
              </StakeholderFieldLabel>
              <textarea
                name="observation"
                rows={3}
                defaultValue={editStakeholder?.observation ?? ""}
                placeholder="Acuerdos de comunicación, riesgos de relación, contexto…"
                className={uiInput}
              />
            </label>

            <div className="flex flex-wrap justify-end gap-2 border-t border-slate-200 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
              >
                {isEdit ? "Guardar cambios" : "Agregar al mapa"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
