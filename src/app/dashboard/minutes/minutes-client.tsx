"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { ProjectHierarchySelect } from "@/app/dashboard/_components/project-hierarchy-select";
import { saveMeetingMinuteAction } from "@/app/dashboard/minutes/actions";
import { MinuteContentView } from "@/app/dashboard/minutes/minute-content-view";
import {
  DEFAULT_MINUTE_PROMPT,
  MINUTE_PROVIDERS,
  MINUTE_PROVIDER_LABELS,
  type MeetingMinuteContent,
  type MinuteProvider,
} from "@/lib/meeting-minute-types";
import { MINUTES_DETAIL } from "@/lib/dashboard-paths";
import type { ProjectHierarchyGroup } from "@/lib/project-hierarchy";
import {
  dashAlertError,
  dashAlertOk,
  dashAlertWarn,
  uiInput,
  uiLabel,
} from "@/lib/ui-classes";

type ProjectOption = { id: string; name: string };

type MinutesClientProps = {
  projects: ProjectOption[];
  projectGroups: ProjectHierarchyGroup[];
  canSave: boolean;
  aiAvailable: { claude: boolean; deepseek: boolean };
};

type GeneratedDraft = {
  content: MeetingMinuteContent;
  provider: MinuteProvider;
  model: string;
};

export function MinutesClient({
  projects,
  projectGroups,
  canSave,
  aiAvailable,
}: MinutesClientProps) {
  const router = useRouter();
  const [projectId, setProjectId] = useState("");
  const [title, setTitle] = useState("");
  const [meetingDate, setMeetingDate] = useState("");
  const [provider, setProvider] = useState<MinuteProvider>(
    aiAvailable.claude ? "claude" : "deepseek",
  );
  const [customPrompt, setCustomPrompt] = useState(DEFAULT_MINUTE_PROMPT);
  const [transcript, setTranscript] = useState("");
  const [draft, setDraft] = useState<GeneratedDraft | null>(null);
  const [feedback, setFeedback] = useState<{ type: "ok" | "error" | "warn"; message: string } | null>(
    null,
  );
  const [generating, setGenerating] = useState(false);
  const [pendingSave, startSaveTransition] = useTransition();

  const selectedProject = projects.find((p) => p.id === projectId);
  const providerReady =
    provider === "claude" ? aiAvailable.claude : aiAvailable.deepseek;

  async function generateMinute() {
    if (!canSave) {
      setFeedback({ type: "error", message: "No tienes permiso para generar minutas." });
      return;
    }
    if (!projectId) {
      setFeedback({ type: "error", message: "Selecciona un subproyecto." });
      return;
    }
    if (!transcript.trim()) {
      setFeedback({ type: "error", message: "Pega la transcripción de la reunión." });
      return;
    }
    if (!providerReady) {
      setFeedback({
        type: "error",
        message: `El proveedor ${MINUTE_PROVIDER_LABELS[provider]} no está disponible: falta AI Gateway.`,
      });
      return;
    }

    setGenerating(true);
    setFeedback(null);
    setDraft(null);

    try {
      const res = await fetch("/api/minutes/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          transcript,
          provider,
          customPrompt,
        }),
      });
      const json = (await res.json()) as {
        error?: string;
        data?: GeneratedDraft;
      };

      if (!res.ok || !json.data) {
        setFeedback({
          type: "error",
          message: json.error ?? "No se pudo generar la minuta.",
        });
        return;
      }

      setDraft(json.data);
      if (!title.trim()) {
        const dateLabel = meetingDate
          ? new Date(meetingDate).toLocaleDateString("es-MX")
          : new Date().toLocaleDateString("es-MX");
        setTitle(`Minuta ${dateLabel}${selectedProject ? ` · ${selectedProject.name}` : ""}`);
      }
      setFeedback({
        type: "ok",
        message: "Minuta generada. Revisa el contenido y guárdala cuando esté lista.",
      });
    } catch {
      setFeedback({ type: "error", message: "Error de red al generar la minuta." });
    } finally {
      setGenerating(false);
    }
  }

  function saveMinute() {
    if (!draft) return;
    if (!title.trim()) {
      setFeedback({ type: "error", message: "Indica un título antes de guardar." });
      return;
    }

    startSaveTransition(async () => {
      const result = await saveMeetingMinuteAction({
        projectId,
        title,
        meetingDate: meetingDate || undefined,
        content: draft.content,
        provider: draft.provider,
        model: draft.model,
      });

      if (result.ok) {
        router.push(MINUTES_DETAIL(result.id));
      } else {
        setFeedback({ type: "error", message: result.error });
      }
    });
  }

  return (
    <div className="space-y-6">
      {!aiAvailable.claude && !aiAvailable.deepseek ? (
        <p className={dashAlertWarn} role="status">
          Configura Vercel AI Gateway o define AI_GATEWAY_API_KEY para habilitar la generación
          con IA.
        </p>
      ) : null}

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Nueva minuta
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
              <span className={uiLabel}>Título</span>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ej. Comité semanal, kick-off fase 2…"
                className={`${uiInput} mt-1`}
                maxLength={200}
              />
            </label>
            <label className="block">
              <span className={uiLabel}>Fecha de la reunión</span>
              <input
                type="date"
                value={meetingDate}
                onChange={(e) => setMeetingDate(e.target.value)}
                className={`${uiInput} mt-1`}
              />
            </label>
            <label className="block">
              <span className={uiLabel}>Proveedor de IA *</span>
              <select
                value={provider}
                onChange={(e) => setProvider(e.target.value as MinuteProvider)}
                className={`${uiInput} mt-1`}
              >
                {MINUTE_PROVIDERS.map((p) => (
                  <option key={p} value={p} disabled={p === "claude" ? !aiAvailable.claude : !aiAvailable.deepseek}>
                    {MINUTE_PROVIDER_LABELS[p]}
                    {p === "claude" && !aiAvailable.claude ? " (no configurado)" : ""}
                    {p === "deepseek" && !aiAvailable.deepseek ? " (no configurado)" : ""}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>

        <div className="space-y-4 px-4 py-4">
          <label className="block">
            <span className={uiLabel}>Instrucciones para la IA</span>
            <textarea
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              rows={3}
              className={`${uiInput} mt-1 text-sm`}
            />
          </label>

          <label className="block">
            <span className={uiLabel}>Transcripción *</span>
            <p className="mt-0.5 text-xs text-slate-500">
              Solo se usa para generar la minuta; no se guarda en la base de datos.
            </p>
            <textarea
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
              rows={12}
              placeholder="Pega aquí la transcripción completa de la reunión…"
              className={`${uiInput} mt-1 font-mono text-xs`}
            />
            <p className="mt-1 text-xs text-slate-500">
              {transcript.length.toLocaleString("es-MX")} caracteres
            </p>
          </label>

          {feedback ? (
            <p
              className={
                feedback.type === "ok"
                  ? dashAlertOk
                  : feedback.type === "warn"
                    ? dashAlertWarn
                    : dashAlertError
              }
              role="status"
            >
              {generating ? "Generando minuta con IA…" : pendingSave ? "Guardando…" : feedback.message}
            </p>
          ) : null}

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void generateMinute()}
              disabled={!canSave || generating || pendingSave}
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
            >
              {generating ? "Generando…" : "Generar minuta"}
            </button>
            {draft ? (
              <button
                type="button"
                onClick={saveMinute}
                disabled={!canSave || generating || pendingSave}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50 disabled:opacity-50"
              >
                {pendingSave ? "Guardando…" : "Guardar minuta"}
              </button>
            ) : null}
          </div>
        </div>
      </section>

      {draft ? (
        <section>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-base font-semibold text-slate-900">Vista previa</h2>
            <p className="text-xs text-slate-500">
              {MINUTE_PROVIDER_LABELS[draft.provider]} · {draft.model}
            </p>
          </div>
          <MinuteContentView content={draft.content} />
        </section>
      ) : null}
    </div>
  );
}
