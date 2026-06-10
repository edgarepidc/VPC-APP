"use client";

import { useMemo, useState } from "react";

import type { RiskFormPrefill } from "@/lib/escalation-risk-prefill";
import { ProjectHierarchySelect } from "@/app/dashboard/_components/project-hierarchy-select";
import type { ProjectHierarchyGroup } from "@/lib/project-hierarchy";
import { dashAlertWarn, dashKpiLabel, uiInput } from "@/lib/ui-classes";

import { RISK_FIELD_HINTS } from "./risk-field-hints";
import { RiskFieldLabel } from "./risk-field-label";
import {
  fmtMoneyMxn,
  RISK_CATEGORIES,
  residualScore,
  vmeGross,
  vmeResidual,
} from "./risk-utils";

type CreateRiskModalProps = {
  projects: { id: string; name: string }[];
  projectGroups: ProjectHierarchyGroup[];
  deliverables: { id: string; title: string; projectId: string }[];
  prefill?: RiskFormPrefill | null;
  createAction: (formData: FormData) => void | Promise<void>;
  onClose: () => void;
};

export function CreateRiskModal({
  projects,
  projectGroups,
  deliverables,
  prefill = null,
  createAction,
  onClose,
}: CreateRiskModalProps) {
  const [formProjectId, setFormProjectId] = useState(prefill?.projectId ?? "");
  const [prob, setProb] = useState(prefill?.probability ?? 50);
  const [resProb, setResProb] = useState(prefill?.residualProb ?? 20);
  const [impact, setImpact] = useState(prefill?.impactAmount ?? 50_000);

  const formDeliverables = useMemo(
    () =>
      formProjectId
        ? deliverables.filter((d) => d.projectId === formProjectId)
        : deliverables,
    [deliverables, formProjectId],
  );

  const preview = useMemo(() => {
    const g = vmeGross(prob, impact);
    const r = vmeResidual(resProb, impact);
    return { gross: g, residual: r, saving: g - r };
  }, [prob, resProb, impact]);

  const selectedProject = projects.find((p) => p.id === formProjectId);

  function resetSliders() {
    setProb(50);
    setResProb(20);
    setImpact(50_000);
  }

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
        aria-labelledby="create-risk-title"
        className="relative flex max-h-[min(94dvh,900px)] w-full max-w-4xl flex-col overflow-hidden rounded-t-2xl border border-slate-200 bg-white shadow-xl sm:rounded-2xl"
      >
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-slate-200 px-5 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Contexto de registro
            </p>
            <h2 id="create-risk-title" className="mt-1 text-lg font-semibold text-slate-900">
              Nuevo riesgo
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
          {prefill ? (
            <p className={`mb-4 ${dashAlertWarn}`}>
              Formulario prellenado desde una evaluación del Escalómetro. Revisa y ajusta antes de
              guardar.
            </p>
          ) : null}

          <form
            action={createAction}
            onSubmit={(e) => {
              const fd = new FormData(e.currentTarget);
              const rp = Number(fd.get("residualProb") ?? 20);
              const imp = Number(fd.get("impactAmount") ?? 0);
              const cont = String(fd.get("contingency") ?? "").trim();
              const rs = residualScore(rp, imp);
              if (rs > 10 && !cont) {
                e.preventDefault();
                window.alert(
                  "Plan de contingencia obligatorio cuando el score residual es mayor que 10 (umbral de tolerancia).",
                );
              }
            }}
            className="space-y-4"
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="sm:col-span-2">
                <RiskFieldLabel hint={RISK_FIELD_HINTS.title} required>
                  Descripción del riesgo
                </RiskFieldLabel>
                <textarea
                  name="title"
                  required
                  rows={3}
                  defaultValue={prefill?.title ?? ""}
                  placeholder="Describe el riesgo, causa y consecuencia posible…"
                  className={uiInput}
                />
              </label>
              <label>
                <RiskFieldLabel hint={RISK_FIELD_HINTS.category}>Categoría</RiskFieldLabel>
                <select
                  name="category"
                  defaultValue={prefill?.category ?? RISK_CATEGORIES[0]}
                  className={uiInput}
                >
                  {RISK_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <RiskFieldLabel hint={RISK_FIELD_HINTS.owner} required>
                  Dueño del riesgo
                </RiskFieldLabel>
                <input
                  name="ownerName"
                  required
                  placeholder="Nombre o área responsable"
                  className={uiInput}
                />
              </label>
              <label className="sm:col-span-2">
                <RiskFieldLabel hint={RISK_FIELD_HINTS.project} required>
                  Subproyecto
                </RiskFieldLabel>
                <ProjectHierarchySelect
                  name="projectId"
                  value={formProjectId}
                  onChange={setFormProjectId}
                  groups={projectGroups}
                  allowAll={false}
                  workScopeOnly
                  className={uiInput}
                  aria-label="Subproyecto"
                />
              </label>
              <label className="sm:col-span-2">
                <RiskFieldLabel hint={RISK_FIELD_HINTS.deliverable}>
                  Entregable (opcional)
                </RiskFieldLabel>
                <select name="deliverableId" className={uiInput}>
                  <option value="">—</option>
                  {formDeliverables.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.title}
                    </option>
                  ))}
                </select>
              </label>
              <label className="sm:col-span-2">
                <RiskFieldLabel hint={RISK_FIELD_HINTS.probability}>
                  Probabilidad de ocurrencia ({prob}%)
                </RiskFieldLabel>
                <input
                  type="range"
                  name="probability"
                  min={1}
                  max={100}
                  value={prob}
                  onChange={(e) => setProb(+e.target.value)}
                  className="mt-1 h-2 w-full cursor-pointer accent-blue-600"
                />
              </label>
              <label className="sm:col-span-2">
                <RiskFieldLabel hint={RISK_FIELD_HINTS.impact}>
                  Impacto financiero (MXN)
                </RiskFieldLabel>
                <input
                  name="impactAmount"
                  type="number"
                  min={0}
                  value={impact}
                  onChange={(e) => setImpact(+e.target.value || 0)}
                  className={`${uiInput} tabular-nums`}
                />
              </label>
              <label className="sm:col-span-2">
                <RiskFieldLabel hint={RISK_FIELD_HINTS.dueDate}>
                  Fecha de caducidad (opcional)
                </RiskFieldLabel>
                <input name="dueDate" type="date" className={uiInput} />
              </label>
            </div>

            <div className="flex items-center gap-2 border-t border-slate-200 pt-4">
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
              <p className="text-sm font-semibold text-slate-900">Plan de respuesta</p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="sm:col-span-2">
                <RiskFieldLabel hint={RISK_FIELD_HINTS.mitigation}>
                  Acción de mitigación
                </RiskFieldLabel>
                <textarea
                  name="mitigation"
                  rows={2}
                  defaultValue={prefill?.mitigation ?? ""}
                  placeholder="¿Qué acciones reducen la probabilidad?"
                  className={uiInput}
                />
              </label>
              <label className="sm:col-span-2">
                <RiskFieldLabel hint={RISK_FIELD_HINTS.residualProb}>
                  Probabilidad residual ({resProb}%)
                </RiskFieldLabel>
                <input
                  type="range"
                  name="residualProb"
                  min={1}
                  max={100}
                  value={resProb}
                  onChange={(e) => setResProb(+e.target.value)}
                  className="mt-1 h-2 w-full cursor-pointer accent-blue-600"
                />
              </label>
              <label className="sm:col-span-2">
                <RiskFieldLabel hint={RISK_FIELD_HINTS.trigger}>
                  Disparador del Plan B
                </RiskFieldLabel>
                <input
                  name="trigger"
                  defaultValue={prefill?.trigger ?? ""}
                  placeholder="Ej.: Si la entrega no ocurre antes de semana 4…"
                  className={uiInput}
                />
              </label>
              <label className="sm:col-span-2">
                <RiskFieldLabel hint={RISK_FIELD_HINTS.contingency}>
                  Plan de contingencia / Plan B
                </RiskFieldLabel>
                <p className="mb-1 text-xs text-slate-500">
                  Obligatorio si el score residual es mayor que 10.
                </p>
                <textarea
                  name="contingency"
                  rows={2}
                  placeholder="Plan alternativo de respuesta…"
                  className={uiInput}
                />
              </label>
            </div>

            <div className="grid grid-cols-3 gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm">
              <div>
                <p className={dashKpiLabel}>VME bruto</p>
                <p className="mt-1 text-lg font-semibold tabular-nums text-red-600">
                  {fmtMoneyMxn(preview.gross)}
                </p>
              </div>
              <div>
                <p className={dashKpiLabel}>VME residual</p>
                <p className="mt-1 text-lg font-semibold tabular-nums text-blue-600">
                  {fmtMoneyMxn(preview.residual)}
                </p>
              </div>
              <div>
                <p className={dashKpiLabel}>Ahorro</p>
                <p className="mt-1 text-lg font-semibold tabular-nums text-emerald-600">
                  {fmtMoneyMxn(preview.saving)}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 border-t border-slate-200 pt-4">
              <button
                type="submit"
                className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
              >
                Registrar riesgo
              </button>
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                onClick={resetSliders}
              >
                Restablecer sliders
              </button>
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                onClick={onClose}
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
