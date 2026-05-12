import type { Prisma } from "@prisma/client";

import { db } from "@/lib/db";

import { normalizeTaskStatus, type TaskKanbanStatus } from "./constants";

export type ListTasksFilter = {
  projectId?: string;
  /** Búsqueda por título */
  q?: string;
};

export async function listTasksByTenant(
  tenantId: string,
  filter?: ListTasksFilter,
) {
  const q = filter?.q?.trim();
  return db.task.findMany({
    where: {
      tenantId,
      ...(filter?.projectId ? { projectId: filter.projectId } : {}),
      ...(q
        ? {
            title: { contains: q, mode: "insensitive" as const },
          }
        : {}),
    },
    orderBy: [{ dueDate: "asc" }, { createdAt: "desc" }],
    include: {
      project: { select: { id: true, name: true } },
    },
  });
}

export async function createTask(input: {
  tenantId: string;
  projectId: string;
  title: string;
  dueDate?: Date | null;
}) {
  const project = await db.project.findFirst({
    where: { id: input.projectId, tenantId: input.tenantId },
    select: { id: true },
  });
  if (!project) {
    throw new Error("Proyecto no válido para esta organización.");
  }

  const title = input.title.trim();
  if (!title) {
    throw new Error("El título de la tarea es obligatorio.");
  }

  return db.task.create({
    data: {
      tenantId: input.tenantId,
      projectId: input.projectId,
      title,
      status: "todo",
      dueDate: input.dueDate ?? undefined,
    },
  });
}

export async function updateTask(input: {
  tenantId: string;
  taskId: string;
  title?: string;
  status?: string;
  projectId?: string;
  dueDate?: Date | null;
}) {
  const existing = await db.task.findFirst({
    where: { id: input.taskId, tenantId: input.tenantId },
    select: { id: true },
  });
  if (!existing) {
    throw new Error("Tarea no encontrada.");
  }

  if (input.projectId !== undefined) {
    const p = await db.project.findFirst({
      where: { id: input.projectId, tenantId: input.tenantId },
      select: { id: true },
    });
    if (!p) {
      throw new Error("Proyecto no válido para esta organización.");
    }
  }

  const data: Prisma.TaskUpdateInput = {};

  if (input.title !== undefined) {
    const t = input.title.trim();
    if (!t) throw new Error("El título no puede estar vacío.");
    data.title = t;
  }
  if (input.status !== undefined) {
    data.status = normalizeTaskStatus(input.status);
  }
  if (input.projectId !== undefined) {
    data.project = { connect: { id: input.projectId } };
  }
  if (input.dueDate !== undefined) {
    data.dueDate = input.dueDate;
  }

  await db.task.update({
    where: { id: input.taskId },
    data,
  });
}

export async function moveTaskToStatus(input: {
  tenantId: string;
  taskId: string;
  status: TaskKanbanStatus;
}) {
  await updateTask({
    tenantId: input.tenantId,
    taskId: input.taskId,
    status: input.status,
  });
}
