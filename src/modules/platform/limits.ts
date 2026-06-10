import { db } from "@/lib/db";
import { getPlanLimits, normalizeTenantPlan } from "@/modules/platform/plans";
import { countInitiativesByTenant } from "@/modules/projects/service";

export class PlanLimitError extends Error {
  readonly code = "PLAN_LIMIT" as const;
  constructor(message: string) {
    super(message);
    this.name = "PlanLimitError";
  }
}

export type TenantUsageSnapshot = {
  plan: ReturnType<typeof normalizeTenantPlan>;
  limits: ReturnType<typeof getPlanLimits>;
  projectCount: number;
  activeMembers: number;
  pendingInvites: number;
  /** Miembros activos + invitaciones pendientes */
  seatsUsed: number;
};

export async function getTenantUsageSnapshot(
  tenantId: string,
): Promise<TenantUsageSnapshot | null> {
  const tenant = await db.tenant.findUnique({
    where: { id: tenantId },
    select: { plan: true },
  });
  if (!tenant) return null;

  const plan = normalizeTenantPlan(tenant.plan);
  const limits = getPlanLimits(plan);

  const [projectCount, activeMembers, pendingInvites] = await Promise.all([
    countInitiativesByTenant(tenantId),
    db.membership.count({ where: { tenantId, status: "active" } }),
    db.invitation.count({ where: { tenantId, status: "pending" } }),
  ]);

  return {
    plan,
    limits,
    projectCount,
    activeMembers,
    pendingInvites,
    seatsUsed: activeMembers + pendingInvites,
  };
}

export type LimitCheck = { ok: true } | { ok: false; message: string };

export async function canCreateProject(tenantId: string): Promise<LimitCheck> {
  const snap = await getTenantUsageSnapshot(tenantId);
  if (!snap) return { ok: false, message: "Organización no encontrada." };
  if (snap.projectCount >= snap.limits.maxProjects) {
    return {
      ok: false,
      message: `Límite del plan ${snap.plan}: máximo ${snap.limits.maxProjects} iniciativas. Sube de plan (administración global) o archiva iniciativas.`,
    };
  }
  return { ok: true };
}

export async function canAddMemberSeat(tenantId: string): Promise<LimitCheck> {
  const snap = await getTenantUsageSnapshot(tenantId);
  if (!snap) return { ok: false, message: "Organización no encontrada." };
  if (snap.seatsUsed >= snap.limits.maxMemberSeats) {
    return {
      ok: false,
      message: `Límite del plan ${snap.plan}: máximo ${snap.limits.maxMemberSeats} puestos (miembros activos + invitaciones pendientes). Sube de plan o cancela invitaciones.`,
    };
  }
  return { ok: true };
}
