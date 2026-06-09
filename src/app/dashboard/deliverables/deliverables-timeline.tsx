"use client";

import { useMemo, useState } from "react";

import {
  DELIVERABLE_STATUS_LABEL,
  STATUS_LOG_COLORS,
  isDeliverableDoneStatus,
  normalizeDeliverableStatus,
  type DeliverableStatus,
} from "@/modules/deliverables/constants";

import { formatDeliveredAt, formatDueYmd } from "./deliverable-utils";
import type { DeliverableTrackerRow } from "./deliverables-tracker";

function parseYmd(s: string | null): Date | null {
  if (!s?.trim()) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  if (!m) return null;
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

const STATUS_THEME: Record<
  DeliverableStatus,
  { accent: string; soft: string; ring: string }
> = {
  pending: { accent: STATUS_LOG_COLORS.pending, soft: "#f8f8f6", ring: "rgba(136,135,128,0.28)" },
  review: { accent: STATUS_LOG_COLORS.review, soft: "#eff6ff", ring: "rgba(55,138,221,0.28)" },
  approved: { accent: STATUS_LOG_COLORS.approved, soft: "#ecfdf5", ring: "rgba(99,153,34,0.28)" },
  rejected: { accent: STATUS_LOG_COLORS.rejected, soft: "#fef2f2", ring: "rgba(226,75,74,0.28)" },
  delivered: { accent: STATUS_LOG_COLORS.delivered, soft: "#f5f3ff", ring: "rgba(83,74,183,0.28)" },
};

function themeForRow(row: DeliverableTrackerRow, overdue: boolean) {
  const st = normalizeDeliverableStatus(row.status);
  if (overdue && !isDeliverableDoneStatus(st)) {
    return { accent: "#dc2626", soft: "#fef2f2", ring: "rgba(220,38,38,0.28)" };
  }
  return STATUS_THEME[st];
}

const TRACK_INSET = 12;
const TRACK_SIDE_PAD = 128;

type DeliverablesTimelineProps = {
  rows: DeliverableTrackerRow[];
  focusId?: string | null;
  onFocusChange?: (id: string | null) => void;
  onSelect: (id: string) => void;
};

export function DeliverablesTimeline({
  rows,
  focusId,
  onFocusChange,
  onSelect,
}: DeliverablesTimelineProps) {
  const [localFocus, setLocalFocus] = useState<string | null>(null);
  const focusedId = focusId !== undefined ? focusId : localFocus;
  const setFocus = onFocusChange ?? setLocalFocus;

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
    return TRACK_INSET + (pct * (100 - TRACK_INSET * 2)) / 100;
  }, [range]);

  const gradientLine = useMemo(() => {
    if (items.length === 0) return "#cbd5e1";
    const colors = items.map(({ row, date }) => {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const overdue = !isDeliverableDoneStatus(row.status) && date.getTime() < todayStart.getTime();
      return themeForRow(row, overdue).accent;
    });
    if (colors.length === 1) return colors[0]!;
    return `linear-gradient(to right, ${colors.join(", ")})`;
  }, [items]);

  const trackMinWidth = Math.max(760, items.length * 220 + TRACK_SIDE_PAD * 2);

  const activeItem = useMemo(
    () => items.find(({ row }) => row.id === focusedId) ?? null,
    [focusedId, items],
  );

  if (items.length === 0) {
    return (
      <section className="py-6 text-center text-sm text-slate-500">
        Añade fechas compromiso para ver la línea de tiempo.
      </section>
    );
  }

  return (
    <section
      className="overflow-visible py-1"
      onMouseLeave={() => setFocus(null)}
    >
      <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-base font-semibold text-slate-900">Línea de tiempo</h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Hitos sobre la línea; el detalle ampliado aparece abajo.
          </p>
        </div>
        <span className="text-xs text-slate-400">{items.length} fechas</span>
      </div>

      <div className="overflow-x-auto overflow-y-visible overscroll-x-contain pb-1 pt-1">
        <div
          className="relative mx-auto"
          style={{
            minWidth: trackMinWidth,
            height: 320,
            paddingLeft: TRACK_SIDE_PAD,
            paddingRight: TRACK_SIDE_PAD,
          }}
        >
          <div className="relative h-full w-full">
            <div
              className="deliverable-timeline-line absolute left-0 right-0 top-1/2 h-1 -translate-y-1/2 rounded-full opacity-90"
              style={{ background: gradientLine }}
              aria-hidden
            />

            {todayLeft !== null ? (
              <div
                className="pointer-events-none absolute top-[14%] bottom-[14%] z-[1] w-px bg-amber-400/90"
                style={{ left: `${todayLeft}%` }}
              >
                <span className="absolute -top-5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                  Hoy
                </span>
              </div>
            ) : null}

            {items.map(({ row, date }, index) => {
              const rawPct =
                range && items.length === 1
                  ? 50
                  : range
                    ? ((date.getTime() - range.min) / range.span) * 100
                    : 0;
              const left = TRACK_INSET + (rawPct * (100 - TRACK_INSET * 2)) / 100;
              const st = normalizeDeliverableStatus(row.status);
              const isDone = isDeliverableDoneStatus(row.status);
              const todayStart = new Date();
              todayStart.setHours(0, 0, 0, 0);
              const overdue = !isDone && date.getTime() < todayStart.getTime();
              const theme = themeForRow(row, overdue);
              const isActive = focusedId === row.id;
              const isAbove = index % 2 === 0;

              const day = date.getDate();
              const month = date.toLocaleDateString("es-MX", { month: "short" }).replace(".", "");
              const year = date.getFullYear();

              return (
                <div
                  key={row.id}
                  className={`deliverable-timeline-milestone absolute top-1/2 -translate-x-1/2 -translate-y-1/2 ${
                    isActive ? "z-30" : "z-10"
                  }`}
                  style={{
                    left: `${left}%`,
                    animationDelay: `${index * 0.08}s`,
                  }}
                >
                  <button
                    type="button"
                    onMouseEnter={() => setFocus(row.id)}
                    onFocus={() => setFocus(row.id)}
                    onClick={() => {
                      setFocus(row.id);
                      onSelect(row.id);
                    }}
                    className={`flex flex-col items-center outline-none ${
                      isActive ? "scale-[1.03]" : "hover:scale-[1.02]"
                    } transition-transform duration-150`}
                    aria-label={`${row.title}, ${day} ${month} ${year}`}
                    aria-pressed={isActive}
                  >
                    {isAbove ? (
                      <>
                        <MilestoneCard
                          row={row}
                          theme={theme}
                          day={day}
                          month={month}
                          year={year}
                          isDone={isDone}
                          isActive={isActive}
                          overdue={overdue}
                        />
                        <div
                          className="h-12 w-px shrink-0"
                          style={{ backgroundColor: theme.accent }}
                          aria-hidden
                        />
                      </>
                    ) : null}

                    <div
                      className={`relative z-10 shrink-0 rounded-full border-[3px] border-white shadow-md transition-transform duration-150 ${
                        isDone ? "h-4 w-4" : "h-3.5 w-3.5"
                      } ${isActive ? "scale-125" : ""}`}
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
                          theme={theme}
                          day={day}
                          month={month}
                          year={year}
                          isDone={isDone}
                          isActive={isActive}
                          overdue={overdue}
                        />
                      </>
                    ) : null}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {activeItem ? (
        <TimelineDetailPanel
          row={activeItem.row}
          date={activeItem.date}
          onOpen={() => onSelect(activeItem.row.id)}
        />
      ) : (
        <p className="mt-2 text-center text-xs text-slate-400">
          Pasa el cursor sobre un hito para ver más información.
        </p>
      )}
    </section>
  );
}

type MilestoneCardProps = {
  row: DeliverableTrackerRow;
  theme: { accent: string; soft: string; ring: string };
  day: number;
  month: string;
  year: number;
  isDone: boolean;
  isActive: boolean;
  overdue: boolean;
};

function MilestoneCard({
  row,
  theme,
  day,
  month,
  year,
  isDone,
  isActive,
  overdue,
}: MilestoneCardProps) {
  return (
    <div
      className={`relative w-[156px] shrink-0 rounded-2xl border bg-white px-3.5 py-3 text-center shadow-md transition-shadow duration-150 ${
        isActive
          ? "border-2 shadow-lg"
          : "border-slate-100 hover:border-slate-200 hover:shadow-lg"
      }`}
      style={{
        borderColor: isActive ? theme.accent : undefined,
        boxShadow: isActive
          ? `0 10px 30px -12px ${theme.ring}, 0 0 0 4px ${theme.ring}`
          : undefined,
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
        className="text-[1.45rem] font-bold leading-none tracking-tight"
        style={{ color: theme.accent }}
      >
        {day} {month}
      </p>
      <p className="mt-0.5 text-[10px] font-medium uppercase tracking-wide text-slate-400">
        {year}
      </p>
      <p className="mt-2 line-clamp-2 text-[11px] font-medium leading-snug text-slate-700" title={row.title}>
        {row.title}
      </p>
    </div>
  );
}

function TimelineDetailPanel({
  row,
  date,
  onOpen,
}: {
  row: DeliverableTrackerRow;
  date: Date;
  onOpen: () => void;
}) {
  const st = normalizeDeliverableStatus(row.status);
  const day = date.getDate();
  const month = date.toLocaleDateString("es-MX", { month: "long" });
  const year = date.getFullYear();

  return (
    <div className="mt-5 border-t border-slate-200/80 pt-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
            {day} de {month} de {year} · {row.projectName}
          </p>
          <h3 className="mt-1 text-base font-semibold leading-snug text-slate-900">{row.title}</h3>
        </div>
        <button
          type="button"
          onClick={onOpen}
          className="shrink-0 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-800"
        >
          Abrir detalle
        </button>
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <p className="text-sm text-slate-700">
          <span className="font-semibold text-slate-900">Responsable:</span>{" "}
          {row.ownerName?.trim() || "—"}
        </p>
        <p className="text-sm text-slate-700">
          <span className="font-semibold text-slate-900">Estado:</span>{" "}
          {DELIVERABLE_STATUS_LABEL[st]} · {row.weight}% del avance
        </p>
        {row.phase ? (
          <p className="text-sm text-slate-700 sm:col-span-2">
            <span className="font-semibold text-slate-900">Fase:</span> {row.phase}
          </p>
        ) : null}
        {row.deliveredAt ? (
          <p className="text-sm text-slate-700 sm:col-span-2">
            <span className="font-semibold text-slate-900">Entregado:</span>{" "}
            {formatDeliveredAt(row.deliveredAt) ?? row.deliveredAt}
            {row.dueDate ? (
              <span className="text-slate-500">
                {" "}
                · Compromiso: {formatDueYmd(row.dueDate) ?? row.dueDate}
              </span>
            ) : null}
          </p>
        ) : null}
        {row.dependsOnId && row.dependsOnTitle ? (
          <p className="text-sm text-slate-700 sm:col-span-2">
            <span className="font-semibold text-slate-900">Depende de:</span> {row.dependsOnTitle}
          </p>
        ) : null}
        {row.description?.trim() ? (
          <p className="text-sm leading-relaxed text-slate-600 sm:col-span-2">
            {row.description.trim()}
          </p>
        ) : null}
        {row.supportUrl || row.supportFiles.length > 0 ? (
          <div className="flex flex-wrap gap-2 sm:col-span-2">
            {row.supportUrl ? (
              <a
                href={row.supportUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-200"
              >
                Ubicación
              </a>
            ) : null}
            {row.supportFiles.map((file) => (
              <a
                key={file.url}
                href={file.url}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-200"
              >
                {file.name}
              </a>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
