import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
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

  const acme = await prisma.tenant.upsert({
    where: { slug: "acme" },
    update: { name: "Acme Corp" },
    create: { slug: "acme", name: "Acme Corp", plan: "starter" },
  });

  const embus = await prisma.tenant.upsert({
    where: { slug: "embus" },
    update: { name: "EMBUS" },
    create: { slug: "embus", name: "EMBUS", plan: "pro" },
  });

  const user = await prisma.user.upsert({
    where: { email: "owner@acme.com" },
    update: { name: "Owner Demo" },
    create: { email: "owner@acme.com", name: "Owner Demo" },
  });

  const allPermissions = await prisma.permission.findMany({
    select: { id: true, key: true },
  });

  async function ensureTenantRoles(tenantId) {
    const roleDefs = [
      ["admin", "Administrador"],
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

  const acmeRoles = await ensureTenantRoles(acme.id);
  const embusRoles = await ensureTenantRoles(embus.id);

  await prisma.membership.upsert({
    where: {
      tenantId_userId: {
        tenantId: acme.id,
        userId: user.id,
      },
    },
    update: { roleId: acmeRoles.admin.id, status: "active" },
    create: {
      tenantId: acme.id,
      userId: user.id,
      roleId: acmeRoles.admin.id,
      status: "active",
    },
  });

  await prisma.membership.upsert({
    where: {
      tenantId_userId: {
        tenantId: embus.id,
        userId: user.id,
      },
    },
    update: { roleId: embusRoles.admin.id, status: "active" },
    create: {
      tenantId: embus.id,
      userId: user.id,
      roleId: embusRoles.admin.id,
      status: "active",
    },
  });

  const acmeProject = await prisma.project.upsert({
    where: {
      id: "00000000-0000-0000-0000-000000000101",
    },
    update: {
      name: "Portal de Clientes",
      tenantId: acme.id,
      description: "Implementacion inicial del portal B2B.",
      createdBy: user.id,
    },
    create: {
      id: "00000000-0000-0000-0000-000000000101",
      tenantId: acme.id,
      name: "Portal de Clientes",
      description: "Implementacion inicial del portal B2B.",
      createdBy: user.id,
    },
  });

  const embusProject = await prisma.project.upsert({
    where: {
      id: "00000000-0000-0000-0000-000000000102",
    },
    update: {
      name: "Backoffice Operativo",
      tenantId: embus.id,
      description: "Tableros internos para operaciones.",
      createdBy: user.id,
    },
    create: {
      id: "00000000-0000-0000-0000-000000000102",
      tenantId: embus.id,
      name: "Backoffice Operativo",
      description: "Tableros internos para operaciones.",
      createdBy: user.id,
    },
  });

  await prisma.task.upsert({
    where: { id: "00000000-0000-0000-0000-000000000201" },
    update: {
      tenantId: acme.id,
      projectId: acmeProject.id,
      title: "Definir flujo de aprobacion",
      status: "in_progress",
    },
    create: {
      id: "00000000-0000-0000-0000-000000000201",
      tenantId: acme.id,
      projectId: acmeProject.id,
      title: "Definir flujo de aprobacion",
      status: "in_progress",
    },
  });

  await prisma.task.upsert({
    where: { id: "00000000-0000-0000-0000-000000000202" },
    update: {
      tenantId: embus.id,
      projectId: embusProject.id,
      title: "Armar backlog del sprint 1",
      status: "todo",
    },
    create: {
      id: "00000000-0000-0000-0000-000000000202",
      tenantId: embus.id,
      projectId: embusProject.id,
      title: "Armar backlog del sprint 1",
      status: "todo",
    },
  });

  console.log("Seed completed.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
