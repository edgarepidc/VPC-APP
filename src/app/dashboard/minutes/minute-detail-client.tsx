"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { deleteMeetingMinuteAction } from "@/app/dashboard/minutes/actions";
import { MinuteContentView } from "@/app/dashboard/minutes/minute-content-view";
import { MinutesPrivacyNotice } from "@/app/dashboard/minutes/minutes-privacy-notice";
import { MINUTE_PROVIDER_LABELS } from "@/lib/meeting-minute-types";
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
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{ type: "ok" | "error"; message: string } | null>(
    null,
  );

  function remove() {
    if (!window.confirm("¿Eliminar esta minuta? Esta acción no se puede deshacer.")) return;
    startTransition(async () => {
      const result = await deleteMeetingMinuteAction(minute.id);
      if (result.ok) {
        router.push(MINUTES_HUB);
        router.refresh();
      } else {
        setFeedback({ type: "error", message: result.error });
      }
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm text-slate-600">{minute.project.name}</p>
          <p className="mt-1 text-xs text-slate-500">
            {minute.authorName} · {MINUTE_PROVIDER_LABELS[minute.provider]} · {minute.model} ·{" "}
            Guardada {formatEscalationDateTime(new Date(minute.createdAt))}
            {minute.meetingDate
              ? ` · Reunión ${formatEscalationDateTime(new Date(minute.meetingDate))}`
              : ""}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href={MINUTES_HUB}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Volver al listado
          </Link>
          {canEdit ? (
            <button
              type="button"
              onClick={remove}
              disabled={pending}
              className="rounded-lg border border-red-200 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
            >
              {pending ? "Eliminando…" : "Eliminar"}
            </button>
          ) : null}
        </div>
      </div>

      {feedback ? (
        <p className={feedback.type === "ok" ? dashAlertOk : dashAlertError} role="status">
          {feedback.message}
        </p>
      ) : null}

      <MinuteContentView content={minute.content} />

      <MinutesPrivacyNotice compact />
    </div>
  );
}
