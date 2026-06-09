"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { PMO_MEETINGS } from "@/lib/dashboard-paths";
import {
  costLevelSortWeight,
  formatDurationMinutes,
  formatMxn,
  getCostLevelBadge,
  MEETING_OBJECTIVE_LABELS,
  type MeetingRoiDetailRecord,
} from "@/lib/meeting-roi-utils";
import { formatRelativeDate } from "@/lib/escalation-utils";
import { dashCard } from "@/lib/ui-classes";

import { RoiSessionDetailDialog } from "./roi-session-detail-dialog";

type MeetingRoiRadarClientProps = {
  rows: MeetingRoiDetailRecord[];
  counts: { bajo: number; moderado: number; alto: number; critico: number };
  totalCostMxn: number;
};

export function MeetingRoiRadarClient({
  rows,
  counts,
  totalCostMxn,
}: MeetingRoiRadarClientProps) {
  const [selected, setSelected] = useState<MeetingRoiDetailRecord | null>(null);

  const sorted = useMemo(
    () =>
      [...rows].sort((a, b) => {
        const levelDiff = costLevelSortWeight(a.costLevel) - costLevelSortWeight(b.costLevel);
        if (levelDiff !== 0) return levelDiff;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }),
    [rows],
  );

  const total = counts.bajo + counts.moderado + counts.alto + counts.critico;
  const criticoPct = total > 0 ? Math.round((counts.critico / total) * 100) : 0;
  const altoPct = total > 0 ? Math.round((counts.alto / total) * 100) : 0;
  const moderadoPct = total > 0 ? Math.round((counts.moderado / total) * 100) : 0;
  const bajoPct = total > 0 ? 100 - criticoPct - altoPct - moderadoPct : 0;

  return (
    <>
      <section className={`${dashCard} p-4`}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Radar de reuniones</h2>
            <p className="mt-1 text-sm text-slate-600">
              Costo de sesiones registradas. Toca una tarjeta para ver el diagnóstico.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/dashboard/roi-meetings"
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Nueva sesión
            </Link>
            <Link
              href={PMO_MEETINGS}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Ver historial
            </Link>
          </div>
        </div>

        {total > 0 && (
          <div className="mt-4">
            <div className="flex h-2 overflow-hidden rounded-full bg-slate-100">
              {counts.critico > 0 && (
                <div className="bg-rose-500" style={{ width: `${criticoPct}%` }} title={`${counts.critico} críticas`} />
              )}
              {counts.alto > 0 && (
                <div className="bg-amber-400" style={{ width: `${altoPct}%` }} title={`${counts.alto} altas`} />
              )}
              {counts.moderado > 0 && (
                <div className="bg-sky-500" style={{ width: `${moderadoPct}%` }} title={`${counts.moderado} moderadas`} />
              )}
              {counts.bajo > 0 && (
                <div className="bg-emerald-500" style={{ width: `${bajoPct}%` }} title={`${counts.bajo} bajas`} />
              )}
            </div>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600">
              <span>{counts.critico} crítica{counts.critico !== 1 ? "s" : ""}</span>
              <span>{counts.alto} alta{counts.alto !== 1 ? "s" : ""}</span>
              <span>{counts.moderado} moderada{counts.moderado !== 1 ? "s" : ""}</span>
              <span>{counts.bajo} baja{counts.bajo !== 1 ? "s" : ""}</span>
              <span className="font-medium text-slate-800">{formatMxn(totalCostMxn)} total</span>
              <span className="text-slate-500">últimos 30 días</span>
            </div>
          </div>
        )}

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {sorted.slice(0, 6).map((row) => {
            const badge = getCostLevelBadge(row.costLevel);
            const borderTone =
              row.costLevel === "Crítico"
                ? "border-l-rose-500"
                : row.costLevel === "Alto"
                  ? "border-l-amber-400"
                  : row.costLevel === "Moderado"
                    ? "border-l-sky-500"
                    : "border-l-emerald-500";

            return (
              <button
                key={row.id}
                type="button"
                onClick={() => setSelected(row)}
                className={`rounded-lg border border-slate-200 border-l-4 ${borderTone} bg-white p-3 text-left transition hover:border-slate-300 hover:shadow-sm active:scale-[0.99]`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-slate-900">{row.project.name}</p>
                    {row.sessionName ? (
                      <p className="truncate text-xs text-slate-500">{row.sessionName}</p>
                    ) : null}
                  </div>
                  <span className={badge.className}>{badge.label}</span>
                </div>
                <p className="mt-1 text-sm text-slate-700">{row.diagnosisTitle}</p>
                <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                  <span>
                    {MEETING_OBJECTIVE_LABELS[row.objective] ?? row.objective} · {formatMxn(row.totalCost)}
                  </span>
                  <span>
                    {row.totalParticipants} pers. · {formatDurationMinutes(row.durationMinutes)}
                  </span>
                  <time className="shrink-0">{formatRelativeDate(new Date(row.createdAt))}</time>
                </div>
              </button>
            );
          })}
        </div>

        {sorted.length === 0 && (
          <p className="mt-4 rounded-lg border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500">
            Sin sesiones registradas. Usa la calculadora de reuniones para documentar el costo de tus sesiones.
          </p>
        )}
      </section>

      <RoiSessionDetailDialog record={selected} onClose={() => setSelected(null)} />
    </>
  );
}
