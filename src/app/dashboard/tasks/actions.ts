"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getSessionUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/rbac";
import { assertCanAccessProject } from "@/modules/memberships/project-access";
import {
  TASK_KANBAN_STATUSES,
  normalizeTaskStatus,
  type TaskKanbanStatus,
} from "@/modules/tasks/constants";
import { createTask, moveTaskToStatus, updateTask } from "@/modules/tasks/service";

function buildTasksUrl(input: {
  view: string;
  project: string;
  q: string;
  extra?: Record<string, string>;
}) {
  const sp = new URLSearchParams();
  const view = ["kanban", "table", "calendar", "gantt"].includes(input.view)
    ? input.view
    : "kanban";
  sp.set("view", view);
  if (input.project.trim()) sp.set("project", input.project.trim());
  if (input.q.trim()) sp.set("q", input.q.trim());
  if (input.extra) {
    for (const [k, v] of Object.entries(input.extra)) {
      sp.set(k, v);
    }
  }
  return `/dashboard/tasks?${sp.toString()}`;
}

function parseOptionalLocalDate(raw: string): Date | null {
  const s = raw.trim();
  if (!s) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  if (!y || !mo || !d) return null;
  return new Date(y, mo - 1, d);
}

export async function createTaskWithContextAction(formData: FormData) {
  const s = await getSessionUser();
  if (!s?.activeTenantId) redirect("/login");

  const view = String(formData.get("view") ?? "kanban");
  const projectFilter = String(formData.get("project") ?? "");
  const q = String(formData.get("q") ?? "");
  const month = String(formData.get("month") ?? "").trim();
  const monthExtra =
    view === "calendar" && /^\d{4}-\d{2}$/.test(month) ? { month } : undefined;

  if (!hasPermission(s.role, "tasks.write")) {
    redirect(
      buildTasksUrl({
        view,
        project: projectFilter,
        q,
        extra: { ...monthExtra, error: "No tienes permiso para crear tareas" },
      }),
    );
  }

  const projectId = String(formData.get("projectId") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  const dueRaw = String(formData.get("dueDate") ?? "");
  const dueDate = parseOptionalLocalDate(dueRaw);
  const assigneeUserId = String(formData.get("assigneeUserId") ?? "").trim() || undefined;

  if (!projectId || !title) {
    redirect(
      buildTasksUrl({
        view,
        project: projectFilter,
        q,
        extra: { ...monthExtra, error: "Proyecto y título son obligatorios" },
      }),
    );
  }

  try {
    await assertCanAccessProject({
      tenantId: s.activeTenantId,
      userId: s.userId,
      role: s.role,
      projectId,
      isPlatformVisit: s.isPlatformVisit,
    });
    await createTask({
      tenantId: s.activeTenantId,
      projectId,
      title,
      dueDate: dueDate ?? undefined,
      assigneeUserId,
    });
    redirect(
      buildTasksUrl({
        view,
        project: projectFilter,
        q,
        extra: { ...monthExtra, ok: "Tarea creada" },
      }),
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error al crear";
    redirect(
      buildTasksUrl({
        view,
        project: projectFilter,
        q,
        extra: { ...monthExtra, error: msg },
      }),
    );
  }
}

export async function moveTaskAction(formData: FormData) {
  const s = await getSessionUser();
  if (!s?.activeTenantId) throw new Error("No autorizado");
  if (!hasPermission(s.role, "tasks.write")) {
    throw new Error("Sin permiso");
  }

  const taskId = String(formData.get("taskId") ?? "").trim();
  const rawStatus = String(formData.get("status") ?? "").trim();
  if (!taskId || !TASK_KANBAN_STATUSES.includes(rawStatus as TaskKanbanStatus)) {
    throw new Error("Datos inválidos");
  }

  await moveTaskToStatus({
    tenantId: s.activeTenantId,
    taskId,
    status: rawStatus as TaskKanbanStatus,
  });
  revalidatePath("/dashboard/tasks");
}

export async function updateTaskAction(formData: FormData) {
  const s = await getSessionUser();
  if (!s?.activeTenantId) throw new Error("No autorizado");
  if (!hasPermission(s.role, "tasks.write")) {
    throw new Error("Sin permiso");
  }

  const taskId = String(formData.get("taskId") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  const status = String(formData.get("status") ?? "").trim();
  const projectId = String(formData.get("projectId") ?? "").trim();
  const dueRaw = String(formData.get("dueDate") ?? "");
  const assigneeRaw = String(formData.get("assigneeUserId") ?? "").trim();
  const assigneeUserId = assigneeRaw === "" ? null : assigneeRaw;

  if (!taskId) throw new Error("Tarea inválida");
  if (!title) throw new Error("El título es obligatorio");

  await updateTask({
    tenantId: s.activeTenantId,
    taskId,
    title,
    status: normalizeTaskStatus(status),
    projectId,
    dueDate: parseOptionalLocalDate(dueRaw),
    assigneeUserId,
  });
  revalidatePath("/dashboard/tasks");
}
