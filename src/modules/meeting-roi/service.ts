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
