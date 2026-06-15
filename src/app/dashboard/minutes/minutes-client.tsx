"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";

import { ProjectHierarchySelect } from "@/app/dashboard/_components/project-hierarchy-select";
import { saveMeetingMinuteAction } from "@/app/dashboard/minutes/actions";
import { MinuteContentView } from "@/app/dashboard/minutes/minute-content-view";
import { MinutesPrivacyNotice } from "@/app/dashboard/minutes/minutes-privacy-notice";
import { DOCX_ACCEPT } from "@/lib/extract-docx-text";
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

type InputMode = "paste" | "word";

const PROVIDER_STYLES: Record<
  MinuteProvider,
  { active: string; idle: string; dot: string }
> = {
  claude: {
    active: "border-amber-300 bg-amber-50 text-amber-950 ring-2 ring-amber-200",
    idle: "border-slate-200 bg-white text-slate-700 hover:border-amber-200 hover:bg-amber-50/50",
    dot: "bg-amber-500",
  },
  deepseek: {
    active: "border-sky-300 bg-sky-50 text-sky-950 ring-2 ring-sky-200",
    idle: "border-slate-200 bg-white text-slate-700 hover:border-sky-200 hover:bg-sky-50/50",
    dot: "bg-sky-500",
  },
};

export function MinutesClient({
  projects,
  projectGroups,
  canSave,
  aiAvailable,
}: MinutesClientProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [projectId, setProjectId] = useState("");
  const [title, setTitle] = useState("");
  const [meetingDate, setMeetingDate] = useState("");
  const [provider, setProvider] = useState<MinuteProvider>(
    aiAvailable.claude ? "claude" : "deepseek",
  );
  const [customPrompt, setCustomPrompt] = useState(DEFAULT_MINUTE_PROMPT);
  const [inputMode, setInputMode] = useState<InputMode>("word");
  const [transcript, setTranscript] = useState("");
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [draft, setDraft] = useState<GeneratedDraft | null>(null);
  const [feedback, setFeedback] = useState<{ type: "ok" | "error" | "warn"; message: string } | null>(
    null,
  );
  const [generating, setGenerating] = useState(false);
  const [parsingFile, setParsingFile] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [pendingSave, startSaveTransition] = useTransition();

  const selectedProject = projects.find((p) => p.id === projectId);
  const providerReady =
    provider === "claude" ? aiAvailable.claude : aiAvailable.deepseek;

  async function processWordFile(file: File) {
    setParsingFile(true);
    setFeedback(null);
    setDraft(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/minutes/parse-docx", {
        method: "POST",
        body: formData,
      });
      const json = (await res.json()) as {
        error?: string;
        data?: { text: string; fileName: string; charCount: number };
      };

      if (!res.ok || !json.data) {
        setFeedback({
          type: "error",
          message: json.error ?? "No se pudo leer el archivo Word.",
        });
        return;
      }

      setTranscript(json.data.text);
      setUploadedFileName(json.data.fileName);
      setInputMode("paste");
      setFeedback({
        type: "ok",
        message: `Texto extraído de «${json.data.fileName}» (${json.data.charCount.toLocaleString("es-MX")} caracteres). Revísalo y genera la minuta.`,
      });
    } catch {
      setFeedback({ type: "error", message: "Error al subir el archivo Word." });
    } finally {
      setParsingFile(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function handleFileSelect(fileList: FileList | null) {
    const file = fileList?.[0];
    if (!file) return;
    void processWordFile(file);
  }

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
      setFeedback({
        type: "error",
        message: inputMode === "word"
          ? "Adjunta un archivo Word o pega la transcripción."
          : "Pega la transcripción o adjunta un archivo Word.",
      });
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

      <MinutesPrivacyNotice />

      <section className="overflow-hidden rounded-xl border border-indigo-100 bg-white shadow-md">
        <div className="bg-gradient-to-r from-indigo-600 via-violet-600 to-indigo-700 px-4 py-4 text-white sm:px-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-indigo-100">
            Nueva minuta
          </p>
          <p className="mt-1 text-sm text-indigo-50">
            Adjunta tu archivo Word o pega la transcripción. Solo se guarda la minuta final.
          </p>
        </div>

        <div className="border-b border-indigo-50 bg-indigo-50/40 px-4 py-3 sm:px-5">
          <div className="grid gap-3 sm:grid-cols-2">
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
            <div className="block">
              <span className={uiLabel}>Proveedor de IA *</span>
              <div className="mt-1 flex flex-wrap gap-2">
                {MINUTE_PROVIDERS.map((p) => {
                  const disabled = p === "claude" ? !aiAvailable.claude : !aiAvailable.deepseek;
                  const styles = PROVIDER_STYLES[p];
                  const active = provider === p;
                  return (
                    <button
                      key={p}
                      type="button"
                      disabled={disabled}
                      onClick={() => setProvider(p)}
                      className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-40 ${
                        active ? styles.active : styles.idle
                      }`}
                    >
                      <span className={`h-2 w-2 rounded-full ${styles.dot}`} aria-hidden />
                      {MINUTE_PROVIDER_LABELS[p]}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4 px-4 py-4 sm:px-5">
          <label className="block">
            <span className={uiLabel}>Instrucciones para la IA</span>
            <textarea
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              rows={3}
              className={`${uiInput} mt-1 text-sm`}
            />
          </label>

          <div>
            <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-2">
              <button
                type="button"
                onClick={() => setInputMode("word")}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                  inputMode === "word"
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "text-slate-600 hover:bg-indigo-50 hover:text-indigo-800"
                }`}
              >
                Archivo Word
              </button>
              <button
                type="button"
                onClick={() => setInputMode("paste")}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                  inputMode === "paste"
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "text-slate-600 hover:bg-indigo-50 hover:text-indigo-800"
                }`}
              >
                Pegar texto
              </button>
            </div>

            {inputMode === "word" ? (
              <div className="mt-3">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={DOCX_ACCEPT}
                  className="sr-only"
                  id="minute-word-file"
                  onChange={(e) => handleFileSelect(e.target.files)}
                />
                <label
                  htmlFor="minute-word-file"
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragOver(true);
                  }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setDragOver(false);
                    handleFileSelect(e.dataTransfer.files);
                  }}
                  className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-10 text-center transition ${
                    dragOver
                      ? "border-indigo-400 bg-indigo-50"
                      : "border-indigo-200 bg-gradient-to-b from-indigo-50/50 to-white hover:border-indigo-300 hover:bg-indigo-50/70"
                  } ${parsingFile ? "pointer-events-none opacity-60" : ""}`}
                >
                  <span className="text-3xl" aria-hidden>
                    📄
                  </span>
                  <span className="mt-2 text-sm font-medium text-indigo-950">
                    {parsingFile ? "Leyendo documento…" : "Arrastra tu archivo .docx o haz clic"}
                  </span>
                  <span className="mt-1 text-xs text-slate-500">
                    Word moderno (.docx) · máx. 10 MB · no se almacena en el servidor
                  </span>
                </label>
              </div>
            ) : (
              <label className="mt-3 block">
                <span className={uiLabel}>Transcripción *</span>
                {uploadedFileName ? (
                  <p className="mt-0.5 text-xs text-indigo-700">
                    Origen: {uploadedFileName} · puedes editar el texto antes de generar
                  </p>
                ) : (
                  <p className="mt-0.5 text-xs text-slate-500">
                    Solo se usa para generar la minuta; no se guarda en la base de datos.
                  </p>
                )}
                <textarea
                  value={transcript}
                  onChange={(e) => {
                    setTranscript(e.target.value);
                    if (uploadedFileName && !e.target.value.trim()) {
                      setUploadedFileName(null);
                    }
                  }}
                  rows={12}
                  placeholder="Pega aquí la transcripción completa de la reunión…"
                  className={`${uiInput} mt-1 font-mono text-xs`}
                />
                <p className="mt-1 text-xs text-slate-500">
                  {transcript.length.toLocaleString("es-MX")} caracteres
                </p>
              </label>
            )}
          </div>

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
              {generating
                ? "Generando minuta con IA…"
                : parsingFile
                  ? "Extrayendo texto del Word…"
                  : pendingSave
                    ? "Guardando…"
                    : feedback.message}
            </p>
          ) : null}

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void generateMinute()}
              disabled={!canSave || generating || pendingSave || parsingFile}
              className="rounded-lg bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:from-indigo-700 hover:to-violet-700 disabled:opacity-50"
            >
              {generating ? "Generando…" : "Generar minuta"}
            </button>
            {draft ? (
              <button
                type="button"
                onClick={saveMinute}
                disabled={!canSave || generating || pendingSave}
                className="rounded-lg border border-emerald-300 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-900 hover:bg-emerald-100 disabled:opacity-50"
              >
                {pendingSave ? "Guardando…" : "Guardar minuta"}
              </button>
            ) : null}
          </div>
        </div>
      </section>

      {draft ? (
        <section>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-lg bg-violet-50 px-3 py-2">
            <h2 className="text-base font-semibold text-violet-950">Vista previa</h2>
            <p className="text-xs font-medium text-violet-700">
              {MINUTE_PROVIDER_LABELS[draft.provider]} · {draft.model}
            </p>
          </div>
          <MinuteContentView content={draft.content} />
        </section>
      ) : null}

      <MinutesPrivacyNotice compact className="border-slate-200 bg-slate-50/80" />
    </div>
  );
}
