import { db } from "@/lib/db";

export async function listTasksByTenant(tenantId: string) {
  return db.task.findMany({
    where: { tenantId },
    orderBy: { createdAt: "desc" },
    include: {
      project: { select: { id: true, name: true } },
    },
  });
}

export async function createTask(input: {
  tenantId: string;
  projectId: string;
  title: string;
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
    },
  });
}
