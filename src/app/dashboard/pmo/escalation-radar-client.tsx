"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { PMO_ESCALATIONS } from "@/lib/dashboard-paths";
import {
  ESCALATION_INDICATOR_KEYS,
  ESCALATION_INDICATOR_SHORT,
  formatRelativeDate,
  getEscalationTierBadge,
  getIndicatorLevelClass,
  tierSortWeight,
} from "@/lib/escalation-utils";
import { dashCard } from "@/lib/ui-classes";

import {
  EscalationDetailDialog,
  type EscalationDetailRecord,
} from "./escalation-detail-dialog";

type EscalationRadarClientProps = {
  rows: EscalationDetailRecord[];
  counts: { red: number; orange: number; green: number };
};

export function EscalationRadarClient({ rows, counts }: EscalationRadarClientProps) {
  const [selected, setSelected] = useState<EscalationDetailRecord | null>(null);

  const sorted = useMemo(
    () =>
      [...rows].sort((a, b) => {
        const tierDiff = tierSortWeight(a.tier) - tierSortWeight(b.tier);
        if (tierDiff !== 0) return tierDiff;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }),
    [rows],
  );

  const total = counts.red + counts.orange + counts.green;
  const redPct = total > 0 ? Math.round((counts.red / total) * 100) : 0;
  const orangePct = total > 0 ? Math.round((counts.orange / total) * 100) : 0;
  const greenPct = total > 0 ? 100 - redPct - orangePct : 0;

  return (
    <>
      <section className={`${dashCard} p-4`}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Radar de escalamiento</h2>
            <p className="mt-1 text-sm text-slate-600">
              Pulso reciente del Escalómetro. Haz clic en una tarjeta para ver acciones y exportar.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/dashboard/escalometro"
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Nueva evaluación
            </Link>
            <Link
              href={PMO_ESCALATIONS}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Ver historial
            </Link>
          </div>
        </div>

        {total > 0 && (
          <div className="mt-4">
            <div className="flex h-2 overflow-hidden rounded-full bg-slate-100">
              {counts.red > 0 && (
                <div className="bg-rose-500" style={{ width: `${redPct}%` }} title={`${counts.red} en rojo`} />
              )}
              {counts.orange > 0 && (
                <div className="bg-amber-400" style={{ width: `${orangePct}%` }} title={`${counts.orange} en naranja`} />
              )}
              {counts.green > 0 && (
                <div className="bg-emerald-500" style={{ width: `${greenPct}%` }} title={`${counts.green} en verde`} />
              )}
            </div>
            <div className="mt-2 flex flex-wrap gap-4 text-xs text-slate-600">
              <span>{counts.red} rojo{counts.red !== 1 ? "s" : ""}</span>
              <span>{counts.orange} naranja</span>
              <span>{counts.green} verde{counts.green !== 1 ? "s" : ""}</span>
              <span className="text-slate-500">últimos 30 días</span>
            </div>
          </div>
        )}

        <div className="mt-4 grid gap-3 lg:grid-cols-2">
          {sorted.slice(0, 6).map((row) => {
            const badge = getEscalationTierBadge(row.tier);
            const borderTone =
              row.tier === "red"
                ? "border-l-rose-500"
                : row.tier === "orange"
                  ? "border-l-amber-400"
                  : "border-l-emerald-500";

            return (
              <button
                key={row.id}
                type="button"
                onClick={() => setSelected(row)}
                className={`rounded-lg border border-slate-200 border-l-4 ${borderTone} bg-white p-3 text-left transition hover:border-slate-300 hover:shadow-sm`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-slate-900">{row.project.name}</p>
                    {row.topic ? (
                      <p className="truncate text-xs text-slate-500">{row.topic}</p>
                    ) : null}
                  </div>
                  <span className={badge.className}>{badge.label}</span>
                </div>
                <p className="mt-1 text-sm text-slate-700">{row.title}</p>
                <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap gap-1">
                    {ESCALATION_INDICATOR_KEYS.map((key) => {
                      const level = row.indicators[key] ?? "low";
                      return (
                        <span
                          key={key}
                          className="inline-flex h-5 min-w-[1.75rem] items-center justify-center gap-0.5 rounded border border-slate-200 bg-slate-50 px-1 text-[10px] font-semibold text-slate-600"
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${getIndicatorLevelClass(level)}`}
                            aria-hidden
                          />
                          {ESCALATION_INDICATOR_SHORT[key]}
                        </span>
                      );
                    })}
                  </div>
                  <time className="shrink-0 text-xs text-slate-500">
                    {formatRelativeDate(new Date(row.createdAt))}
                  </time>
                </div>
              </button>
            );
          })}
        </div>

        {sorted.length === 0 && (
          <p className="mt-4 rounded-lg border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500">
            Sin evaluaciones recientes. Usa el Escalómetro para registrar el pulso de tus proyectos.
          </p>
        )}
      </section>

      <EscalationDetailDialog record={selected} onClose={() => setSelected(null)} />
    </>
  );
}
