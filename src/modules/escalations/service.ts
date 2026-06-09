import { db } from "@/lib/db";
import { escalationTableMissingMessage, isMissingTableError } from "@/lib/prisma-errors";

export type EscalationTier = "green" | "orange" | "red";

export type EscalationIndicators = Record<string, "low" | "medium" | "high">;

export type EscalationCheckRow = Awaited<
  ReturnType<typeof listEscalationChecksByTenant>
>[number];

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
  try {
    return await db.escalationCheck.create({
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
  } catch (err) {
    if (isMissingTableError(err, "EscalationCheck")) {
      throw new Error(escalationTableMissingMessage());
    }
    throw err;
  }
}

export async function listEscalationChecksByTenant(
  tenantId: string,
  options?: { restrictToProjectIds?: string[]; limit?: number },
) {
  const restrict = options?.restrictToProjectIds;
  try {
    return await db.escalationCheck.findMany({
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
  } catch (err) {
    if (isMissingTableError(err, "EscalationCheck")) {
      console.warn("[escalations] EscalationCheck table missing — returning empty list");
      return [];
    }
    throw err;
  }
}

/** Última evaluación por proyecto (para tabla de salud PMO). */
export async function latestEscalationByProject(
  tenantId: string,
  options?: { restrictToProjectIds?: string[] },
) {
  const restrict = options?.restrictToProjectIds;
  let rows: Array<{
    projectId: string;
    tier: string;
    title: string;
    topic: string | null;
    createdAt: Date;
  }>;

  try {
    rows = await db.escalationCheck.findMany({
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
  } catch (err) {
    if (isMissingTableError(err, "EscalationCheck")) {
      return new Map<
        string,
        { tier: string; title: string; topic: string | null; createdAt: Date }
      >();
    }
    throw err;
  }

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

export async function isEscalationStorageReady(): Promise<boolean> {
  try {
    await db.escalationCheck.count();
    return true;
  } catch (err) {
    if (isMissingTableError(err, "EscalationCheck")) return false;
    throw err;
  }
}
