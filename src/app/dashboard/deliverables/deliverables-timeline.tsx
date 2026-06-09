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
    <section className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="mb-2 flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-base font-semibold text-slate-900">Línea de tiempo</h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Cada hito muestra el nombre del entregable; pasa el cursor para ver más detalle.
          </p>
        </div>
        <span className="text-xs text-slate-500">{items.length} fechas</span>
      </div>

      <div className="relative overflow-x-auto overflow-y-visible pb-28 pt-4">
        <div className="relative mx-4 min-w-[640px]" style={{ minHeight: 148 }}>
          <div
            className="absolute left-0 right-0 top-[42px] h-0.5 bg-slate-200"
            aria-hidden
          />
          <div className="deliverable-timeline-line absolute left-0 top-[42px] h-0.5 w-full bg-slate-800" />

          {todayLeft !== null ? (
            <div
              className="absolute top-6 bottom-16 w-px bg-amber-400/80"
              style={{ left: `${todayLeft}%` }}
              title="Hoy"
            >
              <span className="absolute -top-4 left-1/2 -translate-x-1/2 whitespace-nowrap text-[10px] font-medium text-amber-700">
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
            const showDetail = isActive;

            return (
              <div
                key={row.id}
                className={`deliverable-timeline-dot absolute top-[42px] -translate-x-1/2 -translate-y-1/2 ${
                  isActive ? "z-30" : "z-10"
                }`}
                style={{
                  left: `${left}%`,
                  animationDelay: `${index * 0.07}s`,
                }}
              >
                <button
                  type="button"
                  onMouseEnter={() => setActiveId(row.id)}
                  onMouseLeave={() => setActiveId((cur) => (cur === row.id ? null : cur))}
                  onFocus={() => setActiveId(row.id)}
                  onBlur={() => setActiveId((cur) => (cur === row.id ? null : cur))}
                  onClick={() => {
                    setActiveId(row.id);
                    onSelect(row.id);
                  }}
                  className={`group relative flex w-[min(132px,22vw)] flex-col items-center outline-none ${
                    isActive ? "z-30" : ""
                  }`}
                  aria-label={`${row.title}, ${formatShort(date)}`}
                  aria-expanded={showDetail}
                >
                  <div
                    className={`rounded-full border-2 border-white shadow-md transition-all duration-200 ${
                      showDetail ? "h-5 w-5" : "h-3.5 w-3.5 group-hover:h-4 group-hover:w-4"
                    } ${statusDot[st] ?? "bg-slate-400"} ${overdue ? "ring-2 ring-rose-300" : ""}`}
                  />

                  <div className="mt-2 w-full px-1 text-center">
                    <p className="text-[10px] font-medium text-slate-500">{formatShort(date)}</p>
                    <p
                      className={`mt-0.5 line-clamp-2 text-[11px] font-semibold leading-snug text-slate-900 ${
                        showDetail ? "line-clamp-none" : ""
                      }`}
                      title={row.title}
                    >
                      {row.title}
                    </p>
                  </div>

                  <div
                    className={`pointer-events-none absolute left-1/2 top-full z-40 mt-2 w-[min(280px,calc(100vw-2.5rem))] -translate-x-1/2 rounded-xl border border-slate-200 bg-white p-3 text-left shadow-lg transition-all duration-200 ${
                      showDetail
                        ? "visible scale-100 opacity-100"
                        : "invisible scale-95 opacity-0 group-hover:visible group-hover:scale-100 group-hover:opacity-100 group-focus-visible:visible group-focus-visible:scale-100 group-focus-visible:opacity-100"
                    }`}
                  >
                    <p className="text-[10px] font-medium uppercase tracking-wide text-slate-500">
                      {formatShort(date)} · {row.projectName}
                    </p>
                    <p className="mt-1 text-sm font-semibold leading-snug text-slate-900">
                      {row.title}
                    </p>
                    <p className="mt-1.5 text-xs text-slate-600">
                      <span className="font-medium text-slate-700">Responsable:</span>{" "}
                      {row.ownerName?.trim() || "—"}
                    </p>
                    <p className="mt-1 text-xs text-slate-600">
                      {DELIVERABLE_STATUS_LABEL[st]} · {row.weight}% del avance
                    </p>
                    {row.phase ? (
                      <p className="mt-1 text-xs text-slate-500">Fase: {row.phase}</p>
                    ) : null}
                    {row.description?.trim() ? (
                      <p className="mt-2 line-clamp-3 text-xs leading-relaxed text-slate-600">
                        {row.description.trim()}
                      </p>
                    ) : null}
                    {row.supportUrl || row.supportFileUrl ? (
                      <div className="mt-2 flex flex-wrap gap-1.5 text-[10px]">
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
                    ) : null}
                  </div>
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
