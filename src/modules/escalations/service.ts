import { db } from "@/lib/db";
import { escalationTableMissingMessage, isMissingTableError } from "@/lib/prisma-errors";

export type EscalationTier = "green" | "orange" | "red";

export type EscalationIndicators = Record<string, "low" | "medium" | "high">;

export type EscalationCheckRow = {
  id: string;
  tenantId: string;
  projectId: string;
  topic: string | null;
  tier: string;
  title: string;
  levelLabel: string;
  indicators: unknown;
  actions: unknown;
  createdBy: string;
  createdAt: Date;
  project: { id: string; name: string };
  authorName: string;
};

async function attachAuthorNames<
  T extends { createdBy: string },
>(rows: T[]): Promise<(T & { authorName: string })[]> {
  if (rows.length === 0) return [];
  const userIds = [...new Set(rows.map((row) => row.createdBy))];
  const users = await db.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, name: true, email: true },
  });
  const byId = new Map(
    users.map((user) => [user.id, user.name?.trim() || user.email.split("@")[0] || "Usuario"]),
  );
  return rows.map((row) => ({
    ...row,
    authorName: byId.get(row.createdBy) ?? "Usuario",
  }));
}

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
    const created = await db.escalationCheck.create({
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
    const [enriched] = await attachAuthorNames([created]);
    return enriched!;
  } catch (err) {
    if (isMissingTableError(err, "EscalationCheck")) {
      throw new Error(escalationTableMissingMessage());
    }
    throw err;
  }
}

export async function listEscalationChecksByTenant(
  tenantId: string,
  options?: {
    restrictToProjectIds?: string[];
    projectId?: string;
    limit?: number;
    since?: Date;
  },
) {
  const restrict = options?.restrictToProjectIds;
  if (restrict !== undefined && restrict.length === 0) {
    return [];
  }
  try {
    const rows = await db.escalationCheck.findMany({
      where: {
        tenantId,
        ...(restrict !== undefined ? { projectId: { in: restrict } } : {}),
        ...(options?.projectId ? { projectId: options.projectId } : {}),
        ...(options?.since ? { createdAt: { gte: options.since } } : {}),
      },
      include: {
        project: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: options?.limit ?? 50,
    });
    return attachAuthorNames(rows);
  } catch (err) {
    if (isMissingTableError(err, "EscalationCheck")) {
      console.warn("[escalations] EscalationCheck table missing — returning empty list");
      return [];
    }
    throw err;
  }
}

export async function getEscalationCheckById(
  tenantId: string,
  checkId: string,
  options?: { restrictToProjectIds?: string[] },
) {
  const restrict = options?.restrictToProjectIds;
  if (restrict !== undefined && restrict.length === 0) {
    return null;
  }
  try {
    const row = await db.escalationCheck.findFirst({
      where: {
        id: checkId,
        tenantId,
        ...(restrict !== undefined ? { projectId: { in: restrict } } : {}),
      },
      include: {
        project: { select: { id: true, name: true } },
      },
    });
    if (!row) return null;
    const [enriched] = await attachAuthorNames([row]);
    return enriched ?? null;
  } catch (err) {
    if (isMissingTableError(err, "EscalationCheck")) return null;
    throw err;
  }
}

export type EscalationDeteriorationAlert = {
  projectId: string;
  projectName: string;
  previousTier: EscalationTier;
  currentTier: EscalationTier;
  currentAt: Date;
  previousAt: Date;
  topic: string | null;
  title: string;
};

/** Proyectos que pasaron de verde a rojo en los últimos N días. */
export async function findGreenToRedDeteriorations(
  tenantId: string,
  options?: { restrictToProjectIds?: string[]; withinDays?: number },
): Promise<EscalationDeteriorationAlert[]> {
  const withinDays = options?.withinDays ?? 7;
  const since = new Date(Date.now() - withinDays * 24 * 60 * 60 * 1000);
  const rows = await listEscalationChecksByTenant(tenantId, {
    restrictToProjectIds: options?.restrictToProjectIds,
    since,
    limit: 500,
  });

  const byProject = new Map<string, typeof rows>();
  for (const row of rows) {
    const list = byProject.get(row.projectId) ?? [];
    list.push(row);
    byProject.set(row.projectId, list);
  }

  const alerts: EscalationDeteriorationAlert[] = [];
  for (const [, checks] of byProject) {
    const sorted = [...checks].sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
    );
    const latest = sorted[0];
    if (latest.tier !== "red") continue;

    const priorGreen = sorted.find(
      (c) =>
        c.id !== latest.id &&
        c.tier === "green" &&
        latest.createdAt.getTime() - c.createdAt.getTime() <=
          withinDays * 24 * 60 * 60 * 1000,
    );
    if (!priorGreen) continue;

    alerts.push({
      projectId: latest.projectId,
      projectName: latest.project.name,
      previousTier: "green",
      currentTier: "red",
      currentAt: latest.createdAt,
      previousAt: priorGreen.createdAt,
      topic: latest.topic,
      title: latest.title,
    });
  }

  return alerts.sort((a, b) => b.currentAt.getTime() - a.currentAt.getTime());
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
