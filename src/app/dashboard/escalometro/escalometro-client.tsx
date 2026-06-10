"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { saveEscalationAction } from "@/app/dashboard/escalometro/actions";
import type { EscalationEvaluation } from "@/lib/escalation-evaluate";
import {
  dashAlertError,
  dashAlertOk,
  uiInput,
  uiLabel,
} from "@/lib/ui-classes";
import type { EscalationIndicators } from "@/modules/escalations/service";

import { EscalometroCalculator } from "./escalometro-calculator";

import { ProjectHierarchySelect } from "@/app/dashboard/_components/project-hierarchy-select";
import type { ProjectHierarchyGroup } from "@/lib/project-hierarchy";

type ProjectOption = { id: string; name: string };

type EscalometroClientProps = {
  projects: ProjectOption[];
  projectGroups: ProjectHierarchyGroup[];
  canSave: boolean;
};

export function EscalometroClient({ projects, projectGroups, canSave }: EscalometroClientProps) {
  const router = useRouter();
  const [projectId, setProjectId] = useState("");
  const [topic, setTopic] = useState("");
  const [feedback, setFeedback] = useState<{ type: "ok" | "error"; message: string } | null>(
    null,
  );
  const [pending, startTransition] = useTransition();

  const selectedProject = projects.find((p) => p.id === projectId);

  function handleEvaluate(values: EscalationIndicators, result: EscalationEvaluation) {
    if (!canSave) {
      setFeedback({
        type: "error",
        message: "No tienes permiso para registrar evaluaciones.",
      });
      return;
    }
    if (!projectId) {
      setFeedback({
        type: "error",
        message: "Selecciona un subproyecto antes de evaluar.",
      });
      return;
    }

    startTransition(async () => {
      const saveResult = await saveEscalationAction({
        projectId,
        topic: topic.trim() || undefined,
        tier: result.tier,
        title: result.title,
        levelLabel: result.levelLabel,
        indicators: values,
        actions: result.actions,
      });

      if (saveResult.ok) {
        router.refresh();
        setFeedback({
          type: "ok",
          message: `Evaluación registrada para ${selectedProject?.name ?? "el proyecto"}.`,
        });
      } else {
        setFeedback({ type: "error", message: saveResult.error });
      }
    });
  }

  return (
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
          Contexto de evaluación
        </p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className={uiLabel}>Subproyecto *</span>
            <ProjectHierarchySelect
              value={projectId}
              onChange={(v) => {
                setProjectId(v);
                setFeedback(null);
              }}
              groups={projectGroups}
              allowAll={false}
              workScopeOnly
              className={`${uiInput} mt-1`}
              aria-label="Subproyecto"
            />
          </label>
          <label className="block">
            <span className={uiLabel}>Tema o situación (opcional)</span>
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="Ej. Fase 2, integración SAP…"
              className={`${uiInput} mt-1`}
              maxLength={200}
            />
          </label>
        </div>
        {feedback ? (
          <p
            className={`mt-3 ${feedback.type === "ok" ? dashAlertOk : dashAlertError}`}
            role="status"
          >
            {pending ? "Guardando registro…" : feedback.message}
          </p>
        ) : null}
        {!projectId ? (
          <p className="mt-2 text-xs text-slate-500">
            Elige el subproyecto al que corresponde esta evaluación antes de pulsar Evaluar.
          </p>
        ) : null}
      </div>

      <EscalometroCalculator onEvaluate={handleEvaluate} />
    </section>
  );
}
