"use client";

import { useCallback, useEffect, useId } from "react";

import {
  formatDurationMinutes,
  formatMxn,
  getCostLevelBadge,
  MEETING_OBJECTIVE_LABELS,
  ROLE_LABELS,
  type MeetingRoiDetailRecord,
} from "@/lib/meeting-roi-utils";
import { formatEscalationDateTime } from "@/lib/escalation-utils";

type RoiSessionDetailDialogProps = {
  record: MeetingRoiDetailRecord | null;
  onClose: () => void;
};

export function RoiSessionDetailDialog({ record, onClose }: RoiSessionDetailDialogProps) {
  const titleId = useId();

  const handleKey = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    },
    [onClose],
  );

  useEffect(() => {
    if (!record) return;
    window.addEventListener("keydown", handleKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", handleKey);
      document.body.style.overflow = prev;
    };
  }, [record, handleKey]);

  if (!record) return null;

  const badge = getCostLevelBadge(record.costLevel);
  const roles = (["junior", "senior", "director", "tech"] as const).filter(
    (role) => record.participants[role] > 0,
  );

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center" role="presentation">
      <button
        type="button"
        className="absolute inset-0 bg-black/45"
        aria-label="Cerrar detalle"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative max-h-[min(90dvh,640px)] w-full max-w-lg overflow-y-auto rounded-t-2xl border border-slate-200 bg-white p-5 shadow-xl sm:rounded-xl"
      >
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-slate-200 sm:hidden" aria-hidden />

        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 id={titleId} className="text-lg font-semibold text-slate-900">
              {record.project.name}
              {record.sessionName ? (
                <span className="font-normal text-slate-600"> · {record.sessionName}</span>
              ) : null}
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              {MEETING_OBJECTIVE_LABELS[record.objective] ?? record.objective}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-lg px-2 py-1 text-slate-500 hover:bg-slate-100"
            aria-label="Cerrar"
          >
            ✕
          </button>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className={badge.className}>{badge.label}</span>
          <span className="text-sm font-medium text-slate-900">{formatMxn(record.totalCost)}</span>
          <span className="text-xs text-slate-500">
            {record.totalParticipants} participantes · {formatDurationMinutes(record.durationMinutes)}
          </span>
        </div>

        <p className="mt-1 text-xs text-slate-500">
          {formatMxn(record.costPerMinute)}/min · {record.authorName} ·{" "}
          {formatEscalationDateTime(new Date(record.createdAt))}
        </p>

        <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3">
          <p className="text-sm font-medium text-slate-900">{record.diagnosisTitle}</p>
          <p className="mt-1 text-sm text-slate-600">{record.diagnosisText}</p>
        </div>

        {roles.length > 0 && (
          <div className="mt-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Desglose por rol
            </p>
            <ul className="mt-2 space-y-1.5 text-sm">
              {roles.map((role) => (
                <li key={role} className="flex justify-between gap-2 text-slate-700">
                  <span>
                    {record.participants[role]}× {ROLE_LABELS[role]}
                  </span>
                  <span className="font-medium">{formatMxn(record.roleCosts[role])}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

export type { MeetingRoiDetailRecord };
