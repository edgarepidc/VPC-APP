import { db } from "@/lib/db";
import { isMissingTableError, meetingRoiTableMissingMessage } from "@/lib/prisma-errors";

export type MeetingObjective = "informativa" | "decision" | "tecnica" | "crisis";

export type MeetingCostLevel = "Bajo" | "Moderado" | "Alto" | "Crítico";

export type RoleCounts = {
  junior: number;
  senior: number;
  director: number;
  tech: number;
};

export type RoleCosts = RoleCounts;

export type MeetingRoiSessionRow = {
  id: string;
  tenantId: string;
  projectId: string;
  sessionName: string | null;
  objective: string;
  totalCost: number;
  costLevel: string;
  costPerMinute: number;
  totalParticipants: number;
  durationMinutes: number;
  diagnosisTitle: string;
  diagnosisText: string;
  participants: unknown;
  roleCosts: unknown;
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

export async function createMeetingRoiSession(input: {
  tenantId: string;
  projectId: string;
  sessionName?: string;
  objective: MeetingObjective;
  totalCost: number;
  costLevel: MeetingCostLevel;
  costPerMinute: number;
  totalParticipants: number;
  durationMinutes: number;
  diagnosisTitle: string;
  diagnosisText: string;
  participants: RoleCounts;
  roleCosts: RoleCosts;
  createdBy: string;
}) {
  try {
    const created = await db.meetingRoiSession.create({
      data: {
        tenantId: input.tenantId,
        projectId: input.projectId,
        sessionName: input.sessionName?.trim() || null,
        objective: input.objective,
        totalCost: input.totalCost,
        costLevel: input.costLevel,
        costPerMinute: input.costPerMinute,
        totalParticipants: input.totalParticipants,
        durationMinutes: input.durationMinutes,
        diagnosisTitle: input.diagnosisTitle,
        diagnosisText: input.diagnosisText,
        participants: input.participants,
        roleCosts: input.roleCosts,
        createdBy: input.createdBy,
      },
      include: {
        project: { select: { id: true, name: true } },
      },
    });
    const [enriched] = await attachAuthorNames([created]);
    return enriched!;
  } catch (err) {
    if (isMissingTableError(err, "MeetingRoiSession")) {
      throw new Error(meetingRoiTableMissingMessage());
    }
    throw err;
  }
}

export async function listMeetingRoiSessionsByTenant(
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
    const rows = await db.meetingRoiSession.findMany({
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
    if (isMissingTableError(err, "MeetingRoiSession")) {
      console.warn("[meeting-roi] MeetingRoiSession table missing — returning empty list");
      return [];
    }
    throw err;
  }
}

export async function isMeetingRoiStorageReady() {
  try {
    await db.meetingRoiSession.findFirst({ select: { id: true } });
    return true;
  } catch (err) {
    if (isMissingTableError(err, "MeetingRoiSession")) {
      return false;
    }
    throw err;
  }
}

export async function getMeetingRoiSession(tenantId: string, id: string) {
  try {
    const row = await db.meetingRoiSession.findFirst({
      where: { id, tenantId },
      include: { project: { select: { id: true, name: true } } },
    });
    if (!row) return null;
    const [enriched] = await attachAuthorNames([row]);
    return enriched ?? null;
  } catch (err) {
    if (isMissingTableError(err, "MeetingRoiSession")) {
      throw new Error(meetingRoiTableMissingMessage());
    }
    throw err;
  }
}

export async function updateMeetingRoiSession(input: {
  tenantId: string;
  id: string;
  sessionName?: string | null;
}) {
  const existing = await db.meetingRoiSession.findFirst({
    where: { id: input.id, tenantId: input.tenantId },
    select: { id: true, projectId: true },
  });
  if (!existing) throw new Error("Sesión no encontrada.");

  try {
    const updated = await db.meetingRoiSession.update({
      where: { id: input.id },
      data: {
        sessionName:
          input.sessionName === undefined
            ? undefined
            : input.sessionName?.trim() || null,
      },
      include: { project: { select: { id: true, name: true } } },
    });
    const [enriched] = await attachAuthorNames([updated]);
    return enriched!;
  } catch (err) {
    if (isMissingTableError(err, "MeetingRoiSession")) {
      throw new Error(meetingRoiTableMissingMessage());
    }
    throw err;
  }
}

export async function deleteMeetingRoiSession(input: { tenantId: string; id: string }) {
  const existing = await db.meetingRoiSession.findFirst({
    where: { id: input.id, tenantId: input.tenantId },
    select: { id: true },
  });
  if (!existing) throw new Error("Sesión no encontrada.");

  try {
    await db.meetingRoiSession.deleteMany({
      where: { id: input.id, tenantId: input.tenantId },
    });
  } catch (err) {
    if (isMissingTableError(err, "MeetingRoiSession")) {
      throw new Error(meetingRoiTableMissingMessage());
    }
    throw err;
  }
}

export type MeetingCostAlert = {
  projectId: string;
  projectName: string;
  sessionName: string | null;
  costLevel: string;
  totalCost: number;
  diagnosisTitle: string;
  createdAt: Date;
  alertType: "critical" | "inefficient" | "spike";
};

/** Sesiones de alto impacto económico en los últimos N días. */
export async function findMeetingCostAlerts(
  tenantId: string,
  options?: { restrictToProjectIds?: string[]; withinDays?: number },
): Promise<MeetingCostAlert[]> {
  const withinDays = options?.withinDays ?? 7;
  const since = new Date(Date.now() - withinDays * 24 * 60 * 60 * 1000);
  const rows = await listMeetingRoiSessionsByTenant(tenantId, {
    restrictToProjectIds: options?.restrictToProjectIds,
    since,
    limit: 500,
  });

  const alerts: MeetingCostAlert[] = [];
  const byProject = new Map<string, typeof rows>();

  for (const row of rows) {
    const list = byProject.get(row.projectId) ?? [];
    list.push(row);
    byProject.set(row.projectId, list);

    if (row.costLevel === "Crítico") {
      alerts.push({
        projectId: row.projectId,
        projectName: row.project.name,
        sessionName: row.sessionName,
        costLevel: row.costLevel,
        totalCost: row.totalCost,
        diagnosisTitle: row.diagnosisTitle,
        createdAt: row.createdAt,
        alertType: "critical",
      });
    } else if (row.objective === "informativa" && row.totalCost >= 8000) {
      alerts.push({
        projectId: row.projectId,
        projectName: row.project.name,
        sessionName: row.sessionName,
        costLevel: row.costLevel,
        totalCost: row.totalCost,
        diagnosisTitle: row.diagnosisTitle,
        createdAt: row.createdAt,
        alertType: "inefficient",
      });
    }
  }

  for (const [, sessions] of byProject) {
    const sorted = [...sessions].sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
    );
    const latest = sorted[0];
    if (!latest || !["Alto", "Crítico"].includes(latest.costLevel)) continue;

    const priorLow = sorted.find(
      (s) =>
        s.id !== latest.id &&
        ["Bajo", "Moderado"].includes(s.costLevel) &&
        latest.createdAt.getTime() - s.createdAt.getTime() <=
          withinDays * 24 * 60 * 60 * 1000,
    );
    if (!priorLow) continue;

    alerts.push({
      projectId: latest.projectId,
      projectName: latest.project.name,
      sessionName: latest.sessionName,
      costLevel: latest.costLevel,
      totalCost: latest.totalCost,
      diagnosisTitle: latest.diagnosisTitle,
      createdAt: latest.createdAt,
      alertType: "spike",
    });
  }

  const seen = new Set<string>();
  return alerts
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .filter((alert) => {
      const key = `${alert.projectId}-${alert.alertType}-${alert.createdAt.toISOString()}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

/** Última sesión registrada por proyecto (tabla de salud PMO). */
export async function latestMeetingRoiByProject(
  tenantId: string,
  options?: { restrictToProjectIds?: string[] },
) {
  const restrict = options?.restrictToProjectIds;
  let rows: Array<{
    projectId: string;
    costLevel: string;
    totalCost: number;
    sessionName: string | null;
    diagnosisTitle: string;
    createdAt: Date;
  }>;

  try {
    rows = await db.meetingRoiSession.findMany({
      where: {
        tenantId,
        ...(restrict !== undefined ? { projectId: { in: restrict } } : {}),
      },
      orderBy: { createdAt: "desc" },
      select: {
        projectId: true,
        costLevel: true,
        totalCost: true,
        sessionName: true,
        diagnosisTitle: true,
        createdAt: true,
      },
    });
  } catch (err) {
    if (isMissingTableError(err, "MeetingRoiSession")) {
      return new Map<
        string,
        {
          costLevel: string;
          totalCost: number;
          sessionName: string | null;
          diagnosisTitle: string;
          createdAt: Date;
        }
      >();
    }
    throw err;
  }

  const byProject = new Map<
    string,
    {
      costLevel: string;
      totalCost: number;
      sessionName: string | null;
      diagnosisTitle: string;
      createdAt: Date;
    }
  >();
  for (const row of rows) {
    if (!byProject.has(row.projectId)) {
      byProject.set(row.projectId, {
        costLevel: row.costLevel,
        totalCost: row.totalCost,
        sessionName: row.sessionName,
        diagnosisTitle: row.diagnosisTitle,
        createdAt: row.createdAt,
      });
    }
  }
  return byProject;
}
