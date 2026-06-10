"use client";

import { useRef, useState } from "react";

import {
  DELIVERABLE_STATUSES,
  DELIVERABLE_STATUS_LABEL,
  type DeliverableStatus,
} from "@/modules/deliverables/constants";
import { clampWeight, TARGET_SUM } from "@/lib/deliverable-weight-utils";
import { uiInput, uiLabel } from "@/lib/ui-classes";
import { ProjectHierarchySelect } from "@/app/dashboard/_components/project-hierarchy-select";
import type { ProjectHierarchyGroup } from "@/lib/project-hierarchy";

import { createDeliverableAction } from "./actions";
import { DeliverableWeightField } from "./deliverable-weight-field";
import type { DeliverableTrackerProject, DeliverableTrackerRow } from "./deliverables-tracker";
import { uploadDeliverablePdfAction } from "./support-actions";

type CreateDeliverableModalProps = {
  allRows: DeliverableTrackerRow[];
  projects: DeliverableTrackerProject[];
  projectGroups: ProjectHierarchyGroup[];
  phaseOptions: string[];
  defaultProjectId?: string;
  onClose: () => void;
  run: (fn: () => Promise<string | void>, okMessage?: string) => void;
};

export function CreateDeliverableModal({
  allRows,
  projects,
  projectGroups,
  phaseOptions,
  defaultProjectId,
  onClose,
  run,
}: CreateDeliverableModalProps) {
  const pdfRef = useRef<File | null>(null);
  const [projectId, setProjectId] = useState(defaultProjectId || projects[0]?.id || "");
  const [title, setTitle] = useState("");
  const [phase, setPhase] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [clientName, setClientName] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [status, setStatus] = useState<DeliverableStatus>("pending");
  const [description, setDescription] = useState("");
  const [acceptanceCriteria, setAcceptanceCriteria] = useState("");
  const [supportUrl, setSupportUrl] = useState("");
  const [dependsOnId, setDependsOnId] = useState("");
  const [pendingPdfName, setPendingPdfName] = useState<string | null>(null);

  const projectRows = allRows.filter((r) => r.projectId === projectId);
  const defaultWeight = Math.max(
    1,
    projectRows.length === 0 ? TARGET_SUM : Math.floor(TARGET_SUM / (projectRows.length + 1)),
  );
  const [weight, setWeight] = useState(defaultWeight);
  const selectedProject = projects.find((p) => p.id === projectId);

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
        aria-labelledby="create-deliverable-title"
        className="relative flex max-h-[min(94dvh,900px)] w-full max-w-6xl flex-col overflow-hidden rounded-t-2xl border border-slate-200 bg-white shadow-xl sm:rounded-2xl"
      >
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-slate-200 px-5 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Contexto de registro
            </p>
            <h2 id="create-deliverable-title" className="mt-1 text-lg font-semibold text-slate-900">
              Nuevo entregable
            </h2>
            {selectedProject ? (
              <p className="mt-0.5 text-sm text-slate-500">{selectedProject.name}</p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-200 px-2 py-1 text-slate-500 hover:bg-slate-50"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
            <div className="space-y-4">
              <div>
                <label className={uiLabel}>Subproyecto *</label>
                <ProjectHierarchySelect
                  value={projectId}
                  onChange={(v) => {
                    setProjectId(v);
                    const siblings = allRows.filter((r) => r.projectId === v);
                    setWeight(
                      Math.max(
                        1,
                        siblings.length === 0
                          ? TARGET_SUM
                          : Math.floor(TARGET_SUM / (siblings.length + 1)),
                      ),
                    );
                  }}
                  groups={projectGroups}
                  allowAll={false}
                  workScopeOnly
                  className={`${uiInput} mt-1`}
                  aria-label="Subproyecto"
                />
              </div>
              <DeliverableWeightField
                value={weight}
                onChange={setWeight}
                projectRows={projectRows}
                compact
              />
              <div>
                <label className={uiLabel}>Estado inicial</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as DeliverableStatus)}
                  className={`${uiInput} mt-1`}
                >
                  {DELIVERABLE_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {DELIVERABLE_STATUS_LABEL[s]}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={uiLabel}>Fecha compromiso *</label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className={`${uiInput} mt-1`}
                />
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className={uiLabel}>Nombre del entregable *</label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ej. Informe de pruebas"
                  className={`${uiInput} mt-1`}
                />
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className={uiLabel}>Fase</label>
                  <input
                    value={phase}
                    onChange={(e) => setPhase(e.target.value)}
                    list="phase-dl-modal"
                    className={`${uiInput} mt-1`}
                  />
                  <datalist id="phase-dl-modal">
                    {phaseOptions.map((f) => (
                      <option key={f} value={f} />
                    ))}
                  </datalist>
                </div>
                <div>
                  <label className={uiLabel}>Responsable *</label>
                  <input
                    value={ownerName}
                    onChange={(e) => setOwnerName(e.target.value)}
                    className={`${uiInput} mt-1`}
                  />
                </div>
              </div>
              <div>
                <label className={uiLabel}>Cliente / destinatario</label>
                <input
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  className={`${uiInput} mt-1`}
                />
              </div>
              <div>
                <label className={uiLabel}>Depende de</label>
                <select
                  value={dependsOnId}
                  onChange={(e) => setDependsOnId(e.target.value)}
                  className={`${uiInput} mt-1`}
                >
                  <option value="">Sin dependencia</option>
                  {projectRows.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.title}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={uiLabel}>Descripción</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  className={`${uiInput} mt-1 resize-y`}
                />
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className={uiLabel}>Criterios de aceptación</label>
                <textarea
                  value={acceptanceCriteria}
                  onChange={(e) => setAcceptanceCriteria(e.target.value)}
                  rows={4}
                  className={`${uiInput} mt-1 resize-y`}
                />
              </div>
              <div className="rounded-lg border border-slate-200 p-3">
                <p className={uiLabel}>Soporte documental</p>
                <label className="mt-2 block">
                  <span className="text-xs text-slate-600">Enlace a carpeta</span>
                  <input
                    type="url"
                    value={supportUrl}
                    onChange={(e) => setSupportUrl(e.target.value)}
                    placeholder="https://…"
                    className={`${uiInput} mt-1`}
                  />
                </label>
                <label className="mt-3 block">
                  <span className="text-xs text-slate-600">PDF (opcional, máx. 10 MB)</span>
                  <input
                    type="file"
                    accept="application/pdf,.pdf"
                    className={`${uiInput} mt-1 text-xs`}
                    onChange={(e) => {
                      const file = e.target.files?.[0] ?? null;
                      pdfRef.current = file;
                      setPendingPdfName(file?.name ?? null);
                    }}
                  />
                </label>
                {pendingPdfName ? (
                  <p className="mt-1 text-xs text-slate-500">Se subirá: {pendingPdfName}</p>
                ) : null}
              </div>
            </div>
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap gap-2 border-t border-slate-200 bg-slate-50 px-5 py-4">
          <button
            type="button"
            onClick={() =>
              run(async () => {
                if (!title.trim() || !ownerName.trim() || !dueDate) {
                  throw new Error("Nombre, responsable y fecha compromiso son obligatorios.");
                }
                const result = await createDeliverableAction({
                  projectId,
                  title: title.trim(),
                  phase: phase.trim(),
                  ownerName: ownerName.trim(),
                  clientName: clientName.trim(),
                  dueDate,
                  status,
                  weight: clampWeight(weight),
                  description: description.trim(),
                  acceptanceCriteria: acceptanceCriteria.trim(),
                  supportUrl: supportUrl.trim(),
                  dependsOnId: dependsOnId || null,
                });
                if (pdfRef.current) {
                  const fd = new FormData();
                  fd.append("deliverableId", result.id);
                  fd.append("file", pdfRef.current);
                  const up = await uploadDeliverablePdfAction(fd);
                  if (!up.ok) {
                    throw new Error(up.error);
                  }
                }
                onClose();
              })
            }
            className="rounded-lg border border-slate-800 bg-slate-800 px-5 py-2 text-sm font-medium text-white hover:bg-slate-900"
          >
            Registrar entregable
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm hover:bg-slate-100"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}
