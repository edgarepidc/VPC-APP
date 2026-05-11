/** Cookie name for active tenant; keep in a tiny module so `/` does not import Prisma via `session.ts`. */
export const TENANT_COOKIE = "embus_tenant";
