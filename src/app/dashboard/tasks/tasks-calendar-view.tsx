"use client";

import Link from "next/link";

import type { TaskCardDTO } from "./task-edit-dialog";

const WEEKDAYS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

type Props = {
  tasks: TaskCardDTO[];
  /** Mes mostrado (1–12). */
  calendarMonth: number;
  calendarYear: number;
  prevMonthHref: string;
  nextMonthHref: string;
  /** Día del mes a resaltar como “hoy” (solo si el mes coincide con la fecha del servidor). */
  highlightTodayDay: number | null;
  undatedTasks: TaskCardDTO[];
};

function assigneeLabel(t: TaskCardDTO): string | null {
  if (t.assigneeName?.trim()) return t.assigneeName.trim();
  if (t.assigneeEmail) return t.assigneeEmail.split("@")[0] ?? t.assigneeEmail;
  return null;
}

export function TasksCalendarView({
  tasks,
  calendarMonth,
  calendarYear,
  prevMonthHref,
  nextMonthHref,
  highlightTodayDay,
  undatedTasks,
}: Props) {
  const y = calendarYear;
  const mo = calendarMonth - 1;
  const first = new Date(y, mo, 1);
  const lastDay = new Date(y, mo + 1, 0).getDate();
  const padStart = first.getDay();

  const byDay = new Map<number, TaskCardDTO[]>();
  for (const t of tasks) {
    if (!t.dueDate) continue;
    const d = new Date(t.dueDate);
    if (d.getFullYear() !== y || d.getMonth() !== mo) continue;
    const dom = d.getDate();
    const arr = byDay.get(dom) ?? [];
    arr.push(t);
    byDay.set(dom, arr);
  }

  const cells: (number | null)[] = [];
  for (let i = 0; i < padStart; i++) cells.push(null);
  for (let d = 1; d <= lastDay; d++) cells.push(d);

  const monthTitle = new Date(y, mo, 1).toLocaleString("es", {
    month: "long",
    year: "numeric",
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-600">
          Tareas con <strong>fecha límite</strong> en{" "}
          <span className="font-semibold capitalize text-slate-900">{monthTitle}</span>.
        </p>
        <div className="flex items-center gap-2">
          <Link
            href={prevMonthHref}
            className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-800 hover:bg-slate-50"
          >
            ← Mes anterior
          </Link>
          <Link
            href={nextMonthHref}
            className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-800 hover:bg-slate-50"
          >
            Mes siguiente →
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-px overflow-hidden rounded-lg border border-slate-200 bg-slate-200 text-center text-xs">
        {WEEKDAYS.map((w) => (
          <div
            key={w}
            className="bg-slate-100 py-2 font-semibold uppercase tracking-wide text-slate-600"
          >
            {w}
          </div>
        ))}
        {cells.map((day, i) =>
          day === null ? (
            <div key={`e-${i}`} className="min-h-[88px] bg-slate-50" />
          ) : (
            <div
              key={day}
              className={`min-h-[88px] bg-white p-1 text-left align-top ${
                highlightTodayDay === day ? "ring-2 ring-inset ring-sky-400" : ""
              }`}
            >
              <p className="text-[11px] font-semibold text-slate-500">{day}</p>
              <ul className="mt-1 space-y-1">
                {(byDay.get(day) ?? []).map((t) => {
                  const who = assigneeLabel(t);
                  return (
                    <li
                      key={t.id}
                      className="truncate rounded bg-amber-50 px-1 py-0.5 text-[10px] text-amber-950"
                      title={[t.title, who ? `· ${who}` : ""].filter(Boolean).join(" ")}
                    >
                      <span className="block truncate">{t.title}</span>
                      {who ? (
                        <span className="block truncate text-[9px] font-normal text-amber-900/80">
                          {who}
                        </span>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            </div>
          ),
        )}
      </div>

      <section className="rounded-lg border border-slate-200 bg-slate-50/80 p-4">
        <h3 className="text-sm font-semibold text-slate-900">
          Sin fecha límite ({undatedTasks.length})
        </h3>
        <p className="mt-1 text-[12px] text-slate-600">
          Mismos filtros de proyecto y búsqueda; no aparecen en la grilla del mes.
        </p>
        {undatedTasks.length === 0 ? (
          <p className="mt-3 text-sm text-slate-500">No hay tareas sin fecha.</p>
        ) : (
          <ul className="mt-3 max-h-48 space-y-2 overflow-y-auto text-sm">
            {undatedTasks.map((t) => {
              const who = assigneeLabel(t);
              return (
                <li
                  key={t.id}
                  className="flex flex-wrap items-baseline justify-between gap-2 rounded-md border border-slate-200 bg-white px-3 py-2"
                >
                  <span className="font-medium text-slate-900">{t.title}</span>
                  <span className="text-[11px] text-slate-500">
                    {t.projectName}
                    {who ? ` · ${who}` : ""}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <p className="text-[12px] text-slate-500">
        Vista calendario ligera (sin arrastre entre días). El mes se controla por la URL{" "}
        <code className="rounded bg-slate-100 px-1">?month=AAAA-MM</code>.
      </p>
    </div>
  );
}
