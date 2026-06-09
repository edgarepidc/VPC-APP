import { db } from "@/lib/db";

export async function listRisksByTenant(
  tenantId: string,
  options?: { restrictToProjectIds?: string[] },
) {
  const restrict = options?.restrictToProjectIds;
  return db.risk.findMany({
    where: {
      tenantId,
      ...(restrict !== undefined ? { projectId: { in: restrict } } : {}),
    },
    include: {
      project: { select: { id: true, name: true } },
      deliverable: { select: { id: true, title: true } },
    },
    orderBy: [{ createdAt: "desc" }],
  });
}

export async function deleteRisk(tenantId: string, riskId: string) {
  const result = await db.risk.deleteMany({
    where: { id: riskId, tenantId },
  });
  return result.count;
}

export async function createRisk(input: {
  tenantId: string;
  projectId: string;
  deliverableId?: string;
  title: string;
  category: string;
  ownerName: string;
  probability: number;
  residualProb: number;
  impactAmount: number;
  mitigation?: string;
  contingency?: string;
  trigger?: string;
  dueDate?: Date;
}) {
  return db.risk.create({
    data: {
      tenantId: input.tenantId,
      projectId: input.projectId,
      deliverableId: input.deliverableId || null,
      title: input.title,
      category: input.category,
      ownerName: input.ownerName,
      probability: input.probability,
      residualProb: input.residualProb,
      impactAmount: input.impactAmount,
      mitigation: input.mitigation || null,
      contingency: input.contingency || null,
      trigger: input.trigger || null,
      dueDate: input.dueDate ?? null,
    },
  });
}
