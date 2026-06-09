import { db } from "@/lib/db";

export async function listStakeholdersByTenant(
  tenantId: string,
  options?: { restrictToProjectIds?: string[] },
) {
  const restrict = options?.restrictToProjectIds;
  return db.stakeholder.findMany({
    where: {
      tenantId,
      ...(restrict !== undefined ? { projectId: { in: restrict } } : {}),
    },
    include: {
      project: {
        select: { id: true, name: true },
      },
    },
    orderBy: [{ project: { name: "asc" } }, { createdAt: "desc" }],
  });
}

export async function createStakeholder(input: {
  tenantId: string;
  projectId: string;
  name: string;
  role?: string;
  influence: number;
  interest: number;
  observation?: string;
}) {
  return db.stakeholder.create({
    data: {
      tenantId: input.tenantId,
      projectId: input.projectId,
      name: input.name,
      role: input.role || null,
      influence: input.influence,
      interest: input.interest,
      observation: input.observation || null,
    },
  });
}
