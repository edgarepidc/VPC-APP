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

const MILESTONE_THEMES = [
  { accent: "#ea580c", soft: "#fff7ed", ring: "rgba(234,88,12,0.28)" },
  { accent: "#2563eb", soft: "#eff6ff", ring: "rgba(37,99,235,0.28)" },
  { accent: "#7c3aed", soft: "#f5f3ff", ring: "rgba(124,58,237,0.28)" },
  { accent: "#059669", soft: "#ecfdf5", ring: "rgba(5,150,105,0.28)" },
  { accent: "#0d9488", soft: "#f0fdfa", ring: "rgba(13,148,136,0.28)" },
  { accent: "#db2777", soft: "#fdf2f8", ring: "rgba(219,39,119,0.28)" },
] as const;

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

  const gradientLine = useMemo(() => {
    if (items.length === 0) return "#cbd5e1";
    const colors = items.map((_, i) => MILESTONE_THEMES[i % MILESTONE_THEMES.length]!.accent);
    if (colors.length === 1) return colors[0]!;
    return `linear-gradient(to right, ${colors.join(", ")})`;
  }, [items]);

  const trackMinWidth = Math.max(720, items.length * 196);

  if (items.length === 0) {
    return (
      <section className="rounded-lg border border-dashed border-slate-200 bg-white p-6 text-center text-sm text-slate-500">
        Añade fechas compromiso para ver la línea de tiempo.
      </section>
    );
  }

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-base font-semibold text-slate-900">Línea de tiempo</h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Hitos alternados sobre la línea; pasa el cursor para ampliar el detalle.
          </p>
        </div>
        <span className="text-xs text-slate-500">{items.length} fechas</span>
      </div>

      <div className="relative overflow-x-auto overflow-y-visible py-2">
        <div
          className="relative mx-6"
          style={{ minWidth: trackMinWidth, height: 300 }}
        >
          <div
            className="deliverable-timeline-line absolute left-0 right-0 top-1/2 h-1 -translate-y-1/2 rounded-full opacity-90"
            style={{ background: gradientLine }}
            aria-hidden
          />

          {todayLeft !== null ? (
            <div
              className="pointer-events-none absolute top-[18%] bottom-[18%] z-[1] w-px bg-amber-400/90"
              style={{ left: `${todayLeft}%` }}
            >
              <span className="absolute -top-5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
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
            const theme = MILESTONE_THEMES[index % MILESTONE_THEMES.length]!;
            const st = normalizeDeliverableStatus(row.status);
            const isDone = isDeliverableDoneStatus(row.status);
            const isActive = activeId === row.id;
            const isAbove = index % 2 === 0;
            const todayStart = new Date();
            todayStart.setHours(0, 0, 0, 0);
            const overdue = !isDone && date.getTime() < todayStart.getTime();

            const day = date.getDate();
            const month = date.toLocaleDateString("es-MX", { month: "short" }).replace(".", "");
            const year = date.getFullYear();

            return (
              <div
                key={row.id}
                className="deliverable-timeline-milestone absolute top-1/2 z-10 -translate-x-1/2 -translate-y-1/2"
                style={{
                  left: `${left}%`,
                  animationDelay: `${index * 0.08}s`,
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
                  className={`group flex flex-col items-center outline-none transition-transform duration-200 ${
                    isActive ? "z-20 scale-[1.02]" : "hover:scale-[1.02]"
                  }`}
                  aria-label={`${row.title}, ${day} ${month} ${year}`}
                  aria-expanded={isActive}
                >
                  {isAbove ? (
                    <>
                      <MilestoneCard
                        row={row}
                        st={st}
                        theme={theme}
                        day={day}
                        month={month}
                        year={year}
                        isDone={isDone}
                        isActive={isActive}
                        overdue={overdue}
                        expanded={isActive}
                      />
                      <div
                        className="h-12 w-px shrink-0"
                        style={{ backgroundColor: theme.accent }}
                        aria-hidden
                      />
                    </>
                  ) : null}

                  <div
                    className={`relative z-10 shrink-0 rounded-full border-[3px] border-white shadow-md transition-all duration-200 ${
                      isDone ? "h-4 w-4" : "h-3.5 w-3.5"
                    } ${isActive ? "scale-125" : "group-hover:scale-110"}`}
                    style={{
                      backgroundColor: isDone ? theme.accent : "white",
                      boxShadow: isActive ? `0 0 0 4px ${theme.ring}` : undefined,
                      outline: isDone ? undefined : `2px solid ${theme.accent}`,
                      outlineOffset: isDone ? undefined : "-1px",
                    }}
                    aria-hidden
                  />

                  {!isAbove ? (
                    <>
                      <div
                        className="h-12 w-px shrink-0"
                        style={{ backgroundColor: theme.accent }}
                        aria-hidden
                      />
                      <MilestoneCard
                        row={row}
                        st={st}
                        theme={theme}
                        day={day}
                        month={month}
                        year={year}
                        isDone={isDone}
                        isActive={isActive}
                        overdue={overdue}
                        expanded={isActive}
                      />
                    </>
                  ) : null}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

type MilestoneCardProps = {
  row: DeliverableTrackerRow;
  st: ReturnType<typeof normalizeDeliverableStatus>;
  theme: (typeof MILESTONE_THEMES)[number];
  day: number;
  month: string;
  year: number;
  isDone: boolean;
  isActive: boolean;
  overdue: boolean;
  expanded: boolean;
};

function MilestoneCard({
  row,
  st,
  theme,
  day,
  month,
  year,
  isDone,
  isActive,
  overdue,
  expanded,
}: MilestoneCardProps) {
  return (
    <div
      className={`relative w-[min(168px,38vw)] rounded-2xl border bg-white px-4 py-3 text-center shadow-md transition-all duration-200 ${
        isActive
          ? "border-2 shadow-lg"
          : "border-slate-100 group-hover:border-slate-200 group-hover:shadow-lg"
      } ${expanded ? "w-[min(220px,44vw)]" : ""}`}
      style={{
        borderColor: isActive ? theme.accent : undefined,
        boxShadow: isActive ? `0 10px 30px -12px ${theme.ring}, 0 0 0 4px ${theme.ring}` : undefined,
        backgroundColor: isActive ? theme.soft : undefined,
      }}
    >
      {isDone ? (
        <span
          className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-[10px] font-bold text-white shadow"
          aria-label="Completado"
        >
          ✓
        </span>
      ) : null}
      {overdue ? (
        <span className="absolute -left-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white shadow">
          !
        </span>
      ) : null}

      <p
        className="text-[1.65rem] font-bold leading-none tracking-tight"
        style={{ color: theme.accent }}
      >
        {day} {month}
      </p>
      <p className="mt-0.5 text-[10px] font-medium uppercase tracking-wide text-slate-400">
        {year}
      </p>

      <p
        className={`mt-2 text-[11px] font-medium leading-snug text-slate-700 ${
          expanded ? "line-clamp-none" : "line-clamp-2"
        }`}
        title={row.title}
      >
        {row.title}
      </p>

      <div
        className={`overflow-hidden text-left transition-all duration-200 ${
          expanded
            ? "mt-3 max-h-40 border-t border-slate-200/80 pt-2 opacity-100"
            : "max-h-0 opacity-0 group-hover:mt-3 group-hover:max-h-40 group-hover:border-t group-hover:border-slate-200/80 group-hover:pt-2 group-hover:opacity-100"
        }`}
      >
        <p className="text-[10px] text-slate-500">{row.projectName}</p>
        <p className="mt-1 text-[11px] text-slate-700">
          <span className="font-semibold">Responsable:</span> {row.ownerName?.trim() || "—"}
        </p>
        <p className="mt-1 text-[10px] text-slate-600">
          {DELIVERABLE_STATUS_LABEL[st]} · {row.weight}%
          {row.phase ? ` · ${row.phase}` : ""}
        </p>
        {row.description?.trim() ? (
          <p className="mt-1.5 line-clamp-3 text-[10px] leading-relaxed text-slate-600">
            {row.description.trim()}
          </p>
        ) : null}
      </div>
    </div>
  );
}
