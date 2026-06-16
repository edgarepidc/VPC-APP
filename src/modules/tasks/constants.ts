/** Columnas del flujo Kanban (alineado con `Task.status` en Prisma). */
export const TASK_KANBAN_STATUSES = ["todo", "in_progress", "done"] as const;
export type TaskKanbanStatus = (typeof TASK_KANBAN_STATUSES)[number];

export const TASK_STATUS_LABEL: Record<TaskKanbanStatus, string> = {
  todo: "Por hacer",
  in_progress: "En curso",
  done: "Hecha",
};

/** Estilo visual por columna Kanban. */
export const TASK_KANBAN_COLUMN_THEME: Record<
  TaskKanbanStatus,
  {
    accent: string;
    columnBg: string;
    columnBorder: string;
    headerText: string;
    dropRing: string;
    cardAccent: string;
  }
> = {
  todo: {
    accent: "bg-slate-700",
    columnBg: "bg-slate-50",
    columnBorder: "border-slate-200",
    headerText: "text-slate-700",
    dropRing: "ring-slate-400",
    cardAccent: "border-l-slate-400",
  },
  in_progress: {
    accent: "bg-blue-600",
    columnBg: "bg-sky-50/80",
    columnBorder: "border-sky-200",
    headerText: "text-blue-800",
    dropRing: "ring-blue-400",
    cardAccent: "border-l-blue-500",
  },
  done: {
    accent: "bg-green-600",
    columnBg: "bg-emerald-50/80",
    columnBorder: "border-emerald-200",
    headerText: "text-emerald-800",
    dropRing: "ring-emerald-400",
    cardAccent: "border-l-emerald-500",
  },
};

export function normalizeTaskStatus(raw: string): TaskKanbanStatus {
  const s = raw.trim().toLowerCase().replace(/-/g, "_");
  if (s === "doing" || s === "inprogress") return "in_progress";
  if (s === "complete" || s === "completed") return "done";
  if (TASK_KANBAN_STATUSES.includes(s as TaskKanbanStatus)) {
    return s as TaskKanbanStatus;
  }
  return "todo";
}

export const TASK_PRIORITIES = ["high", "medium", "low"] as const;
export type TaskPriority = (typeof TASK_PRIORITIES)[number];

export const TASK_PRIORITY_LABEL: Record<TaskPriority, string> = {
  high: "Alta",
  medium: "Media",
  low: "Baja",
};

export const TASK_PRIORITY_THEME: Record<
  TaskPriority,
  { badge: string; dot: string; gantt: string }
> = {
  high: {
    badge: "bg-rose-50 text-rose-800 ring-rose-200",
    dot: "bg-rose-500",
    gantt: "bg-rose-500",
  },
  medium: {
    badge: "bg-amber-50 text-amber-900 ring-amber-200",
    dot: "bg-amber-500",
    gantt: "bg-sky-600",
  },
  low: {
    badge: "bg-slate-100 text-slate-600 ring-slate-200",
    dot: "bg-slate-400",
    gantt: "bg-slate-400",
  },
};

export const TASK_STATUS_BADGE: Record<TaskKanbanStatus, string> = {
  todo: "bg-slate-100 text-slate-700 ring-slate-200",
  in_progress: "bg-sky-50 text-sky-800 ring-sky-200",
  done: "bg-emerald-50 text-emerald-800 ring-emerald-200",
};

export function normalizeTaskPriority(raw: string): TaskPriority {
  const s = raw.trim().toLowerCase();
  if (s === "alta" || s === "high" || s === "urgent") return "high";
  if (s === "baja" || s === "low") return "low";
  if (TASK_PRIORITIES.includes(s as TaskPriority)) return s as TaskPriority;
  return "medium";
}
