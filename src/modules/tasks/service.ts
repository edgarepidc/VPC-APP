import type { Prisma } from "@prisma/client";

import { db } from "@/lib/db";

import { normalizeTaskStatus, type TaskKanbanStatus } from "./constants";

export type ListTasksFilter = {
  projectId?: string;
  /** Búsqueda por título */
  q?: string;
  restrictToProjectIds?: string[];
};

export async function listTasksByTenant(
  tenantId: string,
  filter?: ListTasksFilter,
) {
  const q = filter?.q?.trim();
  const restrict = filter?.restrictToProjectIds;
  return db.task.findMany({
    where: {
      tenantId,
      ...(restrict !== undefined ? { projectId: { in: restrict } } : {}),
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
      assignee: { select: { id: true, name: true, email: true } },
    },
  });
}

async function assertActiveMember(tenantId: string, userId: string) {
  const m = await db.membership.findFirst({
    where: { tenantId, userId, status: "active" },
    select: { id: true },
  });
  if (!m) {
    throw new Error("El responsable debe ser miembro activo de la organización.");
  }
}

export async function createTask(input: {
  tenantId: string;
  projectId: string;
  title: string;
  status?: TaskKanbanStatus;
  dueDate?: Date | null;
  assigneeUserId?: string | null;
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

  if (input.assigneeUserId) {
    await assertActiveMember(input.tenantId, input.assigneeUserId);
  }

  return db.task.create({
    data: {
      tenantId: input.tenantId,
      projectId: input.projectId,
      title,
      status: input.status ?? "todo",
      dueDate: input.dueDate ?? undefined,
      assigneeUserId: input.assigneeUserId ?? undefined,
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
  assigneeUserId?: string | null;
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

  if (input.assigneeUserId !== undefined && input.assigneeUserId !== null) {
    await assertActiveMember(input.tenantId, input.assigneeUserId);
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
  if (input.assigneeUserId !== undefined) {
    if (input.assigneeUserId === null) {
      data.assignee = { disconnect: true };
    } else {
      data.assignee = { connect: { id: input.assigneeUserId } };
    }
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
