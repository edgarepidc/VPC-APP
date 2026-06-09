"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";

import { saveMeetingRoiSessionAction } from "@/app/dashboard/roi-meetings/actions";
import {
  dashAlertError,
  dashAlertOk,
  uiInput,
  uiLabel,
} from "@/lib/ui-classes";

type ProjectOption = { id: string; name: string };

type SessionPayload = {
  objective: string;
  totalCost: number;
  costLevel: string;
  costPerMinute: number;
  totalParticipants: number;
  durationMinutes: number;
  diagnosisTitle: string;
  diagnosisText: string;
  participants: {
    junior: number;
    senior: number;
    director: number;
    tech: number;
  };
  roleCosts: {
    junior: number;
    senior: number;
    director: number;
    tech: number;
  };
};

type RoiMeetingsClientProps = {
  projects: ProjectOption[];
  canSave: boolean;
};

export function RoiMeetingsClient({ projects, canSave }: RoiMeetingsClientProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [projectId, setProjectId] = useState("");
  const [sessionName, setSessionName] = useState("");
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
        type: "roi-meetings-context",
        projectName: selectedProject?.name ?? "",
        sessionName: sessionName.trim(),
      },
      window.location.origin,
    );
  }, [selectedProject?.name, sessionName]);

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
      if (event.data?.type !== "roi-meeting-registered") return;

      const payload = event.data.payload as SessionPayload | undefined;
      if (!payload?.objective || payload.totalCost === undefined) return;

      if (!canSave) {
        setFeedback({
          type: "error",
          message: "No tienes permiso para registrar sesiones.",
        });
        return;
      }

      if (!projectId) {
        setFeedback({
          type: "error",
          message: "Selecciona un proyecto antes de registrar.",
        });
        return;
      }

      startTransition(async () => {
        const result = await saveMeetingRoiSessionAction({
          projectId,
          sessionName: sessionName.trim() || undefined,
          ...payload,
        });

        if (result.ok) {
          setFeedback({
            type: "ok",
            message: `Sesión registrada para ${selectedProject?.name ?? "el proyecto"}.`,
          });
        } else {
          setFeedback({ type: "error", message: result.error });
        }
      });
    };

    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [canSave, projectId, sessionName, selectedProject?.name]);

  return (
    <section className="overflow-hidden rounded-lg border border-slate-200 bg-white">
      <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
          Contexto de sesión
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
            <span className={uiLabel}>Nombre de la sesión</span>
            <input
              type="text"
              value={sessionName}
              onChange={(e) => setSessionName(e.target.value)}
              placeholder="Ej. Sprint planning, comité directivo, war room…"
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
            Elige el proyecto al que corresponde esta sesión antes de pulsar Registrar sesión.
          </p>
        )}
      </div>

      <iframe
        ref={iframeRef}
        title="ROI de Reuniones"
        src="/roi-meetings.html"
        className="min-h-[820px] w-full border-0 bg-slate-50"
        sandbox="allow-scripts allow-same-origin"
      />
    </section>
  );
}
