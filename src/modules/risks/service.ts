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

export async function getRiskById(tenantId: string, riskId: string) {
  return db.risk.findFirst({
    where: { id: riskId, tenantId },
    select: { id: true, projectId: true, impactAmount: true },
  });
}

export async function deleteRisk(tenantId: string, riskId: string) {
  const result = await db.risk.deleteMany({
    where: { id: riskId, tenantId },
  });
  return result.count;
}

export async function updateRisk(input: {
  tenantId: string;
  id: string;
  ownerName?: string;
  mitigation?: string;
  contingency?: string;
  trigger?: string;
  dueDate?: Date | null;
  residualProb?: number;
}) {
  const data: {
    ownerName?: string;
    mitigation?: string | null;
    contingency?: string | null;
    trigger?: string | null;
    dueDate?: Date | null;
    residualProb?: number;
  } = {};

  if (input.ownerName !== undefined) {
    const ownerName = input.ownerName.trim();
    if (!ownerName) throw new Error("El dueño del riesgo es obligatorio.");
    data.ownerName = ownerName;
  }
  if (input.mitigation !== undefined) {
    data.mitigation = input.mitigation.trim() || null;
  }
  if (input.contingency !== undefined) {
    data.contingency = input.contingency.trim() || null;
  }
  if (input.trigger !== undefined) {
    data.trigger = input.trigger.trim() || null;
  }
  if (input.dueDate !== undefined) {
    data.dueDate = input.dueDate;
  }
  if (input.residualProb !== undefined) {
    data.residualProb = Math.max(1, Math.min(100, input.residualProb));
  }

  const result = await db.risk.updateMany({
    where: { id: input.id, tenantId: input.tenantId },
    data,
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
