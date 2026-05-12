/**
 * Módulo de administración de plataforma (consultora / superadmin):
 * cartera de tenants, creación de organizaciones cliente, roles base por tenant.
 */
export {
  createTenantFromPlatform,
  deleteTenantFromPlatform,
  listAllTenants,
  type CreateTenantPlatformResult,
  type DeleteTenantPlatformResult,
} from "./service";
export {
  PlanLimitError,
  getTenantUsageSnapshot,
  type TenantUsageSnapshot,
} from "./limits";
export {
  PLAN_LIMITS,
  TENANT_PLAN_KEYS,
  getPlanLimits,
  type PlanLimits,
  type TenantPlanKey,
} from "./plans";
