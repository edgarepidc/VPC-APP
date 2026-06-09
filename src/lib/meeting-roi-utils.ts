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
