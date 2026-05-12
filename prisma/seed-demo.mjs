/**
 * Carga datos de demostracion en un tenant existente (por slug).
 *
 *   DEMO_TENANT_SLUG=mobility-ado DATABASE_URL=... node prisma/seed-demo.mjs
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const slug = (process.env.DEMO_TENANT_SLUG ?? "mobility-ado").trim().toLowerCase();

async function main() {
  const tenant = await prisma.tenant.findUnique({
    where: { slug },
    select: { id: true, name: true },
  });
  if (!tenant) {
    console.error(`No existe tenant con slug "${slug}". Crealo primero en la app.`);
    process.exit(1);
  }

  const membership = await prisma.membership.findFirst({
    where: { tenantId: tenant.id, status: "active" },
    select: { userId: true },
    orderBy: { createdAt: "asc" },
  });
  if (!membership) {
    console.error("El tenant no tiene miembros activos; entra al menos una vez con un usuario.");
    process.exit(1);
  }
  const createdBy = membership.userId;

  const p1 = await prisma.project.upsert({
    where: { id: "00000000-0000-4000-8000-000000000001" },
    update: {
      name: "Mobility ADO — Fase 1",
      description: "Despliegue inicial PMO y datos demo.",
      tenantId: tenant.id,
      createdBy,
    },
    create: {
      id: "00000000-0000-4000-8000-000000000001",
      tenantId: tenant.id,
      name: "Mobility ADO — Fase 1",
      description: "Despliegue inicial PMO y datos demo.",
      createdBy,
    },
  });

  const p2 = await prisma.project.upsert({
    where: { id: "00000000-0000-4000-8000-000000000002" },
    update: {
      name: "Integracion datos legacy",
      description: "Conexion a sistemas existentes.",
      tenantId: tenant.id,
      createdBy,
    },
    create: {
      id: "00000000-0000-4000-8000-000000000002",
      tenantId: tenant.id,
      name: "Integracion datos legacy",
      description: "Conexion a sistemas existentes.",
      createdBy,
    },
  });

  await prisma.task.upsert({
    where: { id: "00000000-0000-4000-8000-000000000101" },
    update: {
      tenantId: tenant.id,
      projectId: p1.id,
      title: "Workshop kickoff con stakeholders",
      status: "in_progress",
    },
    create: {
      id: "00000000-0000-4000-8000-000000000101",
      tenantId: tenant.id,
      projectId: p1.id,
      title: "Workshop kickoff con stakeholders",
      status: "in_progress",
    },
  });

  await prisma.task.upsert({
    where: { id: "00000000-0000-4000-8000-000000000102" },
    update: {
      tenantId: tenant.id,
      projectId: p2.id,
      title: "Mapeo de interfaces API",
      status: "todo",
    },
    create: {
      id: "00000000-0000-4000-8000-000000000102",
      tenantId: tenant.id,
      projectId: p2.id,
      title: "Mapeo de interfaces API",
      status: "todo",
    },
  });

  const d1 = await prisma.deliverable.upsert({
    where: { id: "00000000-0000-4000-8000-000000000201" },
    update: {
      tenantId: tenant.id,
      projectId: p1.id,
      title: "Matriz de interesados v1",
      cell: "PMO",
      ownerName: "PM Mobility",
      status: "review",
      weight: 20,
    },
    create: {
      id: "00000000-0000-4000-8000-000000000201",
      tenantId: tenant.id,
      projectId: p1.id,
      title: "Matriz de interesados v1",
      cell: "PMO",
      ownerName: "PM Mobility",
      status: "review",
      weight: 20,
    },
  });

  await prisma.deliverable.upsert({
    where: { id: "00000000-0000-4000-8000-000000000202" },
    update: {
      tenantId: tenant.id,
      projectId: p1.id,
      title: "Informe de riesgos Q1",
      cell: "IT",
      ownerName: "PM Mobility",
      status: "pending",
      weight: 15,
    },
    create: {
      id: "00000000-0000-4000-8000-000000000202",
      tenantId: tenant.id,
      projectId: p1.id,
      title: "Informe de riesgos Q1",
      cell: "IT",
      ownerName: "PM Mobility",
      status: "pending",
      weight: 15,
    },
  });

  await prisma.risk.upsert({
    where: { id: "00000000-0000-4000-8000-000000000301" },
    update: {
      tenantId: tenant.id,
      projectId: p1.id,
      deliverableId: d1.id,
      title: "Retraso en disponibilidad del equipo SME",
      category: "Operativo",
      ownerName: "PM Mobility",
      probability: 4,
      residualProb: 2,
      impactAmount: 12000,
      status: "open",
      mitigation: "Sesiones dedicadas semanales.",
    },
    create: {
      id: "00000000-0000-4000-8000-000000000301",
      tenantId: tenant.id,
      projectId: p1.id,
      deliverableId: d1.id,
      title: "Retraso en disponibilidad del equipo SME",
      category: "Operativo",
      ownerName: "PM Mobility",
      probability: 4,
      residualProb: 2,
      impactAmount: 12000,
      status: "open",
      mitigation: "Sesiones dedicadas semanales.",
    },
  });

  await prisma.risk.upsert({
    where: { id: "00000000-0000-4000-8000-000000000302" },
    update: {
      tenantId: tenant.id,
      projectId: p2.id,
      title: "Calidad de datos en sistema fuente",
      category: "Tecnico",
      ownerName: "PM Mobility",
      probability: 5,
      residualProb: 3,
      impactAmount: 45000,
      status: "open",
      contingency: "Plan B: carga manual incremental.",
    },
    create: {
      id: "00000000-0000-4000-8000-000000000302",
      tenantId: tenant.id,
      projectId: p2.id,
      title: "Calidad de datos en sistema fuente",
      category: "Tecnico",
      ownerName: "PM Mobility",
      probability: 5,
      residualProb: 3,
      impactAmount: 45000,
      status: "open",
      contingency: "Plan B: carga manual incremental.",
    },
  });

  await prisma.stakeholder.upsert({
    where: { id: "00000000-0000-4000-8000-000000000401" },
    update: {
      tenantId: tenant.id,
      projectId: p1.id,
      name: "Direccion Mobility",
      role: "Patrocinador",
      influence: 9,
      interest: 7,
      observation: "Prioriza time-to-market.",
    },
    create: {
      id: "00000000-0000-4000-8000-000000000401",
      tenantId: tenant.id,
      projectId: p1.id,
      name: "Direccion Mobility",
      role: "Patrocinador",
      influence: 9,
      interest: 7,
      observation: "Prioriza time-to-market.",
    },
  });

  await prisma.stakeholder.upsert({
    where: { id: "00000000-0000-4000-8000-000000000402" },
    update: {
      tenantId: tenant.id,
      projectId: p1.id,
      name: "Operaciones campo",
      role: "Usuario clave",
      influence: 6,
      interest: 8,
      observation: "Impacto en rutas diarias.",
    },
    create: {
      id: "00000000-0000-4000-8000-000000000402",
      tenantId: tenant.id,
      projectId: p1.id,
      name: "Operaciones campo",
      role: "Usuario clave",
      influence: 6,
      interest: 8,
      observation: "Impacto en rutas diarias.",
    },
  });

  await prisma.stakeholder.upsert({
    where: { id: "00000000-0000-4000-8000-000000000403" },
    update: {
      tenantId: tenant.id,
      projectId: p2.id,
      name: "TI Corporativo",
      role: "Integracion",
      influence: 7,
      interest: 5,
    },
    create: {
      id: "00000000-0000-4000-8000-000000000403",
      tenantId: tenant.id,
      projectId: p2.id,
      name: "TI Corporativo",
      role: "Integracion",
      influence: 7,
      interest: 5,
    },
  });

  console.log(`Demo cargada en tenant "${tenant.name}" (${slug}).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
