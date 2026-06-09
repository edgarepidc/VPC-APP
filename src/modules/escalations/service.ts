import { db } from "@/lib/db";

export type EscalationTier = "green" | "orange" | "red";

export type EscalationIndicators = Record<string, "low" | "medium" | "high">;

export async function createEscalationCheck(input: {
  tenantId: string;
  projectId: string;
  topic?: string;
  tier: EscalationTier;
  title: string;
  levelLabel: string;
  indicators: EscalationIndicators;
  actions: string[];
  createdBy: string;
}) {
  return db.escalationCheck.create({
    data: {
      tenantId: input.tenantId,
      projectId: input.projectId,
      topic: input.topic?.trim() || null,
      tier: input.tier,
      title: input.title,
      levelLabel: input.levelLabel,
      indicators: input.indicators,
      actions: input.actions,
      createdBy: input.createdBy,
    },
    include: {
      project: { select: { id: true, name: true } },
    },
  });
}

export async function listEscalationChecksByTenant(
  tenantId: string,
  options?: { restrictToProjectIds?: string[]; limit?: number },
) {
  const restrict = options?.restrictToProjectIds;
  return db.escalationCheck.findMany({
    where: {
      tenantId,
      ...(restrict !== undefined ? { projectId: { in: restrict } } : {}),
    },
    include: {
      project: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
    take: options?.limit ?? 50,
  });
}

/** Última evaluación por proyecto (para tabla de salud PMO). */
export async function latestEscalationByProject(
  tenantId: string,
  options?: { restrictToProjectIds?: string[] },
) {
  const restrict = options?.restrictToProjectIds;
  const rows = await db.escalationCheck.findMany({
    where: {
      tenantId,
      ...(restrict !== undefined ? { projectId: { in: restrict } } : {}),
    },
    orderBy: { createdAt: "desc" },
    select: {
      projectId: true,
      tier: true,
      title: true,
      topic: true,
      createdAt: true,
    },
  });

  const byProject = new Map<
    string,
    { tier: string; title: string; topic: string | null; createdAt: Date }
  >();
  for (const row of rows) {
    if (!byProject.has(row.projectId)) {
      byProject.set(row.projectId, {
        tier: row.tier,
        title: row.title,
        topic: row.topic,
        createdAt: row.createdAt,
      });
    }
  }
  return byProject;
}
