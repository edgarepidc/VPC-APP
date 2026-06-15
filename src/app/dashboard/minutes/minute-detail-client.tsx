"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";

import {
  deleteMeetingMinuteAction,
  updateMeetingMinuteMarkdownAction,
} from "@/app/dashboard/minutes/actions";
import { MinuteMarkdownEditor } from "@/app/dashboard/minutes/minute-markdown-editor";
import { MinutesSectionShell } from "@/app/dashboard/minutes/minutes-section-shell";
import { MINUTE_PROVIDER_LABELS } from "@/lib/meeting-minute-types";
import { resolveMeetingMinuteMarkdown } from "@/lib/meeting-minute-markdown";
import { MINUTES_HUB } from "@/lib/dashboard-paths";
import type { MeetingMinuteRow } from "@/lib/meeting-minute-types";
import { formatEscalationDateTime } from "@/lib/escalation-utils";
import { dashAlertError, dashAlertOk } from "@/lib/ui-classes";

type MinuteDetailClientProps = {
  minute: MeetingMinuteRow;
  canEdit: boolean;
};

export function MinuteDetailClient({ minute, canEdit }: MinuteDetailClientProps) {
  const router = useRouter();
  const initialMarkdown = useMemo(
    () => resolveMeetingMinuteMarkdown(minute),
    [minute],
  );
  const [markdown, setMarkdown] = useState(initialMarkdown);
  const [savedMarkdown, setSavedMarkdown] = useState(initialMarkdown);
  const [pendingDelete, startDeleteTransition] = useTransition();
  const [pendingSave, startSaveTransition] = useTransition();
  const [feedback, setFeedback] = useState<{ type: "ok" | "error"; message: string } | null>(
    null,
  );

  const metaLine = [
    minute.project.name,
    minute.authorName,
    MINUTE_PROVIDER_LABELS[minute.provider],
    minute.model,
    `Guardada ${formatEscalationDateTime(new Date(minute.createdAt))}`,
    minute.meetingDate
      ? `Reunión ${formatEscalationDateTime(new Date(minute.meetingDate))}`
      : null,
  ]
    .filter(Boolean)
    .join(" · ");

  function remove() {
    if (!window.confirm("¿Eliminar esta minuta? Esta acción no se puede deshacer.")) return;
    startDeleteTransition(async () => {
      const result = await deleteMeetingMinuteAction(minute.id);
      if (result.ok) {
        router.push(MINUTES_HUB);
        router.refresh();
      } else {
        setFeedback({ type: "error", message: result.error });
      }
    });
  }

  function saveMarkdown() {
    if (!markdown.trim()) {
      setFeedback({ type: "error", message: "La minuta en Markdown no puede estar vacía." });
      return;
    }

    startSaveTransition(async () => {
      const result = await updateMeetingMinuteMarkdownAction({
        minuteId: minute.id,
        markdown,
      });
      if (result.ok) {
        setSavedMarkdown(markdown);
        setFeedback({ type: "ok", message: "Cambios guardados." });
        router.refresh();
      } else {
        setFeedback({ type: "error", message: result.error });
      }
    });
  }

  return (
    <div className="space-y-6">
      <MinutesSectionShell
        eyebrow="Minuta guardada"
        title={minute.title}
        subtitle={metaLine}
        headerExtra={
          <div className="flex flex-wrap gap-2">
            <Link
              href={MINUTES_HUB}
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Volver al listado
            </Link>
            {canEdit ? (
              <>
                {markdown !== savedMarkdown ? (
                  <button
                    type="button"
                    onClick={saveMarkdown}
                    disabled={pendingSave || pendingDelete}
                    className="rounded-lg bg-slate-800 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
                  >
                    {pendingSave ? "Guardando…" : "Guardar cambios"}
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={remove}
                  disabled={pendingDelete || pendingSave}
                  className="rounded-lg border border-red-200 bg-white px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
                >
                  {pendingDelete ? "Eliminando…" : "Eliminar"}
                </button>
              </>
            ) : null}
          </div>
        }
      >
        <div className="p-4">
          {feedback ? (
            <p
              className={`mb-4 ${feedback.type === "ok" ? dashAlertOk : dashAlertError}`}
              role="status"
            >
              {feedback.message}
            </p>
          ) : null}
          <MinuteMarkdownEditor
            value={markdown}
            onChange={(value) => {
              setMarkdown(value);
              setFeedback(null);
            }}
            readOnly={!canEdit}
          />
        </div>
      </MinutesSectionShell>
    </div>
  );
}
