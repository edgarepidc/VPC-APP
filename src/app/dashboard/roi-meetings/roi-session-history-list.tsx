"use client";

import { useState } from "react";

import {
  formatDurationMinutes,
  formatMxn,
  getCostLevelBadge,
  MEETING_OBJECTIVE_LABELS,
  type MeetingRoiDetailRecord,
} from "@/lib/meeting-roi-utils";
import { formatEscalationDateTime, formatRelativeDate } from "@/lib/escalation-utils";

import { RoiSessionDetailDialog } from "@/app/dashboard/pmo/roi-session-detail-dialog";

type RoiSessionHistoryListProps = {
  rows: MeetingRoiDetailRecord[];
  canEdit?: boolean;
};

export function RoiSessionHistoryList({ rows, canEdit = false }: RoiSessionHistoryListProps) {
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
                className="min-w-0 flex-1 text-left hover:opacity-90 active:opacity-80"
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
      <RoiSessionDetailDialog
        record={selected}
        canEdit={canEdit}
        onClose={() => setSelected(null)}
      />
    </>
  );
}
