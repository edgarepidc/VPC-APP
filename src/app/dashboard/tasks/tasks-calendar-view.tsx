"use client";

import type { TaskCardDTO } from "./task-edit-dialog";

const WEEKDAYS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

type Props = {
  tasks: TaskCardDTO[];
};

export function TasksCalendarView({ tasks }: Props) {
  const now = new Date();
  const y = now.getFullYear();
  const mo = now.getMonth();
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

  return (
    <div className="space-y-3">
      <p className="text-sm text-zinc-600">
        Mes actual:{" "}
        <span className="font-semibold text-zinc-900">
          {now.toLocaleString("es", { month: "long", year: "numeric" })}
        </span>
        . Solo se muestran tareas con <strong>fecha límite</strong> en este mes.
      </p>
      <div className="grid grid-cols-7 gap-px overflow-hidden rounded-lg border border-zinc-200 bg-zinc-200 text-center text-xs">
        {WEEKDAYS.map((w) => (
          <div
            key={w}
            className="bg-zinc-100 py-2 font-semibold uppercase tracking-wide text-zinc-600"
          >
            {w}
          </div>
        ))}
        {cells.map((day, i) =>
          day === null ? (
            <div key={`e-${i}`} className="min-h-[88px] bg-zinc-50" />
          ) : (
            <div
              key={day}
              className="min-h-[88px] bg-white p-1 text-left align-top"
            >
              <p className="text-[11px] font-semibold text-zinc-500">{day}</p>
              <ul className="mt-1 space-y-1">
                {(byDay.get(day) ?? []).map((t) => (
                  <li
                    key={t.id}
                    className="truncate rounded bg-amber-50 px-1 py-0.5 text-[10px] text-amber-950"
                    title={t.title}
                  >
                    {t.title}
                  </li>
                ))}
              </ul>
            </div>
          ),
        )}
      </div>
      <p className="text-[12px] text-zinc-500">
        Vista tipo calendario ligera (sin arrastre entre días). Para Gantt y
        dependencias entre tareas se puede evolucionar con librería dedicada.
      </p>
    </div>
  );
}
