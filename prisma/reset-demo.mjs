/**
 * Borra datos de workspace de un tenant demo y opcionalmente renombra el tenant.
 *
 *   DATABASE_URL=... npm run prisma:reset-demo
 *   DEMO_TENANT_SLUG=mobility-ado DEMO_TENANT_NAME=MobilityDEMO npm run prisma:reset-demo
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const TARGET_NAME = (process.env.DEMO_TENANT_NAME ?? "MobilityDEMO").trim();
const TARGET_SLUG = (process.env.DEMO_TENANT_SLUG ?? "mobility-demo")
  .trim()
  .toLowerCase()
  .replace(/[^a-z0-9-]+/g, "-")
  .replace(/^-|-$/g, "");

const SLUG_CANDIDATES = [
  ...new Set(
    [
      process.env.DEMO_TENANT_SLUG?.trim().toLowerCase(),
      TARGET_SLUG,
      "mobility-demo",
      "mobility-ado",
    ].filter(Boolean),
  ),
];

async function findTenant() {
  for (const slug of SLUG_CANDIDATES) {
    const tenant = await prisma.tenant.findUnique({ where: { slug } });
    if (tenant) return tenant;
  }
  return null;
}

async function wipeTenantWorkspace(tenantId) {
  await prisma.deliverable.updateMany({
    where: { tenantId },
    data: { dependsOnId: null },
  });

  await prisma.risk.deleteMany({ where: { tenantId } });
  await prisma.deliverable.deleteMany({ where: { tenantId } });
  await prisma.stakeholder.deleteMany({ where: { tenantId } });
  await prisma.task.deleteMany({ where: { tenantId } });
  await prisma.taskLabel.deleteMany({ where: { tenantId } });
  await prisma.escalationCheck.deleteMany({ where: { tenantId } });
  await prisma.meetingRoiSession.deleteMany({ where: { tenantId } });
  await prisma.meetingMinute.deleteMany({ where: { tenantId } });

  const invitationIds = (
    await prisma.invitation.findMany({
      where: { tenantId },
      select: { id: true },
    })
  ).map((row) => row.id);
  if (invitationIds.length > 0) {
    await prisma.invitationProject.deleteMany({
      where: { invitationId: { in: invitationIds } },
    });
  }

  const membershipIds = (
    await prisma.membership.findMany({
      where: { tenantId },
      select: { id: true },
    })
  ).map((row) => row.id);
  if (membershipIds.length > 0) {
    await prisma.membershipProject.deleteMany({
      where: { membershipId: { in: membershipIds } },
    });
  }

  await prisma.project.deleteMany({
    where: { tenantId, parentProjectId: { not: null } },
  });
  await prisma.project.deleteMany({ where: { tenantId } });
}

async function main() {
  const tenant = await findTenant();
  if (!tenant) {
    console.error(
      `No se encontró tenant demo (${SLUG_CANDIDATES.join(", ")}). Ejecuta bootstrap-tenant primero.`,
    );
    process.exit(1);
  }

  console.log(`Limpiando workspace de "${tenant.name}" (${tenant.slug})…`);
  await wipeTenantWorkspace(tenant.id);

  const updated = await prisma.tenant.update({
    where: { id: tenant.id },
    data: { name: TARGET_NAME, slug: TARGET_SLUG },
  });

  console.log(`Tenant actualizado: ${updated.name} (${updated.slug})`);
  console.log("Workspace vacío. Ejecuta npm run prisma:seed-demo para cargar datos de muestra.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
