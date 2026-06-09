"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getSessionUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/rbac";
import { assertCanAccessProject } from "@/modules/memberships/project-access";
import {
  createEscalationCheck,
  type EscalationIndicators,
  type EscalationTier,
} from "@/modules/escalations/service";

const VALID_TIERS = new Set<EscalationTier>(["green", "orange", "red"]);
const VALID_LEVELS = new Set(["low", "medium", "high"]);

function parseIndicators(raw: unknown): EscalationIndicators | null {
  if (!raw || typeof raw !== "object") return null;
  const result: EscalationIndicators = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof value !== "string" || !VALID_LEVELS.has(value)) return null;
    result[key] = value as EscalationIndicators[string];
  }
  return Object.keys(result).length > 0 ? result : null;
}

export async function saveEscalationAction(input: {
  projectId: string;
  topic?: string;
  tier: string;
  title: string;
  levelLabel: string;
  indicators: EscalationIndicators;
  actions: string[];
}) {
  const session = await getSessionUser();
  if (!session?.activeTenantId) redirect("/login");
  if (!hasPermission(session.role, "tasks.write")) {
    return { ok: false as const, error: "No tienes permiso para registrar evaluaciones." };
  }

  const projectId = input.projectId?.trim();
  if (!projectId) {
    return { ok: false as const, error: "Selecciona un proyecto antes de evaluar." };
  }

  if (!VALID_TIERS.has(input.tier as EscalationTier)) {
    return { ok: false as const, error: "Nivel de escalamiento inválido." };
  }

  const title = input.title?.trim();
  const levelLabel = input.levelLabel?.trim();
  if (!title || !levelLabel) {
    return { ok: false as const, error: "Datos de evaluación incompletos." };
  }

  const indicators = parseIndicators(input.indicators);
  if (!indicators) {
    return { ok: false as const, error: "Indicadores inválidos." };
  }

  const actions = Array.isArray(input.actions)
    ? input.actions.filter((a): a is string => typeof a === "string" && a.trim().length > 0)
    : [];
  if (actions.length === 0) {
    return { ok: false as const, error: "Acciones recomendadas inválidas." };
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
    await createEscalationCheck({
      tenantId: session.activeTenantId,
      projectId,
      topic: input.topic?.trim(),
      tier: input.tier as EscalationTier,
      title,
      levelLabel,
      indicators,
      actions,
      createdBy: session.userId,
    });
  } catch (e) {
    return { ok: false as const, error: (e as Error).message };
  }

  revalidatePath("/dashboard/escalometro");
  revalidatePath("/dashboard/pmo");

  return { ok: true as const };
}
