"use client";

import { useState } from "react";

import {
  formatDurationMinutes,
  formatMxn,
  getCostLevelBadge,
  MEETING_OBJECTIVE_LABELS,
  ROLE_LABELS,
  type MeetingRoiDetailRecord,
} from "@/lib/meeting-roi-utils";
import { formatEscalationDateTime, formatRelativeDate } from "@/lib/escalation-utils";

type RoiSessionDetailDialogProps = {
  record: MeetingRoiDetailRecord | null;
  onClose: () => void;
};

function RoiSessionDetailDialog({ record, onClose }: RoiSessionDetailDialogProps) {
  if (!record) return null;

  const badge = getCostLevelBadge(record.costLevel);
  const roles = (["junior", "senior", "director", "tech"] as const).filter(
    (role) => record.participants[role] > 0,
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="roi-detail-title"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 id="roi-detail-title" className="text-lg font-semibold text-slate-900">
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
            className="rounded-lg px-2 py-1 text-slate-500 hover:bg-slate-100"
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

type RoiSessionHistoryListProps = {
  rows: MeetingRoiDetailRecord[];
};

export function RoiSessionHistoryList({ rows }: RoiSessionHistoryListProps) {
  const [selected, setSelected] = useState<MeetingRoiDetailRecord | null>(null);

  return (
    <>
      {rows.map((session) => {
        const badge = getCostLevelBadge(session.costLevel);
        return (
          <li
            key={session.id}
            className="rounded-lg border border-slate-200 p-3 text-sm"
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <button
                type="button"
                onClick={() => setSelected(session)}
                className="min-w-0 flex-1 text-left hover:opacity-90"
              >
                <p className="font-medium text-slate-900">
                  {session.project.name}
                  {session.sessionName ? (
                    <span className="font-normal text-slate-600"> · {session.sessionName}</span>
                  ) : null}
                </p>
                <p className="text-slate-600">
                  {MEETING_OBJECTIVE_LABELS[session.objective] ?? session.objective} ·{" "}
                  {formatMxn(session.totalCost)}
                </p>
                <p className="mt-0.5 text-xs text-slate-500">
                  {session.authorName} · {formatEscalationDateTime(new Date(session.createdAt))}
                </p>
              </button>
              <div className="text-right">
                <span className={badge.className}>{badge.label}</span>
                <p className="mt-1 text-xs text-slate-500">
                  {formatRelativeDate(new Date(session.createdAt))}
                </p>
              </div>
            </div>
            <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs text-slate-500">
                {session.totalParticipants} participantes ·{" "}
                {formatDurationMinutes(session.durationMinutes)} ·{" "}
                {formatMxn(session.costPerMinute)}/min
              </p>
              <button
                type="button"
                onClick={() => setSelected(session)}
                className="text-xs font-medium text-slate-700 underline hover:text-slate-900"
              >
                Ver detalle
              </button>
            </div>
          </li>
        );
      })}
      <RoiSessionDetailDialog record={selected} onClose={() => setSelected(null)} />
    </>
  );
}
