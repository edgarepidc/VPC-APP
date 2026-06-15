import { db } from "@/lib/db";
import {
  parseMeetingMinuteContent,
  type MeetingMinuteContent,
  type MeetingMinuteRow,
  type MinuteProvider,
} from "@/lib/meeting-minute-types";
import { isMissingTableError } from "@/lib/prisma-errors";

async function attachAuthorNames<
  T extends { createdBy: string; content: unknown; provider: string },
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

function mapRow(
  row: {
    id: string;
    tenantId: string;
    projectId: string;
    title: string;
    meetingDate: Date | null;
    content: unknown;
    provider: string;
    model: string;
    createdBy: string;
    createdAt: Date;
    updatedAt: Date;
    project: { id: string; name: string };
  } & { authorName: string },
): MeetingMinuteRow | null {
  const content = parseMeetingMinuteContent(row.content);
  if (!content) return null;
  const provider = row.provider === "deepseek" ? "deepseek" : "claude";
  return {
    id: row.id,
    tenantId: row.tenantId,
    projectId: row.projectId,
    title: row.title,
    meetingDate: row.meetingDate,
    content,
    provider,
    model: row.model,
    createdBy: row.createdBy,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    project: row.project,
    authorName: row.authorName,
  };
}

export async function isMeetingMinuteStorageReady(): Promise<boolean> {
  try {
    await db.meetingMinute.findFirst({ select: { id: true } });
    return true;
  } catch (err) {
    if (isMissingTableError(err, "MeetingMinute")) return false;
    throw err;
  }
}

export async function createMeetingMinute(input: {
  tenantId: string;
  projectId: string;
  title: string;
  meetingDate?: Date | null;
  content: MeetingMinuteContent;
  provider: MinuteProvider;
  model: string;
  createdBy: string;
}) {
  const created = await db.meetingMinute.create({
    data: {
      tenantId: input.tenantId,
      projectId: input.projectId,
      title: input.title.trim(),
      meetingDate: input.meetingDate ?? null,
      content: input.content,
      provider: input.provider,
      model: input.model,
      createdBy: input.createdBy,
    },
    select: { id: true },
  });
  return created;
}

export async function getMeetingMinuteById(tenantId: string, minuteId: string) {
  const row = await db.meetingMinute.findFirst({
    where: { id: minuteId, tenantId },
    include: { project: { select: { id: true, name: true } } },
  });
  if (!row) return null;
  const [withAuthor] = await attachAuthorNames([row]);
  return mapRow(withAuthor);
}

export async function listMeetingMinutesByTenant(
  tenantId: string,
  options?: { restrictToProjectIds?: string[]; limit?: number },
) {
  const limit = options?.limit ?? 50;
  const where: {
    tenantId: string;
    projectId?: { in: string[] };
  } = { tenantId };
  if (options?.restrictToProjectIds !== undefined) {
    where.projectId = { in: options.restrictToProjectIds };
  }

  const rows = await db.meetingMinute.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: limit,
    include: { project: { select: { id: true, name: true } } },
  });

  const withAuthors = await attachAuthorNames(rows);
  return withAuthors
    .map((row) => mapRow(row))
    .filter((row): row is MeetingMinuteRow => row !== null);
}

export async function deleteMeetingMinute(tenantId: string, minuteId: string) {
  const existing = await db.meetingMinute.findFirst({
    where: { id: minuteId, tenantId },
    select: { id: true },
  });
  if (!existing) return false;
  await db.meetingMinute.delete({ where: { id: minuteId } });
  return true;
}
