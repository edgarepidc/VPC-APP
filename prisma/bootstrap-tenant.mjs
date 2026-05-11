/**
 * Crea un tenant y te asigna como owner a un usuario ya existente (mismo email que Supabase Auth).
 *
 * Uso (DATABASE_URL = pooler de Supabase, misma que en Vercel):
 *   BOOTSTRAP_USER_EMAIL=diazcruzee@gmail.com \\
 *   BOOTSTRAP_TENANT_NAME="Mobility ADO" \\
 *   BOOTSTRAP_TENANT_SLUG=mobility-ado \\
 *   node prisma/bootstrap-tenant.mjs
 *
 * Si omites nombre/slug, por defecto: Mobility ADO / mobility-ado
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const email = (process.env.BOOTSTRAP_USER_EMAIL ?? "").trim().toLowerCase();
const tenantName = (process.env.BOOTSTRAP_TENANT_NAME ?? "Mobility ADO").trim();
const tenantSlug = (process.env.BOOTSTRAP_TENANT_SLUG ?? "mobility-ado")
  .trim()
  .toLowerCase()
  .replace(/[^a-z0-9-]+/g, "-")
  .replace(/^-|-$/g, "");

async function ensurePermissions() {
  const permissionKeys = [
    ["projects.read", "Read projects"],
    ["projects.write", "Create and update projects"],
    ["tasks.read", "Read tasks"],
    ["tasks.write", "Create and update tasks"],
  ];

  for (const [key, description] of permissionKeys) {
    await prisma.permission.upsert({
      where: { key },
      update: { description },
      create: { key, description },
    });
  }

  return prisma.permission.findMany({ select: { id: true, key: true } });
}

async function ensureTenantRoles(tenantId, allPermissions) {
  const roleDefs = [
    ["owner", "Owner"],
    ["admin", "Admin"],
    ["manager", "Manager"],
    ["member", "Member"],
  ];

  const roles = {};

  for (const [key, name] of roleDefs) {
    const role = await prisma.role.upsert({
      where: { tenantId_key: { tenantId, key } },
      update: { name },
      create: { tenantId, key, name },
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

      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId: role.id,
            permissionId: permission.id,
          },
        },
        update: {},
        create: {
          roleId: role.id,
          permissionId: permission.id,
        },
      });
    }
  }

  return roles;
}

async function main() {
  if (!email) {
    console.error("Define BOOTSTRAP_USER_EMAIL (ej. diazcruzee@gmail.com).");
    process.exit(1);
  }
  if (!tenantSlug) {
    console.error("BOOTSTRAP_TENANT_SLUG quedó vacío tras normalizar.");
    process.exit(1);
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, email: true },
  });

  if (!user) {
    console.error(
      `No hay User con email ${email}. Abre la app, inicia sesión una vez y vuelve a ejecutar este script.`,
    );
    process.exit(1);
  }

  const allPermissions = await ensurePermissions();

  const tenant = await prisma.tenant.upsert({
    where: { slug: tenantSlug },
    update: { name: tenantName, plan: "starter" },
    create: { slug: tenantSlug, name: tenantName, plan: "starter" },
  });

  const roles = await ensureTenantRoles(tenant.id, allPermissions);

  await prisma.membership.upsert({
    where: {
      tenantId_userId: {
        tenantId: tenant.id,
        userId: user.id,
      },
    },
    update: { roleId: roles.owner.id, status: "active" },
    create: {
      tenantId: tenant.id,
      userId: user.id,
      roleId: roles.owner.id,
      status: "active",
    },
  });

  console.log("Listo.");
  console.log(`  Tenant: ${tenant.name} (${tenant.slug}) id=${tenant.id}`);
  console.log(`  Usuario: ${user.email} → rol owner`);
  console.log("Vuelve a /select-tenant y elige este tenant.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
