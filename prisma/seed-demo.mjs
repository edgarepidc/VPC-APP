/**
 * Carga datos de demostracion en un tenant existente (por slug).
 *
 *   DEMO_TENANT_SLUG=mobility-ado DATABASE_URL=... npm run prisma:seed-demo
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const slug = (process.env.DEMO_TENANT_SLUG ?? "mobility-ado").trim().toLowerCase();

const daysFromNow = (days) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(12, 0, 0, 0);
  return d;
};

async function upsertProject(id, tenantId, createdBy, data) {
  const { parentProjectId = null, sortOrder = 0, ...rest } = data;
  return prisma.project.upsert({
    where: { id },
    update: { tenantId, createdBy, parentProjectId, sortOrder, ...rest },
    create: { id, tenantId, createdBy, parentProjectId, sortOrder, ...rest },
  });
}

async function upsertEscalation(id, tenantId, createdBy, row) {
  const createdAt = daysFromNow(-row.daysAgo);
  await prisma.escalationCheck.upsert({
    where: { id },
    update: {
      tenantId,
      projectId: row.projectId,
      topic: row.topic,
      tier: row.tier,
      title: row.title,
      levelLabel: row.levelLabel,
      indicators: row.indicators,
      actions: row.actions,
      createdBy,
      createdAt,
    },
    create: {
      id,
      tenantId,
      projectId: row.projectId,
      topic: row.topic,
      tier: row.tier,
      title: row.title,
      levelLabel: row.levelLabel,
      indicators: row.indicators,
      actions: row.actions,
      createdBy,
      createdAt,
    },
  });
}

async function upsertMeeting(id, tenantId, createdBy, row) {
  const createdAt = daysFromNow(-row.daysAgo);
  await prisma.meetingRoiSession.upsert({
    where: { id },
    update: {
      tenantId,
      projectId: row.projectId,
      sessionName: row.sessionName,
      objective: row.objective,
      totalCost: row.totalCost,
      costLevel: row.costLevel,
      costPerMinute: row.costPerMinute,
      totalParticipants: row.totalParticipants,
      durationMinutes: row.durationMinutes,
      diagnosisTitle: row.diagnosisTitle,
      diagnosisText: row.diagnosisText,
      participants: row.participants,
      roleCosts: row.roleCosts,
      createdBy,
      createdAt,
    },
    create: {
      id,
      tenantId,
      projectId: row.projectId,
      sessionName: row.sessionName,
      objective: row.objective,
      totalCost: row.totalCost,
      costLevel: row.costLevel,
      costPerMinute: row.costPerMinute,
      totalParticipants: row.totalParticipants,
      durationMinutes: row.durationMinutes,
      diagnosisTitle: row.diagnosisTitle,
      diagnosisText: row.diagnosisText,
      participants: row.participants,
      roleCosts: row.roleCosts,
      createdBy,
      createdAt,
    },
  });
}

const ROLE_COSTS = { junior: 350, senior: 650, director: 1200, tech: 800 };

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
    orderBy: { id: "asc" },
  });
  if (!membership) {
    console.error("El tenant no tiene miembros activos; entra al menos una vez con un usuario.");
    process.exit(1);
  }
  const createdBy = membership.userId;

  const existingProjects = await prisma.project.findMany({
    where: { tenantId: tenant.id },
    select: { id: true, name: true },
    orderBy: { createdAt: "asc" },
  });

  // --- Dos proyectos demo adicionales ---
  const pApp = await upsertProject(
    "00000000-0000-4000-8000-000000000001",
    tenant.id,
    createdBy,
    {
      name: "App pasajeros — MVP",
      description: "Lanzamiento de la app móvil para reservas y seguimiento de rutas ADO.",
      status: "active",
    },
  );

  const pIntegracion = await upsertProject(
    "00000000-0000-4000-8000-000000000002",
    tenant.id,
    createdBy,
    {
      name: "Integración ERP y telemetría",
      description: "Conexión con SAP, GPS de flota y tableros operativos.",
      status: "active",
    },
  );

  const pTerminales = await upsertProject(
    "00000000-0000-4000-8000-000000000003",
    tenant.id,
    createdBy,
    {
      name: "Modernización terminales ADO",
      description: "Renovación de POS, pantallas y conectividad en 42 terminales piloto.",
      status: "active",
    },
  );

  const pCapacitacion = await upsertProject(
    "00000000-0000-4000-8000-000000000004",
    tenant.id,
    createdBy,
    {
      name: "Capacitación operadores y soporte",
      description: "Programa de adopción, manuales y mesa de ayuda para el nuevo ecosistema digital.",
      status: "active",
    },
  );

  const pEmbus = existingProjects.find((p) => p.name === "EMBUS") ?? existingProjects[0] ?? null;

  const spAppMobile = await upsertProject(
    "00000000-0000-4000-8010-000000000001",
    tenant.id,
    createdBy,
    {
      name: "App móvil pasajeros",
      description: "iOS / Android — reservas, pagos y seguimiento de rutas.",
      status: "active",
      parentProjectId: pApp.id,
      sortOrder: 1,
    },
  );

  const spAppBack = await upsertProject(
    "00000000-0000-4000-8010-000000000002",
    tenant.id,
    createdBy,
    {
      name: "Backoffice operativo",
      description: "Consola de operaciones, reportes y configuración.",
      status: "active",
      parentProjectId: pApp.id,
      sortOrder: 2,
    },
  );

  const spErp = await upsertProject(
    "00000000-0000-4000-8010-000000000003",
    tenant.id,
    createdBy,
    {
      name: "Integración SAP / ERP",
      description: "Interfaces contables y maestros de flota.",
      status: "active",
      parentProjectId: pIntegracion.id,
      sortOrder: 1,
    },
  );

  const spTelemetria = await upsertProject(
    "00000000-0000-4000-8010-000000000004",
    tenant.id,
    createdBy,
    {
      name: "Telemetría y tableros",
      description: "GPS, KPIs operativos y alertas en tiempo real.",
      status: "active",
      parentProjectId: pIntegracion.id,
      sortOrder: 2,
    },
  );

  // --- Entregables subproyecto App móvil ---
  const dMatriz = await prisma.deliverable.upsert({
    where: { id: "00000000-0000-4000-8000-000000000201" },
    update: {
      tenantId: tenant.id,
      projectId: spAppMobile.id,
      title: "Matriz de interesados v1",
      cell: "PMO",
      ownerName: "Ana Ruiz",
      clientName: "Dirección Mobility",
      status: "review",
      weight: 25,
      dueDate: daysFromNow(14),
      description: "Mapa de influencia e interés para el go-live regional.",
    },
    create: {
      id: "00000000-0000-4000-8000-000000000201",
      tenantId: tenant.id,
      projectId: spAppMobile.id,
      title: "Matriz de interesados v1",
      cell: "PMO",
      ownerName: "Ana Ruiz",
      clientName: "Dirección Mobility",
      status: "review",
      weight: 25,
      dueDate: daysFromNow(14),
      description: "Mapa de influencia e interés para el go-live regional.",
    },
  });

  await prisma.deliverable.upsert({
    where: { id: "00000000-0000-4000-8000-000000000202" },
    update: {
      tenantId: tenant.id,
      projectId: spAppMobile.id,
      title: "Prototipo UI reservas",
      cell: "Diseño",
      ownerName: "Carlos Méndez",
      status: "pending",
      weight: 30,
      dueDate: daysFromNow(-5),
      description: "Flujos de compra y cancelación — vencido para demo PMO.",
    },
    create: {
      id: "00000000-0000-4000-8000-000000000202",
      tenantId: tenant.id,
      projectId: spAppMobile.id,
      title: "Prototipo UI reservas",
      cell: "Diseño",
      ownerName: "Carlos Méndez",
      status: "pending",
      weight: 30,
      dueDate: daysFromNow(-5),
      description: "Flujos de compra y cancelación — vencido para demo PMO.",
    },
  });

  await prisma.deliverable.upsert({
    where: { id: "00000000-0000-4000-8000-000000000203" },
    update: {
      tenantId: tenant.id,
      projectId: spAppMobile.id,
      title: "Plan de pruebas UAT",
      cell: "QA",
      ownerName: "Ana Ruiz",
      status: "approved",
      weight: 20,
      deliveredAt: daysFromNow(-10),
    },
    create: {
      id: "00000000-0000-4000-8000-000000000203",
      tenantId: tenant.id,
      projectId: spAppMobile.id,
      title: "Plan de pruebas UAT",
      cell: "QA",
      ownerName: "Ana Ruiz",
      status: "approved",
      weight: 20,
      deliveredAt: daysFromNow(-10),
    },
  });

  await prisma.deliverable.upsert({
    where: { id: "00000000-0000-4000-8000-000000000204" },
    update: {
      tenantId: tenant.id,
      projectId: spAppMobile.id,
      title: "Manual de operación call center",
      cell: "Operaciones",
      ownerName: "Laura Vega",
      status: "pending",
      weight: 25,
      dueDate: daysFromNow(21),
    },
    create: {
      id: "00000000-0000-4000-8000-000000000204",
      tenantId: tenant.id,
      projectId: spAppMobile.id,
      title: "Manual de operación call center",
      cell: "Operaciones",
      ownerName: "Laura Vega",
      status: "pending",
      weight: 25,
      dueDate: daysFromNow(21),
    },
  });

  // --- Entregables proyecto Integración ---
  const dApi = await prisma.deliverable.upsert({
    where: { id: "00000000-0000-4000-8000-000000000205" },
    update: {
      tenantId: tenant.id,
      projectId: spErp.id,
      title: "Contrato API telemetría",
      cell: "TI",
      ownerName: "Roberto Sánchez",
      status: "review",
      weight: 40,
      dueDate: daysFromNow(7),
    },
    create: {
      id: "00000000-0000-4000-8000-000000000205",
      tenantId: tenant.id,
      projectId: spErp.id,
      title: "Contrato API telemetría",
      cell: "TI",
      ownerName: "Roberto Sánchez",
      status: "review",
      weight: 40,
      dueDate: daysFromNow(7),
    },
  });

  await prisma.deliverable.upsert({
    where: { id: "00000000-0000-4000-8000-000000000206" },
    update: {
      tenantId: tenant.id,
      projectId: spErp.id,
      title: "Migración maestro de rutas",
      cell: "Datos",
      ownerName: "Roberto Sánchez",
      status: "pending",
      weight: 35,
      dueDate: daysFromNow(-2),
    },
    create: {
      id: "00000000-0000-4000-8000-000000000206",
      tenantId: tenant.id,
      projectId: spErp.id,
      title: "Migración maestro de rutas",
      cell: "Datos",
      ownerName: "Roberto Sánchez",
      status: "pending",
      weight: 35,
      dueDate: daysFromNow(-2),
    },
  });

  await prisma.deliverable.upsert({
    where: { id: "00000000-0000-4000-8000-000000000207" },
    update: {
      tenantId: tenant.id,
      projectId: spErp.id,
      title: "Dashboard KPI flota",
      cell: "BI",
      ownerName: "Laura Vega",
      status: "delivered",
      weight: 25,
      deliveredAt: daysFromNow(-3),
    },
    create: {
      id: "00000000-0000-4000-8000-000000000207",
      tenantId: tenant.id,
      projectId: spErp.id,
      title: "Dashboard KPI flota",
      cell: "BI",
      ownerName: "Laura Vega",
      status: "delivered",
      weight: 25,
      deliveredAt: daysFromNow(-3),
    },
  });

  // --- Riesgos ---
  await prisma.risk.upsert({
    where: { id: "00000000-0000-4000-8000-000000000301" },
    update: {
      tenantId: tenant.id,
      projectId: spAppMobile.id,
      deliverableId: dMatriz.id,
      title: "Retraso en disponibilidad del equipo SME de operaciones",
      category: "Operativo",
      ownerName: "Ana Ruiz",
      probability: 45,
      residualProb: 25,
      impactAmount: 850000,
      status: "open",
      mitigation: "Sesiones dedicadas semanales con operaciones campo.",
      trigger: "Dos iteraciones UAT sin sign-off del área operativa.",
      dueDate: daysFromNow(30),
    },
    create: {
      id: "00000000-0000-4000-8000-000000000301",
      tenantId: tenant.id,
      projectId: spAppMobile.id,
      deliverableId: dMatriz.id,
      title: "Retraso en disponibilidad del equipo SME de operaciones",
      category: "Operativo",
      ownerName: "Ana Ruiz",
      probability: 45,
      residualProb: 25,
      impactAmount: 850000,
      status: "open",
      mitigation: "Sesiones dedicadas semanales con operaciones campo.",
      trigger: "Dos iteraciones UAT sin sign-off del área operativa.",
      dueDate: daysFromNow(30),
    },
  });

  await prisma.risk.upsert({
    where: { id: "00000000-0000-4000-8000-000000000302" },
    update: {
      tenantId: tenant.id,
      projectId: spAppMobile.id,
      title: "Rechazo en tiendas Apple / Google por políticas de pagos",
      category: "Regulatorio",
      ownerName: "Carlos Méndez",
      probability: 30,
      residualProb: 15,
      impactAmount: 1200000,
      status: "open",
      mitigation: "Revisión legal previa y piloto en mercado secundario.",
      contingency: "Lanzamiento web-only mientras se corrige el bundle móvil.",
      trigger: "Rechazo en primera ronda de revisión de la tienda.",
      dueDate: daysFromNow(-3),
    },
    create: {
      id: "00000000-0000-4000-8000-000000000302",
      tenantId: tenant.id,
      projectId: spAppMobile.id,
      title: "Rechazo en tiendas Apple / Google por políticas de pagos",
      category: "Regulatorio",
      ownerName: "Carlos Méndez",
      probability: 30,
      residualProb: 15,
      impactAmount: 1200000,
      status: "open",
      mitigation: "Revisión legal previa y piloto en mercado secundario.",
      contingency: "Lanzamiento web-only mientras se corrige el bundle móvil.",
      trigger: "Rechazo en primera ronda de revisión de la tienda.",
      dueDate: daysFromNow(-3),
    },
  });

  await prisma.risk.upsert({
    where: { id: "00000000-0000-4000-8000-000000000303" },
    update: {
      tenantId: tenant.id,
      projectId: spErp.id,
      deliverableId: dApi.id,
      title: "Calidad de datos en sistema fuente SAP",
      category: "Técnico",
      ownerName: "Roberto Sánchez",
      probability: 55,
      residualProb: 35,
      impactAmount: 650000,
      status: "open",
      mitigation: "Reglas de validación y muestreo diario en staging.",
      contingency: "Carga manual incremental por corredor prioritario.",
      trigger: "Más del 8% de registros con error en lote piloto.",
      dueDate: daysFromNow(45),
    },
    create: {
      id: "00000000-0000-4000-8000-000000000303",
      tenantId: tenant.id,
      projectId: spErp.id,
      deliverableId: dApi.id,
      title: "Calidad de datos en sistema fuente SAP",
      category: "Técnico",
      ownerName: "Roberto Sánchez",
      probability: 55,
      residualProb: 35,
      impactAmount: 650000,
      status: "open",
      mitigation: "Reglas de validación y muestreo diario en staging.",
      contingency: "Carga manual incremental por corredor prioritario.",
      trigger: "Más del 8% de registros con error en lote piloto.",
      dueDate: daysFromNow(45),
    },
  });

  await prisma.risk.upsert({
    where: { id: "00000000-0000-4000-8000-000000000304" },
    update: {
      tenantId: tenant.id,
      projectId: spErp.id,
      title: "Ventana de mantenimiento ERP no disponible",
      category: "Operativo",
      ownerName: "Laura Vega",
      probability: 40,
      residualProb: 20,
      impactAmount: 320000,
      status: "open",
      mitigation: "Coordinación con TI corporativo y ventana de respaldo.",
      dueDate: daysFromNow(12),
    },
    create: {
      id: "00000000-0000-4000-8000-000000000304",
      tenantId: tenant.id,
      projectId: spErp.id,
      title: "Ventana de mantenimiento ERP no disponible",
      category: "Operativo",
      ownerName: "Laura Vega",
      probability: 40,
      residualProb: 20,
      impactAmount: 320000,
      status: "open",
      mitigation: "Coordinación con TI corporativo y ventana de respaldo.",
      dueDate: daysFromNow(12),
    },
  });

  // --- Interesados ---
  const stakeholderRows = [
    {
      id: "00000000-0000-4000-8000-000000000401",
      projectId: spAppMobile.id,
      name: "Dirección Mobility ADO",
      role: "Patrocinador",
      influence: 9,
      interest: 8,
      observation: "Prioriza time-to-market del MVP en Q3.",
    },
    {
      id: "00000000-0000-4000-8000-000000000402",
      projectId: spAppMobile.id,
      name: "Operaciones campo",
      role: "Usuario clave",
      influence: 7,
      interest: 9,
      observation: "Impacto directo en rutas diarias y capacitación.",
    },
    {
      id: "00000000-0000-4000-8000-000000000403",
      projectId: spAppMobile.id,
      name: "Marketing digital",
      role: "Comunicación",
      influence: 6,
      interest: 4,
      observation: null,
    },
    {
      id: "00000000-0000-4000-8000-000000000404",
      projectId: spErp.id,
      name: "TI Corporativo",
      role: "Integración",
      influence: 8,
      interest: 6,
      observation: "Dueño del ERP y políticas de seguridad.",
    },
    {
      id: "00000000-0000-4000-8000-000000000405",
      projectId: spErp.id,
      name: "Proveedor telemetría",
      role: "Externo",
      influence: 5,
      interest: 7,
      observation: "SLA 99.5% en contrato marco.",
    },
    {
      id: "00000000-0000-4000-8000-000000000406",
      projectId: spErp.id,
      name: "Finanzas",
      role: "Control",
      influence: 7,
      interest: 3,
      observation: "Requiere trazabilidad de costos por corredor.",
    },
  ];

  for (const row of stakeholderRows) {
    await prisma.stakeholder.upsert({
      where: { id: row.id },
      update: { tenantId: tenant.id, ...row },
      create: { tenantId: tenant.id, ...row },
    });
  }

  // --- Tareas ---
  const taskRows = [
    {
      id: "00000000-0000-4000-8000-000000000101",
      projectId: spAppMobile.id,
      title: "Workshop kickoff con stakeholders",
      status: "in_progress",
    },
    {
      id: "00000000-0000-4000-8000-000000000102",
      projectId: spAppMobile.id,
      title: "Validar flujos de pago con legal",
      status: "todo",
    },
    {
      id: "00000000-0000-4000-8000-000000000103",
      projectId: spErp.id,
      title: "Mapeo de interfaces API SAP",
      status: "in_progress",
    },
    {
      id: "00000000-0000-4000-8000-000000000104",
      projectId: spErp.id,
      title: "Prueba de carga telemetría 500 buses",
      status: "todo",
    },
  ];

  for (const row of taskRows) {
    await prisma.task.upsert({
      where: { id: row.id },
      update: { tenantId: tenant.id, ...row },
      create: { tenantId: tenant.id, ...row },
    });
  }

  // --- Escalamientos (historial para tendencias PMO) ---
  const escalationRows = [
    {
      id: "00000000-0000-4000-8000-000000000501",
      projectId: spAppMobile.id,
      topic: "Go-live regional",
      tier: "green",
      title: "Ritmo de entregables estable",
      levelLabel: "Verde — bajo riesgo",
      daysAgo: 21,
      indicators: { schedule: "low", budget: "low", scope: "medium" },
      actions: ["Mantener cadencia semanal de comité.", "Publicar avance en tablero PMO."],
    },
    {
      id: "00000000-0000-4000-8000-000000000502",
      projectId: spAppMobile.id,
      topic: "UAT pasajeros",
      tier: "orange",
      title: "Retraso en validación operativa",
      levelLabel: "Naranja — atención",
      daysAgo: 7,
      indicators: { schedule: "medium", budget: "low", scope: "medium" },
      actions: ["Escalar disponibilidad SME.", "Replanificar hito de prototipo UI."],
    },
    {
      id: "00000000-0000-4000-8000-000000000503",
      projectId: spErp.id,
      topic: "Migración datos",
      tier: "orange",
      title: "Calidad de datos en staging",
      levelLabel: "Naranja — atención",
      daysAgo: 14,
      indicators: { schedule: "medium", budget: "medium", scope: "high" },
      actions: ["Auditoría diaria de registros.", "Activar plan de contingencia parcial."],
    },
    {
      id: "00000000-0000-4000-8000-000000000504",
      projectId: spErp.id,
      topic: "API telemetría",
      tier: "red",
      title: "Bloqueo por política de seguridad TI",
      levelLabel: "Rojo — escalamiento",
      daysAgo: 3,
      indicators: { schedule: "high", budget: "medium", scope: "high" },
      actions: ["Sesión ejecutiva con TI corporativo.", "Documentar excepción temporal de firewall."],
    },
  ];

  for (const row of escalationRows) {
    const createdAt = daysFromNow(-row.daysAgo);
    await prisma.escalationCheck.upsert({
      where: { id: row.id },
      update: {
        tenantId: tenant.id,
        projectId: row.projectId,
        topic: row.topic,
        tier: row.tier,
        title: row.title,
        levelLabel: row.levelLabel,
        indicators: row.indicators,
        actions: row.actions,
        createdBy,
        createdAt,
      },
      create: {
        id: row.id,
        tenantId: tenant.id,
        projectId: row.projectId,
        topic: row.topic,
        tier: row.tier,
        title: row.title,
        levelLabel: row.levelLabel,
        indicators: row.indicators,
        actions: row.actions,
        createdBy,
        createdAt,
      },
    });
  }

  // --- Reuniones ROI ---
  const meetingRows = [
    {
      id: "00000000-0000-4000-8000-000000000601",
      projectId: spAppMobile.id,
      sessionName: "Comité semanal MVP",
      objective: "decision",
      totalCost: 18500,
      costLevel: "Moderado",
      costPerMinute: 925,
      totalParticipants: 8,
      durationMinutes: 20,
      diagnosisTitle: "Agenda dispersa",
      diagnosisText: "Demasiados temas informativos; reducir a 3 decisiones por sesión.",
      daysAgo: 5,
      participants: { junior: 2, senior: 3, director: 2, tech: 1 },
      roleCosts: { junior: 350, senior: 650, director: 1200, tech: 800 },
    },
    {
      id: "00000000-0000-4000-8000-000000000602",
      projectId: spAppMobile.id,
      sessionName: "Revisión legal pagos",
      objective: "tecnica",
      totalCost: 9200,
      costLevel: "Bajo",
      costPerMinute: 460,
      totalParticipants: 4,
      durationMinutes: 20,
      diagnosisTitle: "Sesión eficiente",
      diagnosisText: "Participantes correctos y entregable claro al cierre.",
      daysAgo: 12,
      participants: { junior: 0, senior: 2, director: 1, tech: 1 },
      roleCosts: { junior: 350, senior: 650, director: 1200, tech: 800 },
    },
    {
      id: "00000000-0000-4000-8000-000000000603",
      projectId: spErp.id,
      sessionName: "War room migración SAP",
      objective: "crisis",
      totalCost: 42000,
      costLevel: "Crítico",
      costPerMinute: 1400,
      totalParticipants: 10,
      durationMinutes: 30,
      diagnosisTitle: "Sobreconvocatoria",
      diagnosisText: "Directores presentes sin decisión pendiente; costo desproporcionado.",
      daysAgo: 2,
      participants: { junior: 1, senior: 4, director: 3, tech: 2 },
      roleCosts: { junior: 350, senior: 650, director: 1200, tech: 800 },
    },
    {
      id: "00000000-0000-4000-8000-000000000604",
      projectId: spErp.id,
      sessionName: "Sync proveedor telemetría",
      objective: "informativa",
      totalCost: 7800,
      costLevel: "Bajo",
      costPerMinute: 390,
      totalParticipants: 5,
      durationMinutes: 20,
      diagnosisTitle: "Podría ser async",
      diagnosisText: "Status report sin bloqueos; candidato a reporte escrito.",
      daysAgo: 9,
      participants: { junior: 1, senior: 2, director: 0, tech: 2 },
      roleCosts: { junior: 350, senior: 650, director: 1200, tech: 800 },
    },
  ];

  for (const row of meetingRows) {
    const createdAt = daysFromNow(-row.daysAgo);
    await prisma.meetingRoiSession.upsert({
      where: { id: row.id },
      update: {
        tenantId: tenant.id,
        projectId: row.projectId,
        sessionName: row.sessionName,
        objective: row.objective,
        totalCost: row.totalCost,
        costLevel: row.costLevel,
        costPerMinute: row.costPerMinute,
        totalParticipants: row.totalParticipants,
        durationMinutes: row.durationMinutes,
        diagnosisTitle: row.diagnosisTitle,
        diagnosisText: row.diagnosisText,
        participants: row.participants,
        roleCosts: row.roleCosts,
        createdBy,
        createdAt,
      },
      create: {
        id: row.id,
        tenantId: tenant.id,
        projectId: row.projectId,
        sessionName: row.sessionName,
        objective: row.objective,
        totalCost: row.totalCost,
        costLevel: row.costLevel,
        costPerMinute: row.costPerMinute,
        totalParticipants: row.totalParticipants,
        durationMinutes: row.durationMinutes,
        diagnosisTitle: row.diagnosisTitle,
        diagnosisText: row.diagnosisText,
        participants: row.participants,
        roleCosts: row.roleCosts,
        createdBy,
        createdAt,
      },
    });
  }

  // --- Enriquecer proyecto EMBUS existente (si aplica) ---
  if (pEmbus) {
    await prisma.risk.upsert({
      where: { id: "00000000-0000-4000-8000-000000000701" },
      update: {
        tenantId: tenant.id,
        projectId: pEmbus.id,
        title: "Dependencia de un solo proveedor de hosting",
        category: "Técnico",
        ownerName: "PM EMBUS",
        probability: 35,
        residualProb: 20,
        impactAmount: 280000,
        status: "open",
        mitigation: "Documentar plan de recuperación y réplica en región secundaria.",
        dueDate: daysFromNow(20),
      },
      create: {
        id: "00000000-0000-4000-8000-000000000701",
        tenantId: tenant.id,
        projectId: pEmbus.id,
        title: "Dependencia de un solo proveedor de hosting",
        category: "Técnico",
        ownerName: "PM EMBUS",
        probability: 35,
        residualProb: 20,
        impactAmount: 280000,
        status: "open",
        mitigation: "Documentar plan de recuperación y réplica en región secundaria.",
        dueDate: daysFromNow(20),
      },
    });

    await prisma.stakeholder.upsert({
      where: { id: "00000000-0000-4000-8000-000000000702" },
      update: {
        tenantId: tenant.id,
        projectId: pEmbus.id,
        name: "Equipo operaciones EMBUS",
        role: "Usuario clave",
        influence: 8,
        interest: 7,
        observation: "Usa el backoffice diariamente.",
      },
      create: {
        id: "00000000-0000-4000-8000-000000000702",
        tenantId: tenant.id,
        projectId: pEmbus.id,
        name: "Equipo operaciones EMBUS",
        role: "Usuario clave",
        influence: 8,
        interest: 7,
        observation: "Usa el backoffice diariamente.",
      },
    });

    await prisma.stakeholder.upsert({
      where: { id: "00000000-0000-4000-8000-000000000703" },
      update: {
        tenantId: tenant.id,
        projectId: pEmbus.id,
        name: "Dirección general",
        role: "Patrocinador",
        influence: 9,
        interest: 5,
        observation: null,
      },
      create: {
        id: "00000000-0000-4000-8000-000000000703",
        tenantId: tenant.id,
        projectId: pEmbus.id,
        name: "Dirección general",
        role: "Patrocinador",
        influence: 9,
        interest: 5,
        observation: null,
      },
    });

    await prisma.task.upsert({
      where: { id: "00000000-0000-4000-8000-000000000704" },
      update: {
        tenantId: tenant.id,
        projectId: pEmbus.id,
        title: "Actualizar matriz RACI del backoffice",
        status: "todo",
      },
      create: {
        id: "00000000-0000-4000-8000-000000000704",
        tenantId: tenant.id,
        projectId: pEmbus.id,
        title: "Actualizar matriz RACI del backoffice",
        status: "todo",
      },
    });

    const embusEscDate = daysFromNow(-10);
    await prisma.escalationCheck.upsert({
      where: { id: "00000000-0000-4000-8000-000000000705" },
      update: {
        tenantId: tenant.id,
        projectId: pEmbus.id,
        topic: "Backoffice",
        tier: "green",
        title: "Entregables en curso normales",
        levelLabel: "Verde — bajo riesgo",
        indicators: { schedule: "low", budget: "low", scope: "low" },
        actions: ["Continuar cierre de entregables pendientes."],
        createdBy,
        createdAt: embusEscDate,
      },
      create: {
        id: "00000000-0000-4000-8000-000000000705",
        tenantId: tenant.id,
        projectId: pEmbus.id,
        topic: "Backoffice",
        tier: "green",
        title: "Entregables en curso normales",
        levelLabel: "Verde — bajo riesgo",
        indicators: { schedule: "low", budget: "low", scope: "low" },
        actions: ["Continuar cierre de entregables pendientes."],
        createdBy,
        createdAt: embusEscDate,
      },
    });
  }

  // --- Fase 2: volumen demo para escenarios PMO reales ---
  const dTermHw = await prisma.deliverable.upsert({
    where: { id: "00000000-0000-4000-8000-000000000208" },
    update: {
      tenantId: tenant.id,
      projectId: pTerminales.id,
      title: "Inventario hardware terminales piloto",
      cell: "Infraestructura",
      ownerName: "Miguel Torres",
      status: "approved",
      weight: 20,
      dueDate: daysFromNow(-15),
      deliveredAt: daysFromNow(-12),
    },
    create: {
      id: "00000000-0000-4000-8000-000000000208",
      tenantId: tenant.id,
      projectId: pTerminales.id,
      title: "Inventario hardware terminales piloto",
      cell: "Infraestructura",
      ownerName: "Miguel Torres",
      status: "approved",
      weight: 20,
      dueDate: daysFromNow(-15),
      deliveredAt: daysFromNow(-12),
    },
  });

  const deliverableExtras = [
    {
      id: "00000000-0000-4000-8000-000000000209",
      projectId: pTerminales.id,
      title: "Instalación POS fase Monterrey",
      cell: "Despliegue",
      ownerName: "Miguel Torres",
      status: "pending",
      weight: 35,
      dueDate: daysFromNow(-8),
    },
    {
      id: "00000000-0000-4000-8000-000000000210",
      projectId: pTerminales.id,
      title: "Pruebas de conectividad satelital",
      cell: "QA",
      ownerName: "Patricia Núñez",
      status: "review",
      weight: 25,
      dueDate: daysFromNow(5),
    },
    {
      id: "00000000-0000-4000-8000-000000000211",
      projectId: pTerminales.id,
      title: "Acta de aceptación terminal Guadalajara",
      cell: "Cierre",
      ownerName: "Miguel Torres",
      status: "pending",
      weight: 20,
      dueDate: daysFromNow(18),
      dependsOnId: dTermHw.id,
    },
    {
      id: "00000000-0000-4000-8000-000000000212",
      projectId: pCapacitacion.id,
      title: "Plan de capacitación por rol",
      cell: "RH",
      ownerName: "Sofía Herrera",
      status: "delivered",
      weight: 30,
      dueDate: daysFromNow(-20),
      deliveredAt: daysFromNow(-18),
    },
    {
      id: "00000000-0000-4000-8000-000000000213",
      projectId: pCapacitacion.id,
      title: "Videos tutoriales app pasajeros",
      cell: "Contenido",
      ownerName: "Sofía Herrera",
      status: "review",
      weight: 25,
      dueDate: daysFromNow(3),
    },
    {
      id: "00000000-0000-4000-8000-000000000214",
      projectId: pCapacitacion.id,
      title: "Simulacro mesa de ayuda L1",
      cell: "Operaciones",
      ownerName: "Diego Ramírez",
      status: "pending",
      weight: 25,
      dueDate: daysFromNow(-1),
    },
    {
      id: "00000000-0000-4000-8000-000000000215",
      projectId: pCapacitacion.id,
      title: "Evaluación de competencias post-capacitación",
      cell: "QA",
      ownerName: "Diego Ramírez",
      status: "pending",
      weight: 20,
      dueDate: daysFromNow(14),
    },
    {
      id: "00000000-0000-4000-8000-000000000216",
      projectId: spAppMobile.id,
      title: "Integración pasarela OpenPay",
      cell: "Desarrollo",
      ownerName: "Carlos Méndez",
      status: "review",
      weight: 15,
      dueDate: daysFromNow(8),
    },
    {
      id: "00000000-0000-4000-8000-000000000217",
      projectId: spErp.id,
      title: "Runbook contingencia SAP",
      cell: "Operaciones",
      ownerName: "Roberto Sánchez",
      status: "pending",
      weight: 15,
      dueDate: daysFromNow(-12),
    },
  ];

  for (const row of deliverableExtras) {
    const { id, dependsOnId, deliveredAt, ...data } = row;
    await prisma.deliverable.upsert({
      where: { id },
      update: { tenantId: tenant.id, dependsOnId: dependsOnId ?? null, deliveredAt: deliveredAt ?? null, ...data },
      create: { id, tenantId: tenant.id, dependsOnId: dependsOnId ?? null, deliveredAt: deliveredAt ?? null, ...data },
    });
  }

  const riskExtras = [
    {
      id: "00000000-0000-4000-8000-000000000305",
      projectId: pTerminales.id,
      title: "Robo o vandalismo en terminales no custodiadas",
      category: "Operativo",
      ownerName: "Miguel Torres",
      probability: 25,
      residualProb: 15,
      impactAmount: 420000,
      mitigation: "Seguros y CCTV en sitios piloto.",
      contingency: "Reposición express con stock de contingencia regional.",
      trigger: "Dos incidentes en la misma terminal en 30 días.",
      dueDate: daysFromNow(60),
    },
    {
      id: "00000000-0000-4000-8000-000000000306",
      projectId: pTerminales.id,
      title: "Incompatibilidad firmware POS con impresoras legacy",
      category: "Técnico",
      ownerName: "Patricia Núñez",
      probability: 50,
      residualProb: 40,
      impactAmount: 780000,
      mitigation: "Matriz de compatibilidad y pruebas en banco de pruebas.",
      trigger: "Fallo en más del 15% de impresoras en piloto.",
      dueDate: daysFromNow(-7),
    },
    {
      id: "00000000-0000-4000-8000-000000000307",
      projectId: pCapacitacion.id,
      title: "Baja asistencia de operadores en turno nocturno",
      category: "Operativo",
      ownerName: "Sofía Herrera",
      probability: 55,
      residualProb: 30,
      impactAmount: 310000,
      mitigation: "Sesiones grabadas y refuerzo con supervisores de turno.",
      dueDate: daysFromNow(25),
    },
    {
      id: "00000000-0000-4000-8000-000000000308",
      projectId: pCapacitacion.id,
      title: "Rotación de personal antes del go-live",
      category: "Recursos",
      ownerName: "Diego Ramírez",
      probability: 45,
      residualProb: 50,
      impactAmount: 950000,
      mitigation: "Plan de continuidad con doble capacitación por puesto crítico.",
      contingency: "Contratación temporal de instructores externos certificados.",
      trigger: "Pérdida de más de 3 instructores clave en un mes.",
      dueDate: daysFromNow(10),
    },
    {
      id: "00000000-0000-4000-8000-000000000309",
      projectId: spAppMobile.id,
      title: "Caída de servicio en pico de Semana Santa",
      category: "Técnico",
      ownerName: "Carlos Méndez",
      probability: 35,
      residualProb: 55,
      impactAmount: 2100000,
      mitigation: "Prueba de carga 3x tráfico esperado y auto-scaling.",
      contingency: "Modo degradado con cola de reservas y SMS de confirmación.",
      trigger: "Latencia P95 > 3s en prueba de carga.",
      dueDate: daysFromNow(45),
    },
    {
      id: "00000000-0000-4000-8000-000000000310",
      projectId: spErp.id,
      title: "Multa por incumplimiento normativo de datos de pasajeros",
      category: "Regulatorio",
      ownerName: "Laura Vega",
      probability: 20,
      residualProb: 45,
      impactAmount: 1800000,
      mitigation: "Auditoría legal y anonimización en staging.",
      contingency: "Retrasar integración de PII hasta certificación.",
      trigger: "Observación crítica en auditoría interna.",
      dueDate: daysFromNow(5),
    },
    {
      id: "00000000-0000-4000-8000-000000000311",
      projectId: spErp.id,
      title: "Latencia API telemetría en corredor montañoso",
      category: "Técnico",
      ownerName: "Roberto Sánchez",
      probability: 60,
      residualProb: 35,
      impactAmount: 540000,
      mitigation: "Edge cache en gateways regionales.",
      dueDate: daysFromNow(-14),
    },
  ];

  for (const row of riskExtras) {
    await prisma.risk.upsert({
      where: { id: row.id },
      update: { tenantId: tenant.id, status: "open", ...row },
      create: { tenantId: tenant.id, status: "open", ...row },
    });
  }

  const stakeholderExtras = [
    { id: "00000000-0000-4000-8000-000000000407", projectId: pTerminales.id, name: "Gerente regional Norte", role: "Operaciones", influence: 8, interest: 3, observation: null },
    { id: "00000000-0000-4000-8000-000000000408", projectId: pTerminales.id, name: "Proveedor POS VeriFone", role: "Externo", influence: 6, interest: 8, observation: "Contrato de soporte 24/7 incluido." },
    { id: "00000000-0000-4000-8000-000000000409", projectId: pTerminales.id, name: "Seguridad patrimonial", role: "Control", influence: 7, interest: 6, observation: "Requiere protocolo de acceso a bodegas." },
    { id: "00000000-0000-4000-8000-000000000410", projectId: pCapacitacion.id, name: "Líderes de turno", role: "Usuario clave", influence: 5, interest: 9, observation: "Canal principal para cascada de capacitación." },
    { id: "00000000-0000-4000-8000-000000000411", projectId: pCapacitacion.id, name: "Sindicato choferes", role: "Gremio", influence: 9, interest: 2, observation: null },
    { id: "00000000-0000-4000-8000-000000000412", projectId: pCapacitacion.id, name: "RH corporativo", role: "Patrocinador", influence: 8, interest: 7, observation: "Aprueba presupuesto de capacitación." },
    { id: "00000000-0000-4000-8000-000000000413", projectId: spAppMobile.id, name: "Regulador transporte", role: "Regulatorio", influence: 9, interest: 4, observation: null },
    { id: "00000000-0000-4000-8000-000000000414", projectId: spAppMobile.id, name: "Atención a clientes", role: "Operaciones", influence: 4, interest: 9, observation: "Primer contacto en reclamaciones de app." },
    { id: "00000000-0000-4000-8000-000000000415", projectId: spErp.id, name: "CISO corporativo", role: "Seguridad", influence: 9, interest: 6, observation: "Exige cifrado E2E en APIs expuestas." },
    { id: "00000000-0000-4000-8000-000000000416", projectId: spErp.id, name: "Compras", role: "Administración", influence: 3, interest: 2, observation: "Bajo involucramiento salvo renovaciones." },
  ];

  for (const row of stakeholderExtras) {
    await prisma.stakeholder.upsert({
      where: { id: row.id },
      update: { tenantId: tenant.id, ...row },
      create: { tenantId: tenant.id, ...row },
    });
  }

  const taskExtras = [
    { id: "00000000-0000-4000-8000-000000000105", projectId: pTerminales.id, title: "Coordinar visita técnica terminal Monterrey", status: "in_progress" },
    { id: "00000000-0000-4000-8000-000000000106", projectId: pTerminales.id, title: "Validar diagrama de red con proveedor ISP", status: "todo" },
    { id: "00000000-0000-4000-8000-000000000107", projectId: pCapacitacion.id, title: "Agendar calendario de talleres por corredor", status: "in_progress" },
    { id: "00000000-0000-4000-8000-000000000108", projectId: pCapacitacion.id, title: "Publicar FAQ en intranet", status: "done" },
    { id: "00000000-0000-4000-8000-000000000109", projectId: spAppMobile.id, title: "Prueba de penetración OWASP", status: "todo" },
    { id: "00000000-0000-4000-8000-000000000110", projectId: spErp.id, title: "Solicitar ventana de cambio SAP", status: "in_progress" },
    { id: "00000000-0000-4000-8000-000000000111", projectId: spErp.id, title: "Documentar mapeo de campos PII", status: "todo" },
  ];

  for (const row of taskExtras) {
    await prisma.task.upsert({
      where: { id: row.id },
      update: { tenantId: tenant.id, ...row },
      create: { tenantId: tenant.id, ...row },
    });
  }

  const escalationExtras = [
    { id: "00000000-0000-4000-8000-000000000506", projectId: spAppMobile.id, topic: "Store review", tier: "green", title: "Publicación en tiendas en curso", levelLabel: "Verde", daysAgo: 5, indicators: { schedule: "low", budget: "low", scope: "low" }, actions: ["Seguir checklist de publicación."] },
    { id: "00000000-0000-4000-8000-000000000507", projectId: spAppMobile.id, topic: "Store review", tier: "red", title: "Rechazo Apple por metadata incompleta", levelLabel: "Rojo — escalamiento", daysAgo: 2, indicators: { schedule: "high", budget: "medium", scope: "medium" }, actions: ["Escalar a legal y marketing.", "Corregir metadata en 48h."] },
    { id: "00000000-0000-4000-8000-000000000508", projectId: pTerminales.id, topic: "Despliegue Monterrey", tier: "green", title: "Avance según plan", levelLabel: "Verde", daysAgo: 18, indicators: { schedule: "low", budget: "low", scope: "low" }, actions: ["Mantener ritmo semanal."] },
    { id: "00000000-0000-4000-8000-000000000509", projectId: pTerminales.id, topic: "Despliegue Monterrey", tier: "orange", title: "Retraso en instalación POS", levelLabel: "Naranja", daysAgo: 6, indicators: { schedule: "medium", budget: "low", scope: "medium" }, actions: ["Refuerzo de cuadrilla en fin de semana."] },
    { id: "00000000-0000-4000-8000-000000000510", projectId: pTerminales.id, topic: "Conectividad", tier: "orange", title: "Pruebas satelitales inconclusas", levelLabel: "Naranja", daysAgo: 1, indicators: { schedule: "medium", budget: "medium", scope: "high" }, actions: ["Sesión con proveedor ISP.", "Plan B con backup 4G."] },
    { id: "00000000-0000-4000-8000-000000000511", projectId: pCapacitacion.id, topic: "Adopción", tier: "green", title: "Asistencia inicial aceptable", levelLabel: "Verde", daysAgo: 12, indicators: { schedule: "low", budget: "low", scope: "low" }, actions: ["Continuar talleres presenciales."] },
    { id: "00000000-0000-4000-8000-000000000512", projectId: pCapacitacion.id, topic: "Simulacro L1", tier: "orange", title: "Simulacro reprogramado dos veces", levelLabel: "Naranja", daysAgo: 4, indicators: { schedule: "medium", budget: "low", scope: "medium" }, actions: ["Fijar fecha con operaciones.", "Grabar sesión de respaldo."] },
    { id: "00000000-0000-4000-8000-000000000513", projectId: spErp.id, topic: "Seguridad", tier: "green", title: "Controles de acceso validados", levelLabel: "Verde", daysAgo: 6, indicators: { schedule: "low", budget: "low", scope: "low" }, actions: ["Documentar excepciones aprobadas."] },
    { id: "00000000-0000-4000-8000-000000000514", projectId: spErp.id, topic: "Seguridad", tier: "red", title: "Bloqueo firewall sin fecha de resolución", levelLabel: "Rojo", daysAgo: 1, indicators: { schedule: "high", budget: "medium", scope: "high" }, actions: ["Comité ejecutivo con CISO.", "Ambiente alterno temporal."] },
  ];

  for (const row of escalationExtras) {
    await upsertEscalation(row.id, tenant.id, createdBy, row);
  }

  const meetingExtras = [
    { id: "00000000-0000-4000-8000-000000000605", projectId: spAppMobile.id, sessionName: "Status app — viernes", objective: "informativa", totalCost: 11200, costLevel: "Moderado", costPerMinute: 560, totalParticipants: 10, durationMinutes: 20, diagnosisTitle: "Demasiados asistentes", diagnosisText: "Podría ser un reporte async; 4 personas sin intervención.", daysAgo: 3, participants: { junior: 3, senior: 4, director: 2, tech: 1 }, roleCosts: ROLE_COSTS },
    { id: "00000000-0000-4000-8000-000000000606", projectId: spAppMobile.id, sessionName: "War room store rejection", objective: "crisis", totalCost: 38500, costLevel: "Crítico", costPerMinute: 1283, totalParticipants: 9, durationMinutes: 30, diagnosisTitle: "Crisis sin agenda", diagnosisText: "Directores convocados sin decisión documentada al cierre.", daysAgo: 1, participants: { junior: 0, senior: 3, director: 4, tech: 2 }, roleCosts: ROLE_COSTS },
    { id: "00000000-0000-4000-8000-000000000607", projectId: pTerminales.id, sessionName: "Kickoff proveedor POS", objective: "decision", totalCost: 15600, costLevel: "Moderado", costPerMinute: 780, totalParticipants: 6, durationMinutes: 20, diagnosisTitle: "Decisiones claras", diagnosisText: "Se cerraron 3 acuerdos de instalación con responsables.", daysAgo: 15, participants: { junior: 1, senior: 3, director: 1, tech: 1 }, roleCosts: ROLE_COSTS },
    { id: "00000000-0000-4000-8000-000000000608", projectId: pTerminales.id, sessionName: "Sync instalación — daily", objective: "informativa", totalCost: 9600, costLevel: "Bajo", costPerMinute: 480, totalParticipants: 6, durationMinutes: 20, diagnosisTitle: "Daily costoso", diagnosisText: "Mismo grupo 5 días; evaluar standup de 15 min.", daysAgo: 2, participants: { junior: 2, senior: 2, director: 1, tech: 1 }, roleCosts: ROLE_COSTS },
    { id: "00000000-0000-4000-8000-000000000609", projectId: pCapacitacion.id, sessionName: "Comité adopción", objective: "decision", totalCost: 22400, costLevel: "Alto", costPerMinute: 1120, totalParticipants: 8, durationMinutes: 20, diagnosisTitle: "Alto costo por directores", diagnosisText: "4 directores en tema operativo; delegar a managers.", daysAgo: 5, participants: { junior: 0, senior: 2, director: 4, tech: 2 }, roleCosts: ROLE_COSTS },
    { id: "00000000-0000-4000-8000-000000000610", projectId: pCapacitacion.id, sessionName: "Demo plataforma instructores", objective: "tecnica", totalCost: 6400, costLevel: "Bajo", costPerMinute: 320, totalParticipants: 4, durationMinutes: 20, diagnosisTitle: "Sesión eficiente", diagnosisText: "Participantes correctos y demo grabada para replicar.", daysAgo: 8, participants: { junior: 1, senior: 2, director: 0, tech: 1 }, roleCosts: ROLE_COSTS },
    { id: "00000000-0000-4000-8000-000000000611", projectId: spErp.id, sessionName: "Status integración SAP", objective: "informativa", totalCost: 10500, costLevel: "Moderado", costPerMinute: 525, totalParticipants: 7, durationMinutes: 20, diagnosisTitle: "Status sin bloqueos", diagnosisText: "Candidata a reporte escrito semanal.", daysAgo: 4, participants: { junior: 1, senior: 3, director: 2, tech: 1 }, roleCosts: ROLE_COSTS },
    { id: "00000000-0000-4000-8000-000000000612", projectId: spErp.id, sessionName: "Comité seguridad datos", objective: "decision", totalCost: 28800, costLevel: "Alto", costPerMinute: 960, totalParticipants: 7, durationMinutes: 30, diagnosisTitle: "Bloqueo sin dueño", diagnosisText: "Discusión circular; falta decisión de CISO documentada.", daysAgo: 6, participants: { junior: 0, senior: 2, director: 3, tech: 2 }, roleCosts: ROLE_COSTS },
  ];

  for (const row of meetingExtras) {
    await upsertMeeting(row.id, tenant.id, createdBy, row);
  }

  if (pEmbus) {
    const embusDeliverables = [
      { id: "00000000-0000-4000-8000-000000000801", title: "Manual usuario backoffice v2", cell: "Documentación", ownerName: "PM EMBUS", status: "review", weight: 25, dueDate: daysFromNow(6) },
      { id: "00000000-0000-4000-8000-000000000802", title: "Integración reportes Power BI", cell: "BI", ownerName: "PM EMBUS", status: "pending", weight: 20, dueDate: daysFromNow(-4) },
      { id: "00000000-0000-4000-8000-000000000803", title: "Pruebas de regresión sprint 4", cell: "QA", ownerName: "QA EMBUS", status: "pending", weight: 15, dueDate: daysFromNow(10) },
    ];
    for (const row of embusDeliverables) {
      await prisma.deliverable.upsert({
        where: { id: row.id },
        update: { tenantId: tenant.id, projectId: pEmbus.id, ...row },
        create: { tenantId: tenant.id, projectId: pEmbus.id, ...row },
      });
    }

    await prisma.risk.upsert({
      where: { id: "00000000-0000-4000-8000-000000000712" },
      update: {
        tenantId: tenant.id,
        projectId: pEmbus.id,
        title: "Deuda técnica en módulo de permisos",
        category: "Técnico",
        ownerName: "PM EMBUS",
        probability: 60,
        residualProb: 45,
        impactAmount: 520000,
        status: "open",
        mitigation: "Refactor planificado en sprint 5.",
        contingency: "Parche de roles simplificado para go-live.",
        trigger: "Más de 5 bugs críticos en QA de permisos.",
        dueDate: daysFromNow(-5),
      },
      create: {
        id: "00000000-0000-4000-8000-000000000712",
        tenantId: tenant.id,
        projectId: pEmbus.id,
        title: "Deuda técnica en módulo de permisos",
        category: "Técnico",
        ownerName: "PM EMBUS",
        probability: 60,
        residualProb: 45,
        impactAmount: 520000,
        status: "open",
        mitigation: "Refactor planificado en sprint 5.",
        contingency: "Parche de roles simplificado para go-live.",
        trigger: "Más de 5 bugs críticos en QA de permisos.",
        dueDate: daysFromNow(-5),
      },
    });

    await prisma.stakeholder.upsert({
      where: { id: "00000000-0000-4000-8000-000000000754" },
      update: {
        tenantId: tenant.id,
        projectId: pEmbus.id,
        name: "Soporte TI interno",
        role: "Operaciones",
        influence: 6,
        interest: 4,
        observation: null,
      },
      create: {
        id: "00000000-0000-4000-8000-000000000754",
        tenantId: tenant.id,
        projectId: pEmbus.id,
        name: "Soporte TI interno",
        role: "Operaciones",
        influence: 6,
        interest: 4,
        observation: null,
      },
    });

    await upsertEscalation("00000000-0000-4000-8000-000000000806", tenant.id, createdBy, {
      projectId: pEmbus.id,
      topic: "Backoffice",
      tier: "orange",
      title: "Entregable Power BI vencido",
      levelLabel: "Naranja",
      daysAgo: 3,
      indicators: { schedule: "medium", budget: "low", scope: "low" },
      actions: ["Priorizar cierre con BI.", "Comunicar a dirección."],
    });

    await upsertMeeting("00000000-0000-4000-8000-000000000616", tenant.id, createdBy, {
      projectId: pEmbus.id,
      sessionName: "Revisión avance backoffice",
      objective: "informativa",
      totalCost: 8800,
      costLevel: "Bajo",
      costPerMinute: 440,
      totalParticipants: 5,
      durationMinutes: 20,
      diagnosisTitle: "Podría ser async",
      diagnosisText: "Sin decisiones; enviar dashboard por correo.",
      daysAgo: 3,
      participants: { junior: 1, senior: 2, director: 1, tech: 1 },
      roleCosts: ROLE_COSTS,
    });
  }

  const counts = await prisma.tenant.findUnique({
    where: { id: tenant.id },
    select: {
      _count: {
        select: {
          projects: true,
          deliverables: true,
          risks: true,
          stakeholders: true,
          tasks: true,
          escalationChecks: true,
          meetingRoiSessions: true,
        },
      },
    },
  });

  console.log(`Demo cargada en tenant "${tenant.name}" (${slug}).`);
  console.log("Totales en tenant:", counts?._count);
  console.log("Proyectos:");
  for (const p of [pEmbus, pApp, pIntegracion, pTerminales, pCapacitacion].filter(Boolean)) {
    console.log(`  - ${p.name}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
