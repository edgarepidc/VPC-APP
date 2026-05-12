/**
 * Módulo de administración de plataforma (consultora / superadmin):
 * cartera de tenants, creación de organizaciones cliente, roles base por tenant.
 */
export {
  createTenantFromPlatform,
  listAllTenants,
  type CreateTenantPlatformResult,
} from "./service";
export { TENANT_PLAN_KEYS, type TenantPlanKey } from "./plans";
