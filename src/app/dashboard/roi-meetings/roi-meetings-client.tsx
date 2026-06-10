"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { ProjectHierarchySelect } from "@/app/dashboard/_components/project-hierarchy-select";
import { saveMeetingRoiSessionAction } from "@/app/dashboard/roi-meetings/actions";
import type { MeetingCalculatorSnapshot } from "@/lib/meeting-roi-calculator";
import type { ProjectHierarchyGroup } from "@/lib/project-hierarchy";
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
  projectGroups: ProjectHierarchyGroup[];
  canSave: boolean;
};

export function RoiMeetingsClient({ projects, projectGroups, canSave }: RoiMeetingsClientProps) {
  const router = useRouter();
  const [projectId, setProjectId] = useState("");
  const [sessionName, setSessionName] = useState("");
  const [feedback, setFeedback] = useState<{ type: "ok" | "error"; message: string } | null>(
    null,
  );
  const [pending, startTransition] = useTransition();

  const selectedProject = projects.find((p) => p.id === projectId);

  function register(snapshot: MeetingCalculatorSnapshot) {
    if (!canSave) {
      setFeedback({ type: "error", message: "No tienes permiso para registrar sesiones." });
      return;
    }
    if (!projectId) {
      setFeedback({ type: "error", message: "Selecciona un subproyecto antes de registrar." });
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
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
          Contexto de sesión
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
            {selectedProject ? (
              <span className="mt-1 block text-xs text-slate-500">{selectedProject.name}</span>
            ) : null}
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
