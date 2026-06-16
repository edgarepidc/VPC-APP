export const TASK_VIEWS = ["kanban", "table", "calendar", "gantt"] as const;
export type TaskView = (typeof TASK_VIEWS)[number];

export type TasksFilterParams = {
  view: string;
  project: string;
  q: string;
  assignee?: string;
  priority?: string;
  status?: string;
  month?: string;
};

export function normalizeTaskView(raw: string | undefined): TaskView {
  const v = raw?.trim().toLowerCase();
  return TASK_VIEWS.includes(v as TaskView) ? (v as TaskView) : "kanban";
}

export function buildTasksQuery({
  view,
  project,
  q,
  assignee,
  priority,
  status,
  month,
}: TasksFilterParams): string {
  const sp = new URLSearchParams();
  const v = normalizeTaskView(view);
  sp.set("view", v);
  if (project.trim()) sp.set("project", project.trim());
  if (q.trim()) sp.set("q", q.trim());
  if (assignee?.trim()) sp.set("assignee", assignee.trim());
  if (priority?.trim()) sp.set("priority", priority.trim());
  if (status?.trim()) sp.set("status", status.trim());
  if (month && /^\d{4}-\d{2}$/.test(month)) sp.set("month", month);
  return sp.toString();
}

export function buildTasksHref(params: TasksFilterParams): string {
  const qs = buildTasksQuery(params);
  return qs ? `/dashboard/tasks?${qs}` : "/dashboard/tasks";
}

export function tasksFilterContextFromForm(formData: FormData) {
  return {
    view: String(formData.get("view") ?? "kanban"),
    project: String(formData.get("project") ?? ""),
    q: String(formData.get("q") ?? ""),
    assignee: String(formData.get("assignee") ?? "").trim() || undefined,
    priority: String(formData.get("priorityFilter") ?? "").trim() || undefined,
    status: String(formData.get("statusFilter") ?? "").trim() || undefined,
    month: String(formData.get("month") ?? "").trim() || undefined,
  };
}
