import { db } from "@/lib/db";

export async function listTasksByTenant(tenantId: string) {
  return db.task.findMany({
    where: { tenantId },
    orderBy: { createdAt: "desc" },
  });
}

export async function createTask(input: {
  tenantId: string;
  projectId: string;
  title: string;
}) {
  return db.task.create({
    data: {
      tenantId: input.tenantId,
      projectId: input.projectId,
      title: input.title,
      status: "todo",
    },
  });
}
