"use client";

import { useMemo, useState } from "react";

import {
  DELIVERABLE_STATUS_LABEL,
  isDeliverableDoneStatus,
  normalizeDeliverableStatus,
} from "@/modules/deliverables/constants";

import type { DeliverableTrackerRow } from "./deliverables-tracker";

function parseYmd(s: string | null): Date | null {
  if (!s?.trim()) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  if (!m) return null;
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

function formatShort(d: Date) {
  return d.toLocaleDateString("es-MX", { day: "numeric", month: "short" });
}

const statusDot: Record<string, string> = {
  pending: "bg-slate-400",
  review: "bg-sky-500",
  approved: "bg-emerald-500",
  rejected: "bg-rose-500",
  delivered: "bg-slate-700",
};

type DeliverablesTimelineProps = {
  rows: DeliverableTrackerRow[];
  onSelect: (id: string) => void;
};

export function DeliverablesTimeline({ rows, onSelect }: DeliverablesTimelineProps) {
  const [activeId, setActiveId] = useState<string | null>(null);

  const items = useMemo(() => {
    return rows
      .map((row) => ({ row, date: parseYmd(row.dueDate) }))
      .filter((item): item is { row: DeliverableTrackerRow; date: Date } => item.date !== null)
      .sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [rows]);

  const range = useMemo(() => {
    if (items.length === 0) return null;
    const min = items[0]!.date.getTime();
    const max = items[items.length - 1]!.date.getTime();
    return { min, max, span: Math.max(max - min, 86400000) };
  }, [items]);

  const todayLeft = useMemo(() => {
    if (!range) return null;
    const t = new Date();
    t.setHours(0, 0, 0, 0);
    const pct = ((t.getTime() - range.min) / range.span) * 100;
    if (pct < 0 || pct > 100) return null;
    return pct;
  }, [range]);

  if (items.length === 0) {
    return (
      <section className="rounded-lg border border-dashed border-slate-200 bg-white p-6 text-center text-sm text-slate-500">
        Añade fechas compromiso para ver la línea de tiempo.
      </section>
    );
  }

  return (
    <section className="overflow-hidden rounded-lg border border-slate-200 bg-white p-4">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-base font-semibold text-slate-900">Línea de tiempo</h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Pasa el cursor sobre un hito para ampliar la información (toca en móvil).
          </p>
        </div>
        <span className="text-xs text-slate-500">{items.length} fechas</span>
      </div>

      <div className="relative mt-8 min-h-[140px] overflow-x-auto pb-4 pt-6">
        <div className="relative mx-4 min-w-[640px]" style={{ minHeight: 120 }}>
          <div
            className="absolute left-0 right-0 top-1/2 h-0.5 -translate-y-1/2 bg-slate-200"
            aria-hidden
          />
          <div className="deliverable-timeline-line absolute left-0 top-1/2 h-0.5 w-full -translate-y-1/2 bg-slate-800" />

          {todayLeft !== null ? (
            <div
              className="absolute top-0 bottom-0 w-px bg-amber-400/80"
              style={{ left: `${todayLeft}%` }}
              title="Hoy"
            >
              <span className="absolute -top-5 left-1/2 -translate-x-1/2 whitespace-nowrap text-[10px] font-medium text-amber-700">
                Hoy
              </span>
            </div>
          ) : null}

          {items.map(({ row, date }, index) => {
            const left =
              range && items.length === 1
                ? 50
                : range
                  ? ((date.getTime() - range.min) / range.span) * 100
                  : 0;
            const st = normalizeDeliverableStatus(row.status);
            const isActive = activeId === row.id;
            const overdue =
              !isDeliverableDoneStatus(row.status) && date.getTime() < Date.now();

            return (
              <div
                key={row.id}
                className="deliverable-timeline-dot absolute top-1/2 z-10 -translate-x-1/2 -translate-y-1/2"
                style={{
                  left: `${left}%`,
                  animationDelay: `${index * 0.07}s`,
                }}
                onMouseEnter={() => setActiveId(row.id)}
                onMouseLeave={() => setActiveId((cur) => (cur === row.id ? null : cur))}
              >
                <button
                  type="button"
                  onClick={() => {
                    setActiveId(row.id);
                    onSelect(row.id);
                  }}
                  className={`group relative flex flex-col items-center outline-none transition-transform duration-300 ${
                    isActive ? "z-20 scale-110" : "hover:scale-110"
                  }`}
                  aria-label={`${row.title}, ${formatShort(date)}`}
                >
                  <div
                    className={`rounded-full border-2 border-white shadow-md transition-all duration-300 ${
                      isActive ? "h-5 w-5" : "h-3.5 w-3.5 group-hover:h-5 group-hover:w-5"
                    } ${statusDot[st] ?? "bg-slate-400"} ${overdue ? "ring-2 ring-rose-300" : ""}`}
                  />

                  <div
                    className={`pointer-events-none absolute bottom-full mb-3 w-[min(240px,70vw)] rounded-xl border border-slate-200 bg-white p-3 text-left shadow-lg transition-all duration-300 ${
                      isActive
                        ? "scale-100 opacity-100"
                        : "scale-95 opacity-0 group-hover:scale-100 group-hover:opacity-100"
                    }`}
                  >
                    <p className="text-[10px] font-medium uppercase tracking-wide text-slate-500">
                      {formatShort(date)} · {row.projectName}
                    </p>
                    <p className="mt-1 text-sm font-semibold leading-snug text-slate-900">
                      {row.title}
                    </p>
                    <p className="mt-1 text-xs text-slate-600">
                      {DELIVERABLE_STATUS_LABEL[st]} · {row.weight}% · {row.ownerName ?? "—"}
                    </p>
                    {row.phase ? (
                      <p className="mt-0.5 text-xs text-slate-500">Fase: {row.phase}</p>
                    ) : null}
                    <div className="mt-2 flex flex-wrap gap-2 text-xs">
                      {row.supportUrl ? (
                        <span className="rounded bg-slate-100 px-1.5 py-0.5 text-slate-600">
                          Enlace
                        </span>
                      ) : null}
                      {row.supportFileUrl ? (
                        <span className="rounded bg-slate-100 px-1.5 py-0.5 text-slate-600">
                          PDF
                        </span>
                      ) : null}
                    </div>
                  </div>

                  <span
                    className={`mt-2 max-w-[88px] truncate text-[10px] text-slate-500 transition-opacity ${
                      isActive ? "opacity-100" : "opacity-70 group-hover:opacity-100"
                    }`}
                  >
                    {formatShort(date)}
                  </span>
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
