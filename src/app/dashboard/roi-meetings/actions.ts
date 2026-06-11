"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getSessionUser } from "@/lib/auth/session";
import { canWriteWorkspaceData } from "@/lib/workspace-access";
import { assertCanAccessProject } from "@/modules/memberships/project-access";
import {
  createMeetingRoiSession,
  deleteMeetingRoiSession,
  getMeetingRoiSession,
  updateMeetingRoiSession,
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
  "Cr\u00edtico",
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
  if (!canWriteWorkspaceData(session)) {
    return { ok: false as const, error: "No tienes permiso para registrar sesiones." };
  }

  const projectId = input.projectId?.trim();
  if (!projectId) {
    return { ok: false as const, error: "Selecciona un proyecto antes de registrar." };
  }

  if (!VALID_OBJECTIVES.has(input.objective as MeetingObjective)) {
    return { ok: false as const, error: "Objetivo de sesi?n inv?lido." };
  }

  if (!VALID_COST_LEVELS.has(input.costLevel as MeetingCostLevel)) {
    return { ok: false as const, error: "Nivel de costo inv?lido." };
  }

  const diagnosisTitle = input.diagnosisTitle?.trim();
  const diagnosisText = input.diagnosisText?.trim();
  if (!diagnosisTitle || !diagnosisText) {
    return { ok: false as const, error: "Datos de diagn?stico incompletos." };
  }

  if (
    input.totalParticipants <= 0 ||
    input.durationMinutes <= 0 ||
    input.totalCost <= 0
  ) {
    return {
      ok: false as const,
      error: "Configura participantes y duraci?n antes de registrar.",
    };
  }

  const participants = parseRoleMap(input.participants);
  const roleCosts = parseRoleMap(input.roleCosts);
  if (!participants || !roleCosts) {
    return { ok: false as const, error: "Desglose de participantes inv?lido." };
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

export async function updateMeetingRoiSessionAction(id: string, sessionName: string | null) {
  const session = await getSessionUser();
  if (!session?.activeTenantId) redirect("/login");
  if (!canWriteWorkspaceData(session)) {
    return { ok: false as const, error: "No tienes permiso para editar sesiones." };
  }

  const trimmedId = id?.trim();
  if (!trimmedId) {
    return { ok: false as const, error: "Sesi?n inv?lida." };
  }

  const existing = await getMeetingRoiSession(session.activeTenantId, trimmedId);
  if (!existing) {
    return { ok: false as const, error: "Sesi?n no encontrada." };
  }

  try {
    await assertCanAccessProject({
      tenantId: session.activeTenantId,
      userId: session.userId,
      role: session.role,
      projectId: existing.projectId,
      isPlatformVisit: session.isPlatformVisit,
    });
  } catch (e) {
    return { ok: false as const, error: (e as Error).message };
  }

  const normalizedName = sessionName?.trim() || null;
  if (normalizedName && normalizedName.length > 200) {
    return { ok: false as const, error: "El nombre no puede superar 200 caracteres." };
  }

  try {
    await updateMeetingRoiSession({
      tenantId: session.activeTenantId,
      id: trimmedId,
      sessionName: normalizedName,
    });
  } catch (e) {
    return { ok: false as const, error: (e as Error).message };
  }

  revalidatePath("/dashboard/roi-meetings");
  revalidatePath("/dashboard/pmo");
  revalidatePath("/dashboard/pmo/meetings");

  return { ok: true as const };
}

export async function deleteMeetingRoiSessionAction(id: string) {
  const session = await getSessionUser();
  if (!session?.activeTenantId) redirect("/login");
  if (!canWriteWorkspaceData(session)) {
    return { ok: false as const, error: "No tienes permiso para eliminar sesiones." };
  }

  const trimmedId = id?.trim();
  if (!trimmedId) {
    return { ok: false as const, error: "Sesi?n inv?lida." };
  }

  const existing = await getMeetingRoiSession(session.activeTenantId, trimmedId);
  if (!existing) {
    return { ok: false as const, error: "Sesi?n no encontrada." };
  }

  try {
    await assertCanAccessProject({
      tenantId: session.activeTenantId,
      userId: session.userId,
      role: session.role,
      projectId: existing.projectId,
      isPlatformVisit: session.isPlatformVisit,
    });
  } catch (e) {
    return { ok: false as const, error: (e as Error).message };
  }

  try {
    await deleteMeetingRoiSession({
      tenantId: session.activeTenantId,
      id: trimmedId,
    });
  } catch (e) {
    return { ok: false as const, error: (e as Error).message };
  }

  revalidatePath("/dashboard/roi-meetings");
  revalidatePath("/dashboard/pmo");
  revalidatePath("/dashboard/pmo/meetings");

  return { ok: true as const };
}
