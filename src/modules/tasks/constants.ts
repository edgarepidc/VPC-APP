/** Columnas del flujo Kanban (alineado con `Task.status` en Prisma). */
export const TASK_KANBAN_STATUSES = ["todo", "in_progress", "done"] as const;
export type TaskKanbanStatus = (typeof TASK_KANBAN_STATUSES)[number];

export const TASK_STATUS_LABEL: Record<TaskKanbanStatus, string> = {
  todo: "Por hacer",
  in_progress: "En curso",
  done: "Hecha",
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
