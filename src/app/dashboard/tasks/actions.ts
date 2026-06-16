"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getSessionUser } from "@/lib/auth/session";
import { canWriteWorkspaceData } from "@/lib/workspace-access";
import { assertCanAccessProject } from "@/modules/memberships/project-access";
import {
  TASK_KANBAN_STATUSES,
  normalizeTaskPriority,
  normalizeTaskStatus,
  type TaskKanbanStatus,
} from "@/modules/tasks/constants";
import { parseTaskChecklist } from "@/modules/tasks/json";
import { parseTaskLabelIds } from "@/modules/tasks/labels";
import { createTaskLabel } from "@/modules/tasks/label-service";
import {
  assignTaskToUser,
  createTask,
  getTaskById,
  moveTaskToStatus,
  updateTask,
} from "@/modules/tasks/service";

import { buildTasksHref, tasksFilterContextFromForm } from "./tasks-query";

function buildTasksUrl(input: {
  view: string;
  project: string;
  q: string;
  assignee?: string;
  priority?: string;
  status?: string;
  label?: string;
  extra?: Record<string, string>;
}) {
  const month = input.extra?.month;
  const { month: _m, ...extra } = input.extra ?? {};
  const base = buildTasksHref({
    view: input.view,
    project: input.project,
    q: input.q,
    assignee: input.assignee,
    priority: input.priority,
    status: input.status,
    label: input.label,
    month,
  });
  if (!extra || Object.keys(extra).length === 0) return base;
  const sp = new URLSearchParams(base.split("?")[1] ?? "");
  for (const [k, v] of Object.entries(extra)) {
    if (k !== "month") sp.set(k, v);
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

  const ctx = tasksFilterContextFromForm(formData);
  const view = ctx.view;
  const projectFilter = ctx.project;
  const q = ctx.q;
  const month = ctx.month && /^\d{4}-\d{2}$/.test(ctx.month) ? ctx.month : undefined;
  const monthExtra = view === "calendar" && month ? { month } : undefined;
  const filterParams = {
    assignee: ctx.assignee,
    priority: ctx.priority,
    status: ctx.status,
    label: ctx.label,
  };

  if (!canWriteWorkspaceData(s)) {
    redirect(
      buildTasksUrl({
        view,
        project: projectFilter,
        q,
        ...filterParams,
        extra: { ...monthExtra, error: "No tienes permiso para crear tareas" },
      }),
    );
  }

  const projectId = String(formData.get("projectId") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  const dueRaw = String(formData.get("dueDate") ?? "");
  const dueDate = parseOptionalLocalDate(dueRaw);
  const assigneeUserId = String(formData.get("assigneeUserId") ?? "").trim() || undefined;
  const priority = normalizeTaskPriority(String(formData.get("priority") ?? "medium"));
  const labelIdsRaw = String(formData.get("labelIdsJson") ?? "[]");
  let labelIds: string[] = [];
  try {
    labelIds = parseTaskLabelIds(JSON.parse(labelIdsRaw));
  } catch {
    labelIds = [];
  }

  if (!projectId || !title) {
    redirect(
      buildTasksUrl({
        view,
        project: projectFilter,
        q,
        ...filterParams,
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
      priority,
      labelIds,
      dueDate: dueDate ?? undefined,
      assigneeUserId,
    });
    redirect(
      buildTasksUrl({
        view,
        project: projectFilter,
        q,
        ...filterParams,
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
        ...filterParams,
        extra: { ...monthExtra, error: msg },
      }),
    );
  }
}

export async function moveTaskAction(formData: FormData) {
  const s = await getSessionUser();
  if (!s?.activeTenantId) throw new Error("No autorizado");
  if (!canWriteWorkspaceData(s)) {
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
  if (!canWriteWorkspaceData(s)) {
    throw new Error("Sin permiso");
  }

  const taskId = String(formData.get("taskId") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  const status = String(formData.get("status") ?? "").trim();
  const projectId = String(formData.get("projectId") ?? "").trim();
  const dueRaw = String(formData.get("dueDate") ?? "");
  const assigneeRaw = String(formData.get("assigneeUserId") ?? "").trim();
  const assigneeUserId = assigneeRaw === "" ? null : assigneeRaw;
  const priority = normalizeTaskPriority(String(formData.get("priority") ?? "medium"));
  const checklistRaw = String(formData.get("checklistJson") ?? "[]");
  let checklist = parseTaskChecklist([]);
  try {
    checklist = parseTaskChecklist(JSON.parse(checklistRaw));
  } catch {
    checklist = [];
  }
  const labelIdsRaw = String(formData.get("labelIdsJson") ?? "[]");
  let labelIds: string[] = [];
  try {
    labelIds = parseTaskLabelIds(JSON.parse(labelIdsRaw));
  } catch {
    labelIds = [];
  }

  if (!taskId) throw new Error("Tarea inválida");
  if (!title) throw new Error("El título es obligatorio");

  await updateTask({
    tenantId: s.activeTenantId,
    taskId,
    title,
    status: normalizeTaskStatus(status),
    priority,
    checklist,
    labelIds,
    projectId,
    dueDate: parseOptionalLocalDate(dueRaw),
    assigneeUserId,
  });
  revalidatePath("/dashboard/tasks");
}

export async function quickCreateTaskAction(formData: FormData) {
  const s = await getSessionUser();
  if (!s?.activeTenantId) throw new Error("No autorizado");
  if (!canWriteWorkspaceData(s)) throw new Error("Sin permiso");

  const projectId = String(formData.get("projectId") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  const status = normalizeTaskStatus(String(formData.get("status") ?? "todo"));

  if (!projectId || !title) throw new Error("Proyecto y título son obligatorios");

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
    status,
  });
  revalidatePath("/dashboard/tasks");
}

export async function toggleTaskChecklistItemAction(formData: FormData) {
  const s = await getSessionUser();
  if (!s?.activeTenantId) throw new Error("No autorizado");
  if (!canWriteWorkspaceData(s)) throw new Error("Sin permiso");

  const taskId = String(formData.get("taskId") ?? "").trim();
  const itemId = String(formData.get("itemId") ?? "").trim();
  if (!taskId || !itemId) throw new Error("Datos inválidos");

  const task = await getTaskById(s.activeTenantId, taskId);
  if (!task) throw new Error("Tarea no encontrada");

  const checklist = parseTaskChecklist(task.checklist).map((item) =>
    item.id === itemId ? { ...item, done: !item.done } : item,
  );

  await updateTask({
    tenantId: s.activeTenantId,
    taskId,
    checklist,
  });
  revalidatePath("/dashboard/tasks");
}

export async function assignTaskAction(formData: FormData) {
  const s = await getSessionUser();
  if (!s?.activeTenantId) throw new Error("No autorizado");
  if (!canWriteWorkspaceData(s)) throw new Error("Sin permiso");

  const taskId = String(formData.get("taskId") ?? "").trim();
  const assigneeRaw = String(formData.get("assigneeUserId") ?? "").trim();
  if (!taskId) throw new Error("Tarea inválida");

  await assignTaskToUser({
    tenantId: s.activeTenantId,
    taskId,
    assigneeUserId: assigneeRaw || null,
  });
  revalidatePath("/dashboard/tasks");
}

export async function createTaskLabelAction(formData: FormData) {
  const s = await getSessionUser();
  if (!s?.activeTenantId) throw new Error("No autorizado");
  if (!canWriteWorkspaceData(s)) throw new Error("Sin permiso");

  const name = String(formData.get("name") ?? "").trim();
  const colorKey = String(formData.get("colorKey") ?? "sky").trim();

  const label = await createTaskLabel({
    tenantId: s.activeTenantId,
    name,
    colorKey,
  });
  revalidatePath("/dashboard/tasks");
  return label;
}
