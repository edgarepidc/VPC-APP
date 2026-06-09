"use client";

import type { TaskCardDTO } from "./task-edit-dialog";

type Props = {
  tasks: TaskCardDTO[];
};

/** Vista tipo timeline simple: inicio = creación, fin = vence o +3 días. */
export function TasksGanttView({ tasks }: Props) {
  if (tasks.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-slate-500">
        No hay tareas para mostrar en el diagrama.
      </p>
    );
  }

  const ranges = tasks.map((t) => {
    const start = new Date(t.createdAt).getTime();
    const end = t.dueDate
      ? new Date(t.dueDate).getTime()
      : start + 3 * 86400000;
    return { task: t, start, end: Math.max(end, start + 86400000) };
  });

  const min = Math.min(...ranges.map((r) => r.start));
  const max = Math.max(...ranges.map((r) => r.end));
  const span = Math.max(max - min, 86400000);

  return (
    <div className="space-y-3">
      <p className="text-sm text-slate-600">
        Cada fila es una tarea. La barra va desde la <strong>creación</strong>{" "}
        hasta la <strong>fecha límite</strong> (si no hay, se asume un tramo de
        unos días). Esto es un sustituto ligero de un Gantt completo (sin
        dependencias ni hitos).
      </p>
      <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50/50 p-3">
        {ranges.map(({ task, start, end }) => {
          const left = ((start - min) / span) * 100;
          const width = Math.max(((end - start) / span) * 100, 2);
          return (
            <div
              key={task.id}
              className="grid grid-cols-[minmax(0,1fr)_minmax(120px,2fr)] items-center gap-2 text-sm"
            >
              <p className="truncate font-medium text-slate-900" title={task.title}>
                {task.title}
              </p>
              <div className="relative h-7 rounded bg-slate-200/80">
                <div
                  className="absolute top-1 h-5 rounded bg-sky-600/90"
                  style={{
                    left: `${left}%`,
                    width: `${width}%`,
                    maxWidth: "100%",
                  }}
                  title={`${task.projectName}${task.dueDate ? ` · vence ${new Date(task.dueDate).toLocaleDateString()}` : ""}`}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
