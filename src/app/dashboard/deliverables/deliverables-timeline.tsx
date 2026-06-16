"use client";

import { useMemo, useState } from "react";

import {
  DELIVERABLE_STATUS_LABEL,
  STATUS_LOG_COLORS,
  isDeliverableDoneStatus,
  normalizeDeliverableStatus,
  type DeliverableStatus,
} from "@/modules/deliverables/constants";

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
  pending: { accent: STATUS_LOG_COLORS.pending, soft: "#f8fafc", ring: "rgba(100,116,139,0.28)" },
  review: { accent: STATUS_LOG_COLORS.review, soft: "#f0f9ff", ring: "rgba(14,165,233,0.28)" },
  approved: { accent: STATUS_LOG_COLORS.approved, soft: "#ecfdf5", ring: "rgba(16,185,129,0.28)" },
  rejected: { accent: STATUS_LOG_COLORS.rejected, soft: "#fff1f2", ring: "rgba(244,63,94,0.28)" },
  delivered: { accent: STATUS_LOG_COLORS.delivered, soft: "#f8fafc", ring: "rgba(100,116,139,0.28)" },
};

function themeForRow(row: DeliverableTrackerRow, overdue: boolean) {
  const st = normalizeDeliverableStatus(row.status);
  if (overdue && !isDeliverableDoneStatus(st)) {
    return { accent: "#dc2626", soft: "#fef2f2", ring: "rgba(220,38,38,0.28)" };
  }
  return STATUS_THEME[st];
}

const TRACK_INSET = 8;
const TRACK_SIDE_PAD = 48;
/** A partir de cuántos hitos usamos espaciado uniforme (evita solapamiento). */
const EQUAL_SPACING_FROM = 4;
const SLOT_WIDTH_PX = 112;
const CONNECTOR_H = 40;

type TimelineItem = { row: DeliverableTrackerRow; date: Date };

type DeliverablesTimelineProps = {
  rows: DeliverableTrackerRow[];
  focusId?: string | null;
  onFocusChange?: (id: string | null) => void;
  onSelect: (id: string) => void;
  showDependencies?: boolean;
};

function computeLeftPct(index: number, count: number, date: Date, range: { min: number; span: number } | null) {
  const usable = 100 - TRACK_INSET * 2;
  if (count >= EQUAL_SPACING_FROM) {
    return TRACK_INSET + ((index + 0.5) / count) * usable;
  }
  if (!range || count === 1) return TRACK_INSET + usable / 2;
  const raw = ((date.getTime() - range.min) / range.span) * usable;
  return TRACK_INSET + raw;
}

export function DeliverablesTimeline({
  rows,
  focusId,
  onFocusChange,
  onSelect,
  showDependencies = false,
}: DeliverablesTimelineProps) {
  const [hoverId, setHoverId] = useState<string | null>(null);

  const items = useMemo((): TimelineItem[] => {
    return rows
      .map((row) => ({ row, date: parseYmd(row.dueDate) }))
      .filter((item): item is TimelineItem => item.date !== null)
      .sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [rows]);

  const range = useMemo(() => {
    if (items.length === 0) return null;
    const min = items[0]!.date.getTime();
    const max = items[items.length - 1]!.date.getTime();
    return { min, max, span: Math.max(max - min, 86400000) };
  }, [items]);

  const useEqualSpacing = items.length >= EQUAL_SPACING_FROM;
  const trackMinWidth = Math.max(
    640,
    items.length * SLOT_WIDTH_PX + TRACK_SIDE_PAD * 2,
  );

  const placedItems = useMemo(
    () =>
      items.map((item, index) => ({
        ...item,
        left: computeLeftPct(index, items.length, item.date, range),
        isAbove: index % 2 === 0,
      })),
    [items, range],
  );

  const positionsById = useMemo(() => {
    const map = new Map<string, number>();
    for (const item of placedItems) map.set(item.row.id, item.left);
    return map;
  }, [placedItems]);

  const todayLeft = useMemo(() => {
    if (!range || useEqualSpacing) return null;
    const t = new Date();
    t.setHours(0, 0, 0, 0);
    const pct = ((t.getTime() - range.min) / range.span) * 100;
    if (pct < 0 || pct > 100) return null;
    return TRACK_INSET + (pct * (100 - TRACK_INSET * 2)) / 100;
  }, [range, useEqualSpacing]);

  const gradientLine = useMemo(() => {
    if (placedItems.length === 0) return "#cbd5e1";
    const colors = placedItems.map(({ row, date }) => {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const overdue =
        !isDeliverableDoneStatus(row.status) && date.getTime() < todayStart.getTime();
      return themeForRow(row, overdue).accent;
    });
    if (colors.length === 1) return colors[0]!;
    return `linear-gradient(to right, ${colors.join(", ")})`;
  }, [placedItems]);

  const previewId = hoverId ?? focusId ?? null;
  const previewItem = useMemo(
    () => placedItems.find(({ row }) => row.id === previewId) ?? null,
    [placedItems, previewId],
  );

  const dependencyEdges = useMemo(() => {
    if (!showDependencies) return [];
    const itemIds = new Set(items.map(({ row }) => row.id));
    return items
      .filter(({ row }) => row.dependsOnId && itemIds.has(row.dependsOnId))
      .map(({ row }) => ({
        fromId: row.dependsOnId!,
        toId: row.id,
        fromLeft: positionsById.get(row.dependsOnId!) ?? 0,
        toLeft: positionsById.get(row.id) ?? 0,
      }))
      .filter((e) => e.fromLeft !== e.toLeft);
  }, [items, positionsById, showDependencies]);

  if (items.length === 0) {
    return (
      <section className="py-6 text-center text-sm text-slate-500">
        Añade fechas compromiso para ver la línea de tiempo.
      </section>
    );
  }

  return (
    <section
      className="overflow-visible rounded-xl border border-slate-200 bg-white px-4 py-4"
      onMouseLeave={() => setHoverId(null)}
    >
      <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-base font-semibold text-slate-900">Línea de tiempo</h2>
          <p className="mt-0.5 text-xs text-slate-500">
            {useEqualSpacing
              ? "Vista compacta con espaciado uniforme · clic para abrir detalle."
              : "Hitos por fecha compromiso · clic para abrir detalle."}
          </p>
        </div>
        <span className="text-xs text-slate-400">{items.length} fechas</span>
      </div>

      <div className="mb-3 flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-slate-500">
        {(Object.keys(STATUS_THEME) as DeliverableStatus[]).map((st) => (
          <span key={st} className="inline-flex items-center gap-1">
            <span className="h-2 w-2 rounded-full" style={{ background: STATUS_THEME[st].accent }} />
            {DELIVERABLE_STATUS_LABEL[st]}
          </span>
        ))}
        <span className="inline-flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-rose-500" />
          Vencido
        </span>
      </div>

      <div className="overflow-x-auto overflow-y-visible overscroll-x-contain pb-1 pt-1">
        <div
          className="relative mx-auto"
          style={{
            minWidth: trackMinWidth,
            height: 220,
            paddingLeft: TRACK_SIDE_PAD,
            paddingRight: TRACK_SIDE_PAD,
          }}
        >
          <div className="relative h-full w-full">
            {showDependencies && dependencyEdges.length > 0 ? (
              <svg
                className="pointer-events-none absolute inset-0 z-[1] h-full w-full overflow-visible"
                viewBox="0 0 100 100"
                preserveAspectRatio="none"
                aria-hidden
              >
                {dependencyEdges.map((edge) => {
                  const y = 50;
                  const mid = (edge.fromLeft + edge.toLeft) / 2;
                  return (
                    <path
                      key={`${edge.fromId}-${edge.toId}`}
                      d={`M ${edge.fromLeft} ${y} Q ${mid} ${y - 10} ${edge.toLeft} ${y}`}
                      fill="none"
                      stroke="#94a3b8"
                      strokeWidth="0.35"
                      vectorEffect="non-scaling-stroke"
                      strokeDasharray="1.2 0.8"
                      opacity="0.75"
                    />
                  );
                })}
              </svg>
            ) : null}

            <div
              className="deliverable-timeline-line absolute left-0 right-0 top-1/2 h-1 -translate-y-1/2 rounded-full opacity-90"
              style={{ background: gradientLine }}
              aria-hidden
            />

            {todayLeft !== null ? (
              <div
                className="pointer-events-none absolute top-[12%] bottom-[12%] z-[2] w-0.5 bg-amber-500"
                style={{ left: `${todayLeft}%` }}
              >
                <span className="absolute -top-5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-amber-500 px-1.5 py-0.5 text-[9px] font-bold uppercase text-white">
                  Hoy
                </span>
              </div>
            ) : null}

            {placedItems.map(({ row, date, left, isAbove }) => {
              const st = normalizeDeliverableStatus(row.status);
              const isDone = isDeliverableDoneStatus(row.status);
              const todayStart = new Date();
              todayStart.setHours(0, 0, 0, 0);
              const overdue = !isDone && date.getTime() < todayStart.getTime();
              const theme = themeForRow(row, overdue);
              const isHighlighted = previewId === row.id;

              const day = date.getDate();
              const month = date.toLocaleDateString("es-MX", { month: "short" }).replace(".", "");

              return (
                <div
                  key={row.id}
                  className={`absolute top-1/2 ${isHighlighted ? "z-20" : "z-10"}`}
                  style={{ left: `${left}%` }}
                >
                  <button
                    type="button"
                    onMouseEnter={() => setHoverId(row.id)}
                    onFocus={() => setHoverId(row.id)}
                    onClick={() => {
                      onFocusChange?.(row.id);
                      onSelect(row.id);
                    }}
                    className="relative block h-0 w-0 overflow-visible border-0 bg-transparent p-0 outline-none"
                    aria-label={`${row.title}, ${day} ${month}`}
                    aria-pressed={isHighlighted}
                  >
                    <span
                      className="absolute left-0 z-0 w-px"
                      style={{
                        height: CONNECTOR_H,
                        backgroundColor: theme.accent,
                        top: 0,
                        transform: isAbove ? "translate(-50%, -100%)" : "translateX(-50%)",
                      }}
                      aria-hidden
                    />
                    <span
                      className={`absolute left-0 top-0 z-10 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-sm ${
                        isDone ? "h-3.5 w-3.5" : "h-3 w-3"
                      } ${isHighlighted ? "ring-2 ring-offset-1" : ""}`}
                      style={{
                        backgroundColor: isDone ? theme.accent : "white",
                        outline: isDone ? undefined : `2px solid ${theme.accent}`,
                        outlineOffset: isDone ? undefined : "-1px",
                        ...(isHighlighted ? { boxShadow: `0 0 0 2px ${theme.ring}` } : {}),
                      }}
                      aria-hidden
                    />
                    <div
                      className="absolute left-0 z-[5] -translate-x-1/2"
                      style={isAbove ? { bottom: CONNECTOR_H } : { top: CONNECTOR_H }}
                    >
                      <MilestoneChip
                        row={row}
                        theme={theme}
                        day={day}
                        month={month}
                        isDone={isDone}
                        isActive={isHighlighted}
                        overdue={overdue}
                      />
                    </div>
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="mt-3 min-h-[108px] border-t border-slate-200/80 pt-3">
        {previewItem ? (
          <TimelineDetailPanel
            row={previewItem.row}
            date={previewItem.date}
            onOpen={() => {
              onFocusChange?.(previewItem.row.id);
              onSelect(previewItem.row.id);
            }}
          />
        ) : (
          <p className="py-6 text-center text-xs text-slate-400">
            Pasa el cursor sobre un hito o haz clic para ver detalle y editar.
          </p>
        )}
      </div>
    </section>
  );
}

function MilestoneChip({
  row,
  theme,
  day,
  month,
  isDone,
  isActive,
  overdue,
}: {
  row: DeliverableTrackerRow;
  theme: { accent: string; soft: string; ring: string };
  day: number;
  month: string;
  isDone: boolean;
  isActive: boolean;
  overdue: boolean;
}) {
  return (
    <div
      className={`relative w-[100px] shrink-0 rounded-lg border bg-white px-2 py-1.5 text-center shadow-sm transition-shadow ${
        isActive ? "border-2 shadow-md" : "border-slate-100 hover:border-slate-200 hover:shadow"
      }`}
      style={{
        borderColor: isActive ? theme.accent : undefined,
        backgroundColor: isActive ? theme.soft : undefined,
      }}
    >
      {isDone ? (
        <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 text-[8px] font-bold text-white">
          ✓
        </span>
      ) : null}
      {overdue ? (
        <span className="absolute -left-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[8px] font-bold text-white">
          !
        </span>
      ) : null}
      <p className="text-[11px] font-bold leading-none" style={{ color: theme.accent }}>
        {day} {month}
      </p>
      <p
        className="mt-1 line-clamp-2 text-[9px] font-medium leading-tight text-slate-600"
        title={row.title}
      >
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
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
          {day} de {month} de {year} · {row.projectName}
        </p>
        <h3 className="mt-0.5 text-sm font-semibold leading-snug text-slate-900">{row.title}</h3>
        <p className="mt-1 text-xs text-slate-600">
          {DELIVERABLE_STATUS_LABEL[st]} · {row.weight}% · {row.ownerName?.trim() || "Sin responsable"}
        </p>
      </div>
      <button
        type="button"
        onClick={onOpen}
        className="shrink-0 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-800"
      >
        Abrir detalle
      </button>
    </div>
  );
}
