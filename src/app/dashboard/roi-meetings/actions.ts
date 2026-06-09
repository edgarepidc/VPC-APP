"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getSessionUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/rbac";
import { assertCanAccessProject } from "@/modules/memberships/project-access";
import {
  createMeetingRoiSession,
  type MeetingCostLevel,
  type MeetingObjective,
  type RoleCosts,
  type RoleCounts,
} from "@/modules/meeting-roi/service";

const VALID_OBJECTIVES = new Set<MeetingObjective>([
  "informativa",
  "decision",
  "tecnica",
  "crisis",
]);

const VALID_COST_LEVELS = new Set<MeetingCostLevel>([
  "Bajo",
  "Moderado",
  "Alto",
  "Crítico",
]);

function parseRoleMap(raw: unknown): RoleCounts | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;
  const roles = ["junior", "senior", "director", "tech"] as const;
  const result = {} as RoleCounts;
  for (const role of roles) {
    const value = obj[role];
    if (typeof value !== "number" || value < 0 || !Number.isFinite(value)) {
      return null;
    }
    result[role] = Math.floor(value);
  }
  return result;
}

export async function saveMeetingRoiSessionAction(input: {
  projectId: string;
  sessionName?: string;
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
}) {
  const session = await getSessionUser();
  if (!session?.activeTenantId) redirect("/login");
  if (!hasPermission(session.role, "tasks.write")) {
    return { ok: false as const, error: "No tienes permiso para registrar sesiones." };
  }

  const projectId = input.projectId?.trim();
  if (!projectId) {
    return { ok: false as const, error: "Selecciona un proyecto antes de registrar." };
  }

  if (!VALID_OBJECTIVES.has(input.objective as MeetingObjective)) {
    return { ok: false as const, error: "Objetivo de sesión inválido." };
  }

  if (!VALID_COST_LEVELS.has(input.costLevel as MeetingCostLevel)) {
    return { ok: false as const, error: "Nivel de costo inválido." };
  }

  const diagnosisTitle = input.diagnosisTitle?.trim();
  const diagnosisText = input.diagnosisText?.trim();
  if (!diagnosisTitle || !diagnosisText) {
    return { ok: false as const, error: "Datos de diagnóstico incompletos." };
  }

  if (
    input.totalParticipants <= 0 ||
    input.durationMinutes <= 0 ||
    input.totalCost <= 0
  ) {
    return {
      ok: false as const,
      error: "Configura participantes y duración antes de registrar.",
    };
  }

  const participants = parseRoleMap(input.participants);
  const roleCosts = parseRoleMap(input.roleCosts);
  if (!participants || !roleCosts) {
    return { ok: false as const, error: "Desglose de participantes inválido." };
  }

  try {
    await assertCanAccessProject({
      tenantId: session.activeTenantId,
      userId: session.userId,
      role: session.role,
      projectId,
      isPlatformVisit: session.isPlatformVisit,
    });
  } catch (e) {
    return { ok: false as const, error: (e as Error).message };
  }

  try {
    await createMeetingRoiSession({
      tenantId: session.activeTenantId,
      projectId,
      sessionName: input.sessionName?.trim(),
      objective: input.objective as MeetingObjective,
      totalCost: input.totalCost,
      costLevel: input.costLevel as MeetingCostLevel,
      costPerMinute: input.costPerMinute,
      totalParticipants: input.totalParticipants,
      durationMinutes: input.durationMinutes,
      diagnosisTitle,
      diagnosisText,
      participants,
      roleCosts,
      createdBy: session.userId,
    });
  } catch (e) {
    return { ok: false as const, error: (e as Error).message };
  }

  revalidatePath("/dashboard/roi-meetings");
  revalidatePath("/dashboard/pmo");
  revalidatePath("/dashboard/pmo/meetings");

  return { ok: true as const };
}
