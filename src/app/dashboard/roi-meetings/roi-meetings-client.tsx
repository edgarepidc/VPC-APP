"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { saveMeetingRoiSessionAction } from "@/app/dashboard/roi-meetings/actions";
import type { MeetingCalculatorSnapshot } from "@/lib/meeting-roi-calculator";
import {
  dashAlertError,
  dashAlertOk,
  uiInput,
  uiLabel,
} from "@/lib/ui-classes";

import { RoiMeetingsCalculator } from "./roi-meetings-calculator";

type ProjectOption = { id: string; name: string };

type RoiMeetingsClientProps = {
  projects: ProjectOption[];
  canSave: boolean;
};

export function RoiMeetingsClient({ projects, canSave }: RoiMeetingsClientProps) {
  const router = useRouter();
  const [projectId, setProjectId] = useState("");
  const [sessionName, setSessionName] = useState("");
  const [feedback, setFeedback] = useState<{ type: "ok" | "error"; message: string } | null>(
    null,
  );
  const [pending, startTransition] = useTransition();

  function register(snapshot: MeetingCalculatorSnapshot) {
    if (!canSave) {
      setFeedback({ type: "error", message: "No tienes permiso para registrar sesiones." });
      return;
    }
    if (!projectId) {
      setFeedback({ type: "error", message: "Selecciona un proyecto antes de registrar." });
      return;
    }

    startTransition(async () => {
      const result = await saveMeetingRoiSessionAction({
        projectId,
        sessionName: sessionName.trim() || undefined,
        ...snapshot,
      });

      if (result.ok) {
        router.refresh();
        setFeedback({ type: "ok", message: "Sesión registrada correctamente." });
      } else {
        setFeedback({ type: "error", message: result.error });
      }
    });
  }

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
              placeholder="Ej. Sprint planning, comité directivo…"
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
      </div>

      <RoiMeetingsCalculator canRegister={canSave} pending={pending} onRegister={register} />
    </section>
  );
}
