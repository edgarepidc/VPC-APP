import { db } from "@/lib/db";

export async function listDeliverablesByTenant(tenantId: string) {
  return db.deliverable.findMany({
    where: { tenantId },
    include: {
      project: {
        select: { id: true, name: true },
      },
    },
    orderBy: [{ dueDate: "asc" }, { createdAt: "desc" }],
  });
}

export async function createDeliverable(input: {
  tenantId: string;
  projectId: string;
  title: string;
  cell?: string;
  ownerName?: string;
  status?: string;
  dueDate?: Date;
  weight?: number;
  notes?: string;
}) {
  return db.deliverable.create({
    data: {
      tenantId: input.tenantId,
      projectId: input.projectId,
      title: input.title,
      cell: input.cell || null,
      ownerName: input.ownerName || null,
      status: input.status ?? "pending",
      dueDate: input.dueDate ?? null,
      weight: input.weight ?? 10,
      notes: input.notes || null,
    },
  });
}

export async function updateDeliverableStatus(input: {
  id: string;
  tenantId: string;
  status: string;
}) {
  const updated = await db.deliverable.updateMany({
    where: { id: input.id, tenantId: input.tenantId },
    data: { status: input.status },
  });

  if (updated.count === 0) {
    throw new Error("Entregable no encontrado para este tenant.");
  }
}
