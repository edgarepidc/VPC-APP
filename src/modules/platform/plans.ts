/** Planes de facturación / tier del tenant (campo `Tenant.plan` en DB). */
export const TENANT_PLAN_KEYS = ["starter", "pro", "enterprise"] as const;
export type TenantPlanKey = (typeof TENANT_PLAN_KEYS)[number];

/** Límites por plan (SaaS). Ajusta aquí los números comerciales. */
export type PlanLimits = {
  maxProjects: number;
  /** Miembros activos + invitaciones pendientes (puestos comprometidos). */
  maxMemberSeats: number;
};

export const PLAN_LIMITS: Record<TenantPlanKey, PlanLimits> = {
  starter: { maxProjects: 5, maxMemberSeats: 10 },
  pro: { maxProjects: 50, maxMemberSeats: 75 },
  enterprise: { maxProjects: 500, maxMemberSeats: 500 },
};

export function normalizeTenantPlan(raw: string | undefined): TenantPlanKey {
  const p = raw?.trim().toLowerCase();
  return TENANT_PLAN_KEYS.includes(p as TenantPlanKey)
    ? (p as TenantPlanKey)
    : "starter";
}

export function getPlanLimits(plan: string): PlanLimits {
  return PLAN_LIMITS[normalizeTenantPlan(plan)];
}
