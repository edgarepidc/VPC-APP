import type { MeetingCostLevel, RoleCosts, RoleCounts } from "@/modules/meeting-roi/service";

export const MEETING_OBJECTIVE_LABELS: Record<string, string> = {
  informativa: "Informativa",
  decision: "Toma de decisiones",
  tecnica: "Planeación técnica",
  crisis: "Crisis / resolución",
};

export const ROLE_LABELS: Record<keyof RoleCounts, string> = {
  junior: "Junior PM",
  senior: "Senior PM",
  director: "Director / Stakeholder",
  tech: "Líder técnico / Especialista",
};

export function getCostLevelBadge(level: MeetingCostLevel | string) {
  switch (level) {
    case "Bajo":
      return { label: "Bajo", className: "pmo-badge pmo-badge--green" };
    case "Moderado":
      return { label: "Moderado", className: "pmo-badge pmo-badge--blue" };
    case "Alto":
      return { label: "Alto", className: "pmo-badge pmo-badge--yellow" };
    case "Crítico":
      return { label: "Crítico", className: "pmo-badge pmo-badge--red" };
    default:
      return { label: level, className: "pmo-badge" };
  }
}

export function costLevelSortWeight(level: string) {
  if (level === "Crítico") return 0;
  if (level === "Alto") return 1;
  if (level === "Moderado") return 2;
  return 3;
}

export function costLevelNumeric(level: string) {
  if (level === "Crítico") return 3;
  if (level === "Alto") return 2;
  if (level === "Moderado") return 1;
  return 0;
}

export type MeetingCostTrendDirection = "up" | "down" | "flat" | null;

export function buildMeetingCostTrendsByProject(
  rows: Array<{ projectId: string; costLevel: string; createdAt: Date }>,
) {
  const byProject = new Map<string, Array<{ costLevel: string; createdAt: Date }>>();
  for (const row of rows) {
    const list = byProject.get(row.projectId) ?? [];
    list.push({ costLevel: row.costLevel, createdAt: row.createdAt });
    byProject.set(row.projectId, list);
  }

  const trends = new Map<
    string,
    { levels: string[]; direction: MeetingCostTrendDirection }
  >();

  for (const [projectId, sessions] of byProject) {
    const chronological = [...sessions]
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
      .slice(-5);
    const levels = chronological.map((s) => s.costLevel);

    let direction: MeetingCostTrendDirection = null;
    if (levels.length >= 2) {
      const prev = costLevelNumeric(levels[levels.length - 2]!);
      const last = costLevelNumeric(levels[levels.length - 1]!);
      if (last > prev) direction = "up";
      else if (last < prev) direction = "down";
      else direction = "flat";
    }

    trends.set(projectId, { levels, direction });
  }

  return trends;
}

export const COST_LEVEL_DOT: Record<string, string> = {
  Bajo: "bg-emerald-500",
  Moderado: "bg-sky-500",
  Alto: "bg-amber-400",
  Crítico: "bg-rose-500",
};

export function formatMxn(amount: number) {
  return amount.toLocaleString("es-MX", {
    style: "currency",
    currency: "MXN",
    maximumFractionDigits: 0,
  });
}

export function formatDurationMinutes(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h > 0) return `${h}h ${m}min`;
  return `${m} min`;
}

export function parseRoleCounts(value: unknown): RoleCounts {
  const empty = { junior: 0, senior: 0, director: 0, tech: 0 };
  if (!value || typeof value !== "object") return empty;
  const raw = value as Record<string, unknown>;
  return {
    junior: typeof raw.junior === "number" ? raw.junior : 0,
    senior: typeof raw.senior === "number" ? raw.senior : 0,
    director: typeof raw.director === "number" ? raw.director : 0,
    tech: typeof raw.tech === "number" ? raw.tech : 0,
  };
}

export function parseRoleCosts(value: unknown): RoleCosts {
  return parseRoleCounts(value);
}

export type MeetingRoiDetailRecord = {
  id: string;
  sessionName: string | null;
  objective: string;
  totalCost: number;
  costLevel: string;
  costPerMinute: number;
  totalParticipants: number;
  durationMinutes: number;
  diagnosisTitle: string;
  diagnosisText: string;
  participants: RoleCounts;
  roleCosts: RoleCosts;
  createdAt: string;
  authorName: string;
  project: { id: string; name: string };
};

type MeetingRoiSessionLike = {
  id: string;
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
  createdAt: Date;
  authorName: string;
  project: { id: string; name: string };
};

export function serializeMeetingRoiSession(
  session: MeetingRoiSessionLike,
): MeetingRoiDetailRecord {
  return {
    id: session.id,
    sessionName: session.sessionName,
    objective: session.objective,
    totalCost: session.totalCost,
    costLevel: session.costLevel,
    costPerMinute: session.costPerMinute,
    totalParticipants: session.totalParticipants,
    durationMinutes: session.durationMinutes,
    diagnosisTitle: session.diagnosisTitle,
    diagnosisText: session.diagnosisText,
    participants: parseRoleCounts(session.participants),
    roleCosts: parseRoleCosts(session.roleCosts),
    createdAt: session.createdAt.toISOString(),
    authorName: session.authorName,
    project: session.project,
  };
}

export function serializeMeetingRoiSessions(
  sessions: MeetingRoiSessionLike[],
): MeetingRoiDetailRecord[] {
  return sessions.map(serializeMeetingRoiSession);
}
