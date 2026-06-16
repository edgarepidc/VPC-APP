"use client";

import Link from "next/link";
import { useState } from "react";

import type { TaskLabelRecord } from "@/modules/tasks/labels";

import { TaskEditDialog, type TaskCardDTO, type TaskMemberOption } from "./task-edit-dialog";
import { TaskPriorityDot, taskCalendarChipClass } from "./task-ui";

const WEEKDAYS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

type ProjectOption = { id: string; name: string };

type Props = {
  tasks: TaskCardDTO[];
  calendarMonth: number;
  calendarYear: number;
  prevMonthHref: string;
  nextMonthHref: string;
  highlightTodayDay: number | null;
  undatedTasks: TaskCardDTO[];
  projects: ProjectOption[];
  members: TaskMemberOption[];
  labelCatalog: TaskLabelRecord[];
  canWrite: boolean;
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
  projects,
  members,
  labelCatalog,
  canWrite,
}: Props) {
  const [editTask, setEditTask] = useState<TaskCardDTO | null>(null);

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

  function openTask(task: TaskCardDTO) {
    if (canWrite) setEditTask(task);
  }

  return (
    <>
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
                      <li key={t.id}>
                        <button
                          type="button"
                          disabled={!canWrite}
                          onClick={() => openTask(t)}
                          className={`flex w-full items-start gap-1 text-left ${taskCalendarChipClass(t.status)} ${
                            canWrite ? "cursor-pointer hover:brightness-95" : "cursor-default"
                          }`}
                          title={[t.title, who ? `· ${who}` : ""].filter(Boolean).join(" ")}
                        >
                          <TaskPriorityDot priority={t.priority} />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate">{t.title}</span>
                            {who ? (
                              <span className="block truncate text-[9px] font-normal opacity-80">
                                {who}
                              </span>
                            ) : null}
                          </span>
                        </button>
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
                  <li key={t.id}>
                    <button
                      type="button"
                      disabled={!canWrite}
                      onClick={() => openTask(t)}
                      className={`flex w-full flex-wrap items-center justify-between gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-left ${
                        canWrite ? "cursor-pointer hover:bg-slate-50" : "cursor-default"
                      }`}
                    >
                      <span className="flex items-center gap-2 font-medium text-slate-900">
                        <TaskPriorityDot priority={t.priority} />
                        {t.title}
                      </span>
                      <span className="text-[11px] text-slate-500">
                        {t.projectName}
                        {who ? ` · ${who}` : ""}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <p className="text-[12px] text-slate-500">
          Vista calendario ligera (sin arrastre entre días). El mes se controla por la URL{" "}
          <code className="rounded bg-slate-100 px-1">?month=AAAA-MM</code>.
          {canWrite ? " Haz clic en una tarea para editarla." : null}
        </p>
      </div>

      <TaskEditDialog
        task={editTask}
        projects={projects}
        members={members}
        labelCatalog={labelCatalog}
        onClose={() => setEditTask(null)}
      />
    </>
  );
}
