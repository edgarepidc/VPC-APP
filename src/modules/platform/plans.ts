/** Planes de facturación / tier del tenant (campo `Tenant.plan` en DB). */
export const TENANT_PLAN_KEYS = ["starter", "pro", "enterprise"] as const;
export type TenantPlanKey = (typeof TENANT_PLAN_KEYS)[number];

export function normalizeTenantPlan(raw: string | undefined): TenantPlanKey {
  const p = raw?.trim().toLowerCase();
  return TENANT_PLAN_KEYS.includes(p as TenantPlanKey)
    ? (p as TenantPlanKey)
    : "starter";
}
