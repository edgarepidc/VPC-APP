"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { saveEscalationAction } from "@/app/dashboard/escalometro/actions";
import {
  dashAlertError,
  dashAlertOk,
  uiInput,
  uiLabel,
} from "@/lib/ui-classes";
import type { EscalationIndicators } from "@/modules/escalations/service";

type ProjectOption = { id: string; name: string };

type EvaluationPayload = {
  values: EscalationIndicators;
  result: {
    tier: string;
    title: string;
    levelLabel: string;
    actions: string[];
  };
};

type EscalometroClientProps = {
  projects: ProjectOption[];
  canSave: boolean;
};

export function EscalometroClient({ projects, canSave }: EscalometroClientProps) {
  const router = useRouter();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [projectId, setProjectId] = useState("");
  const [topic, setTopic] = useState("");
  const [feedback, setFeedback] = useState<{ type: "ok" | "error"; message: string } | null>(
    null,
  );
  const [pending, startTransition] = useTransition();

  const selectedProject = projects.find((p) => p.id === projectId);

  const pushContextToIframe = useCallback(() => {
    const win = iframeRef.current?.contentWindow;
    if (!win) return;
    win.postMessage(
      {
        type: "escalometro-context",
        projectName: selectedProject?.name ?? "",
        topic: topic.trim(),
      },
      window.location.origin,
    );
  }, [selectedProject?.name, topic]);

  useEffect(() => {
    pushContextToIframe();
  }, [pushContextToIframe]);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    const onLoad = () => pushContextToIframe();
    iframe.addEventListener("load", onLoad);
    return () => iframe.removeEventListener("load", onLoad);
  }, [pushContextToIframe]);

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      if (event.data?.type !== "escalometro-evaluated") return;

      const payload = event.data.payload as EvaluationPayload | undefined;
      if (!payload?.result || !payload.values) return;

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
          message: "Selecciona un proyecto antes de evaluar.",
        });
        return;
      }

      startTransition(async () => {
        const result = await saveEscalationAction({
          projectId,
          topic: topic.trim() || undefined,
          tier: payload.result.tier,
          title: payload.result.title,
          levelLabel: payload.result.levelLabel,
          indicators: payload.values,
          actions: payload.result.actions,
        });

        if (result.ok) {
          router.refresh();
          setFeedback({
            type: "ok",
            message: `Evaluación registrada para ${selectedProject?.name ?? "el proyecto"}.`,
          });
        } else {
          setFeedback({ type: "error", message: result.error });
        }
      });
    };

    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [canSave, projectId, topic, selectedProject?.name, router]);

  return (
    <section className="overflow-hidden rounded-lg border border-slate-200 bg-white">
      <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
          Contexto de evaluación
        </p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className={uiLabel}>Proyecto *</span>
            <select
              value={projectId}
              onChange={(e) => {
                setProjectId(e.target.value);
                setFeedback(null);
              }}
              required
              className={`${uiInput} mt-1`}
            >
              <option value="">Selecciona proyecto</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className={uiLabel}>Subproyecto o tema específico</span>
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="Ej. Fase 2, integración SAP, release Q3…"
              className={`${uiInput} mt-1`}
              maxLength={200}
            />
          </label>
        </div>
        {feedback && (
          <p
            className={`mt-3 ${feedback.type === "ok" ? dashAlertOk : dashAlertError}`}
            role="status"
          >
            {pending ? "Guardando registro…" : feedback.message}
          </p>
        )}
        {!projectId && (
          <p className="mt-2 text-xs text-slate-500">
            Elige el proyecto al que corresponde esta evaluación antes de pulsar Evaluar.
          </p>
        )}
      </div>

      <iframe
        ref={iframeRef}
        title="Super-Escalómetro de Proyectos"
        src="/escalometro.html"
        className="min-h-[780px] w-full border-0 bg-slate-50"
        sandbox="allow-scripts allow-same-origin"
      />
    </section>
  );
}
