import { db } from "@/lib/db";

type RolePermClient = Pick<typeof db, "role" | "rolePermission">;

const PERMISSION_SEED: [string, string][] = [
  ["projects.read", "Read projects"],
  ["projects.write", "Create and update projects"],
  ["tasks.read", "Read tasks"],
  ["tasks.write", "Create and update tasks"],
];

/** Permisos globales (no por tenant). */
export async function ensureGlobalPermissions() {
  for (const [key, description] of PERMISSION_SEED) {
    await db.permission.upsert({
      where: { key },
      update: { description },
      create: { key, description },
    });
  }
  return db.permission.findMany({ select: { id: true, key: true } });
}

const ROLE_DEFS: [string, string][] = [
  ["owner", "Owner"],
  ["admin", "Admin"],
  ["manager", "Manager"],
  ["member", "Member"],
];

/**
 * Crea roles estandar y permisos por tenant.
 * owner/admin/manager: escritura; member: solo lectura (consultante).
 */
export async function createStandardRolesForTenantWithClient(
  client: RolePermClient,
  tenantId: string,
  allPermissions: { id: string; key: string }[],
) {
  const roles: Record<string, { id: string }> = {};

  for (const [key, name] of ROLE_DEFS) {
    const role = await client.role.create({
      data: { tenantId, key, name },
    });
    roles[key] = role;
  }

  for (const [key, role] of Object.entries(roles)) {
    const allowedKeys =
      key === "member"
        ? ["projects.read", "tasks.read"]
        : ["projects.read", "projects.write", "tasks.read", "tasks.write"];

    for (const permission of allPermissions) {
      if (!allowedKeys.includes(permission.key)) continue;
      await client.rolePermission.create({
        data: {
          roleId: role.id,
          permissionId: permission.id,
        },
      });
    }
  }

  return roles as Record<"owner" | "admin" | "manager" | "member", { id: string }>;
}

export async function createStandardRolesForTenant(
  tenantId: string,
  allPermissions: { id: string; key: string }[],
) {
  return createStandardRolesForTenantWithClient(db, tenantId, allPermissions);
}
