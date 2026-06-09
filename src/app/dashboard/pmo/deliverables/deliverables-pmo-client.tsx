"use client";

import Link from "next/link";

import { DELIVERABLE_DETAIL } from "@/lib/dashboard-paths";
import { dashCard } from "@/lib/ui-classes";

type TrendRow = {
  label: string;
  completed: number;
  overdue: number;
};

type RecentClosed = {
  id: string;
  title: string;
  projectName: string;
  dueDate: string | null;
  deliveredAt: string | null;
  onTime: boolean | null;
};

export function DeliverablesPmoClient({
  onTimePct,
  avgLeadDays,
  weeklyTrend,
  recentClosed,
}: {
  onTimePct: number | null;
  avgLeadDays: number | null;
  weeklyTrend: TrendRow[];
  recentClosed: RecentClosed[];
}) {
  const maxBar = Math.max(1, ...weeklyTrend.flatMap((w) => [w.completed, w.overdue]));

  return (
    <div className="space-y-4">
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className={`${dashCard} p-3`}>
          <p className="text-xs text-slate-500">Entregado a tiempo</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums text-slate-900">
            {onTimePct !== null ? `${onTimePct}%` : "—"}
          </p>
        </div>
        <div className={`${dashCard} p-3`}>
          <p className="text-xs text-slate-500">Lead time medio</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums text-slate-900">
            {avgLeadDays !== null ? `${avgLeadDays}d` : "—"}
          </p>
        </div>
      </section>

      <section className={`${dashCard} p-4`}>
        <h2 className="text-sm font-semibold text-slate-900">Tendencia semanal</h2>
        <p className="mt-0.5 text-xs text-slate-500">Cierres vs. vencidos sin cerrar por semana</p>
        <div className="mt-4 flex items-end gap-3 overflow-x-auto pb-1">
          {weeklyTrend.map((w) => (
            <div key={w.label} className="flex min-w-[56px] flex-col items-center gap-1">
              <div className="flex h-24 w-10 items-end justify-center gap-0.5">
                <div
                  className="w-3 rounded-t bg-emerald-500"
                  style={{ height: `${(w.completed / maxBar) * 100}%`, minHeight: w.completed ? 4 : 0 }}
                  title={`${w.completed} cerrados`}
                />
                <div
                  className="w-3 rounded-t bg-rose-400"
                  style={{ height: `${(w.overdue / maxBar) * 100}%`, minHeight: w.overdue ? 4 : 0 }}
                  title={`${w.overdue} vencidos`}
                />
              </div>
              <span className="text-[10px] text-slate-500">{w.label}</span>
            </div>
          ))}
        </div>
        <div className="mt-2 flex gap-4 text-[10px] text-slate-500">
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-sm bg-emerald-500" /> Cerrados
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-sm bg-rose-400" /> Vencidos abiertos
          </span>
        </div>
      </section>

      <section className={`${dashCard} p-4`}>
        <h2 className="text-sm font-semibold text-slate-900">Últimos cierres</h2>
        <ul className="mt-3 divide-y divide-slate-100">
          {recentClosed.map((row) => (
            <li key={row.id} className="flex flex-wrap items-start justify-between gap-2 py-2.5">
              <div className="min-w-0">
                <Link
                  href={DELIVERABLE_DETAIL(row.id)}
                  className="text-sm font-medium text-slate-900 hover:underline"
                >
                  {row.title}
                </Link>
                <p className="text-xs text-slate-500">{row.projectName}</p>
              </div>
              <div className="text-right text-xs">
                {row.onTime === true ? (
                  <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-emerald-800">
                    A tiempo
                  </span>
                ) : row.onTime === false ? (
                  <span className="rounded-full bg-rose-50 px-2 py-0.5 text-rose-800">
                    Tarde
                  </span>
                ) : null}
              </div>
            </li>
          ))}
          {recentClosed.length === 0 ? (
            <li className="py-6 text-center text-sm text-slate-400">Sin cierres recientes</li>
          ) : null}
        </ul>
      </section>
    </div>
  );
}
