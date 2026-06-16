/**
 * Datos de demostración MobilityDEMO — transporte de autobuses + proyectos tecnológicos.
 * Dataset ligero para presentación ejecutiva (no saturado).
 *
 *   npm run prisma:demo-fresh
 *   DATABASE_URL=... DEMO_TENANT_SLUG=mobility-demo npm run prisma:seed-demo
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const slug = (process.env.DEMO_TENANT_SLUG ?? "mobility-demo").trim().toLowerCase();

const daysFromNow = (days) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(12, 0, 0, 0);
  return d;
};

const ROLE_COSTS = { junior: 350, senior: 650, director: 1200, tech: 800 };

const IDS = {
  initDigital: "00000000-0000-4000-8000-000000000001",
  initFlota: "00000000-0000-4000-8000-000000000002",
  initTerminales: "00000000-0000-4000-8000-000000000003",
  spApp: "00000000-0000-4000-8010-000000000001",
  spPagos: "00000000-0000-4000-8010-000000000002",
  spTelemetria: "00000000-0000-4000-8010-000000000003",
  spPos: "00000000-0000-4000-8010-000000000004",
  labelCritico: "00000000-0000-4000-8020-000000000001",
  labelGoLive: "00000000-0000-4000-8020-000000000002",
  labelOps: "00000000-0000-4000-8020-000000000003",
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
  const payload = {
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
  };
  await prisma.escalationCheck.upsert({
    where: { id },
    update: payload,
    create: { id, ...payload },
  });
}

async function upsertMeeting(id, tenantId, createdBy, row) {
  const createdAt = daysFromNow(-row.daysAgo);
  const payload = {
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
  };
  await prisma.meetingRoiSession.upsert({
    where: { id },
    update: payload,
    create: { id, ...payload },
  });
}

async function main() {
  const tenant = await prisma.tenant.findUnique({
    where: { slug },
    select: { id: true, name: true },
  });
  if (!tenant) {
    console.error(`No existe tenant con slug "${slug}". Ejecuta npm run prisma:reset-demo primero.`);
    process.exit(1);
  }

  const membership = await prisma.membership.findFirst({
    where: { tenantId: tenant.id, status: "active" },
    select: { userId: true },
    orderBy: { id: "asc" },
  });
  if (!membership) {
    console.error("El tenant no tiene miembros activos.");
    process.exit(1);
  }
  const createdBy = membership.userId;

  // --- Iniciativas ---
  const initDigital = await upsertProject(IDS.initDigital, tenant.id, createdBy, {
    name: "Experiencia digital del pasajero",
    description: "App, reservas y autoservicio para viajeros de línea.",
    status: "active",
    sortOrder: 1,
  });

  const initFlota = await upsertProject(IDS.initFlota, tenant.id, createdBy, {
    name: "Flota conectada",
    description: "Telemetría, GPS y tableros de operación en tiempo real.",
    status: "active",
    sortOrder: 2,
  });

  const initTerminales = await upsertProject(IDS.initTerminales, tenant.id, createdBy, {
    name: "Terminales y venta en ruta",
    description: "POS, pantallas y conectividad en terminales piloto.",
    status: "active",
    sortOrder: 3,
  });

  // --- Subproyectos ---
  const spApp = await upsertProject(IDS.spApp, tenant.id, createdBy, {
    name: "App móvil Mobility",
    description: "Reservas, boletos digitales y seguimiento de viaje.",
    status: "active",
    parentProjectId: initDigital.id,
    sortOrder: 1,
  });

  const spPagos = await upsertProject(IDS.spPagos, tenant.id, createdBy, {
    name: "Pagos y facturación",
    description: "Pasarela, conciliación y cumplimiento fiscal.",
    status: "active",
    parentProjectId: initDigital.id,
    sortOrder: 2,
  });

  const spTelemetria = await upsertProject(IDS.spTelemetria, tenant.id, createdBy, {
    name: "Telemetría GPS",
    description: "Datos de flota, alertas y KPIs operativos.",
    status: "active",
    parentProjectId: initFlota.id,
    sortOrder: 1,
  });

  const spPos = await upsertProject(IDS.spPos, tenant.id, createdBy, {
    name: "Modernización POS",
    description: "Despliegue de terminales de venta en 12 estaciones piloto.",
    status: "active",
    parentProjectId: initTerminales.id,
    sortOrder: 1,
  });

  // --- Etiquetas de tareas ---
  await prisma.taskLabel.upsert({
    where: { tenantId_name: { tenantId: tenant.id, name: "Crítico" } },
    update: { colorKey: "rose" },
    create: { id: IDS.labelCritico, tenantId: tenant.id, name: "Crítico", colorKey: "rose" },
  });
  await prisma.taskLabel.upsert({
    where: { tenantId_name: { tenantId: tenant.id, name: "Go-live" } },
    update: { colorKey: "amber" },
    create: { id: IDS.labelGoLive, tenantId: tenant.id, name: "Go-live", colorKey: "amber" },
  });
  await prisma.taskLabel.upsert({
    where: { tenantId_name: { tenantId: tenant.id, name: "Operaciones" } },
    update: { colorKey: "sky" },
    create: { id: IDS.labelOps, tenantId: tenant.id, name: "Operaciones", colorKey: "sky" },
  });

  // --- Entregables (9) ---
  const deliverables = [
    {
      id: "00000000-0000-4000-8000-000000000201",
      projectId: spApp.id,
      title: "Matriz de interesados go-live",
      cell: "PMO",
      ownerName: "Ana Ruiz",
      clientName: "Dirección Mobility",
      status: "review",
      weight: 25,
      dueDate: daysFromNow(10),
    },
    {
      id: "00000000-0000-4000-8000-000000000202",
      projectId: spApp.id,
      title: "Prototipo reservas y check-in",
      cell: "UX",
      ownerName: "Carlos Méndez",
      status: "pending",
      weight: 30,
      dueDate: daysFromNow(-4),
      description: "Flujo de compra y código QR en terminal.",
    },
    {
      id: "00000000-0000-4000-8000-000000000203",
      projectId: spApp.id,
      title: "Plan UAT con operadores",
      cell: "QA",
      ownerName: "Ana Ruiz",
      status: "approved",
      weight: 20,
      deliveredAt: daysFromNow(-8),
    },
    {
      id: "00000000-0000-4000-8000-000000000204",
      projectId: spPagos.id,
      title: "Integración pasarela de pagos",
      cell: "Desarrollo",
      ownerName: "Laura Vega",
      status: "review",
      weight: 40,
      dueDate: daysFromNow(7),
    },
    {
      id: "00000000-0000-4000-8000-000000000205",
      projectId: spTelemetria.id,
      title: "Dashboard ocupación y puntualidad",
      cell: "BI",
      ownerName: "Roberto Sánchez",
      status: "delivered",
      weight: 35,
      deliveredAt: daysFromNow(-3),
    },
    {
      id: "00000000-0000-4000-8000-000000000206",
      projectId: spTelemetria.id,
      title: "Contrato API telemetría",
      cell: "TI",
      ownerName: "Roberto Sánchez",
      status: "pending",
      weight: 30,
      dueDate: daysFromNow(-2),
    },
    {
      id: "00000000-0000-4000-8000-000000000207",
      projectId: spPos.id,
      title: "Inventario hardware terminales",
      cell: "Infra",
      ownerName: "Miguel Torres",
      status: "approved",
      weight: 25,
      deliveredAt: daysFromNow(-10),
    },
    {
      id: "00000000-0000-4000-8000-000000000208",
      projectId: spPos.id,
      title: "Instalación POS estación central",
      cell: "Despliegue",
      ownerName: "Miguel Torres",
      status: "pending",
      weight: 40,
      dueDate: daysFromNow(-6),
    },
    {
      id: "00000000-0000-4000-8000-000000000209",
      projectId: spPos.id,
      title: "Capacitación taquilleros",
      cell: "Operaciones",
      ownerName: "Sofía Herrera",
      status: "pending",
      weight: 35,
      dueDate: daysFromNow(14),
    },
  ];

  for (const row of deliverables) {
    const { id, ...data } = row;
    await prisma.deliverable.upsert({
      where: { id },
      update: { tenantId: tenant.id, ...data },
      create: { id, tenantId: tenant.id, ...data },
    });
  }

  const dMatriz = deliverables[0];
  const dApi = deliverables[5];

  // --- Riesgos (5) ---
  const risks = [
    {
      id: "00000000-0000-4000-8000-000000000301",
      projectId: spApp.id,
      deliverableId: dMatriz.id,
      title: "Baja disponibilidad de operadores en UAT",
      category: "Operativo",
      ownerName: "Ana Ruiz",
      probability: 45,
      residualProb: 25,
      impactAmount: 750000,
      mitigation: "Turnos dedicados en terminales piloto los fines de semana.",
      trigger: "Dos ciclos UAT sin validación de taquilla.",
      dueDate: daysFromNow(25),
    },
    {
      id: "00000000-0000-4000-8000-000000000302",
      projectId: spApp.id,
      title: "Rechazo en tiendas por políticas de pagos",
      category: "Regulatorio",
      ownerName: "Carlos Méndez",
      probability: 30,
      residualProb: 15,
      impactAmount: 1100000,
      mitigation: "Revisión legal previa al envío a revisión.",
      contingency: "Lanzamiento web mientras se corrige el bundle móvil.",
      dueDate: daysFromNow(12),
    },
    {
      id: "00000000-0000-4000-8000-000000000303",
      projectId: spTelemetria.id,
      deliverableId: dApi.id,
      title: "Latencia GPS en corredor montañoso",
      category: "Técnico",
      ownerName: "Roberto Sánchez",
      probability: 55,
      residualProb: 35,
      impactAmount: 480000,
      mitigation: "Cache en gateway regional y modo offline en unidades.",
      dueDate: daysFromNow(30),
    },
    {
      id: "00000000-0000-4000-8000-000000000304",
      projectId: spPos.id,
      title: "Incompatibilidad firmware POS con impresoras",
      category: "Técnico",
      ownerName: "Miguel Torres",
      probability: 50,
      residualProb: 40,
      impactAmount: 620000,
      mitigation: "Matriz de compatibilidad validada en banco de pruebas.",
      dueDate: daysFromNow(-5),
    },
    {
      id: "00000000-0000-4000-8000-000000000305",
      projectId: spPagos.id,
      title: "Ventana de cambio bancario no disponible",
      category: "Operativo",
      ownerName: "Laura Vega",
      probability: 35,
      residualProb: 20,
      impactAmount: 290000,
      mitigation: "Coordinación con finanzas y fecha de respaldo acordada.",
      dueDate: daysFromNow(18),
    },
  ];

  for (const row of risks) {
    await prisma.risk.upsert({
      where: { id: row.id },
      update: { tenantId: tenant.id, status: "open", ...row },
      create: { tenantId: tenant.id, status: "open", ...row },
    });
  }

  // --- Interesados (8) — incluye promotor sin nota para alerta PMO ---
  const stakeholders = [
    {
      id: "00000000-0000-4000-8000-000000000401",
      projectId: spApp.id,
      name: "Dirección Mobility",
      role: "Patrocinador",
      influence: 9,
      interest: 7,
      observation: "Prioriza go-live regional en Q3.",
    },
    {
      id: "00000000-0000-4000-8000-000000000402",
      projectId: spApp.id,
      name: "Operaciones de línea",
      role: "Usuario clave",
      influence: 8,
      interest: 9,
      observation: "Valida flujos en terminales y a bordo.",
    },
    {
      id: "00000000-0000-4000-8000-000000000403",
      projectId: spApp.id,
      name: "Atención a pasajeros",
      role: "Call center",
      influence: 4,
      interest: 8,
      observation: null,
    },
    {
      id: "00000000-0000-4000-8000-000000000404",
      projectId: spTelemetria.id,
      name: "Centro de control de flota",
      role: "Operaciones",
      influence: 7,
      interest: 8,
      observation: "Consume tableros de puntualidad cada turno.",
    },
    {
      id: "00000000-0000-4000-8000-000000000405",
      projectId: spTelemetria.id,
      name: "TI corporativo",
      role: "Integración",
      influence: 8,
      interest: 5,
      observation: null,
    },
    {
      id: "00000000-0000-4000-8000-000000000406",
      projectId: spPos.id,
      name: "Gerencia de terminales",
      role: "Operaciones",
      influence: 7,
      interest: 6,
      observation: "Dueña del despliegue POS en estaciones piloto.",
    },
    {
      id: "00000000-0000-4000-8000-000000000407",
      projectId: spPagos.id,
      name: "Finanzas",
      role: "Control",
      influence: 7,
      interest: 3,
      observation: "Requiere conciliación diaria de ventas.",
    },
    {
      id: "00000000-0000-4000-8000-000000000408",
      projectId: spPagos.id,
      name: "Proveedor de pagos",
      role: "Externo",
      influence: 5,
      interest: 6,
      observation: "SLA de certificación PCI en curso.",
    },
  ];

  for (const row of stakeholders) {
    await prisma.stakeholder.upsert({
      where: { id: row.id },
      update: { tenantId: tenant.id, ...row },
      create: { tenantId: tenant.id, ...row },
    });
  }

  // --- Tareas (6) ---
  const tasks = [
    {
      id: "00000000-0000-4000-8000-000000000101",
      projectId: spApp.id,
      title: "Workshop kickoff con operaciones",
      status: "in_progress",
      priority: "high",
      labelIds: [IDS.labelGoLive],
      checklist: [
        { id: "c1", text: "Agenda enviada", done: true },
        { id: "c2", text: "Asistentes confirmados", done: false },
      ],
    },
    {
      id: "00000000-0000-4000-8000-000000000102",
      projectId: spApp.id,
      title: "Validar flujo QR con legal",
      status: "todo",
      priority: "medium",
      labelIds: [IDS.labelCritico],
      checklist: [],
    },
    {
      id: "00000000-0000-4000-8000-000000000103",
      projectId: spTelemetria.id,
      title: "Prueba de carga 500 unidades",
      status: "in_progress",
      priority: "high",
      labelIds: [IDS.labelOps],
      checklist: [{ id: "c1", text: "Ambiente staging listo", done: true }],
    },
    {
      id: "00000000-0000-4000-8000-000000000104",
      projectId: spPos.id,
      title: "Coordinar instalación estación central",
      status: "todo",
      priority: "high",
      labelIds: [IDS.labelGoLive, IDS.labelOps],
      checklist: [],
    },
    {
      id: "00000000-0000-4000-8000-000000000105",
      projectId: spPagos.id,
      title: "Certificación PCI fase 1",
      status: "in_progress",
      priority: "medium",
      labelIds: [],
      checklist: [],
    },
    {
      id: "00000000-0000-4000-8000-000000000106",
      projectId: spPos.id,
      title: "Manual rápido para taquilleros",
      status: "done",
      priority: "low",
      labelIds: [IDS.labelOps],
      checklist: [
        { id: "c1", text: "Borrador", done: true },
        { id: "c2", text: "Revisión operaciones", done: true },
      ],
    },
  ];

  for (const row of tasks) {
    await prisma.task.upsert({
      where: { id: row.id },
      update: { tenantId: tenant.id, ...row },
      create: { tenantId: tenant.id, ...row },
    });
  }

  // --- Escalamientos (6) — incluye deterioro verde → rojo en telemetría ---
  const escalations = [
    {
      id: "00000000-0000-4000-8000-000000000501",
      projectId: spApp.id,
      topic: "Go-live app",
      tier: "green",
      title: "Ritmo de entregables estable",
      levelLabel: "Verde — bajo riesgo",
      daysAgo: 18,
      indicators: { schedule: "low", budget: "low", scope: "medium", team: "low" },
      actions: ["Mantener comité semanal.", "Publicar avance en tablero PMO."],
    },
    {
      id: "00000000-0000-4000-8000-000000000502",
      projectId: spApp.id,
      topic: "UAT operadores",
      tier: "orange",
      title: "Retraso en validación en terminal",
      levelLabel: "Naranja — atención",
      daysAgo: 5,
      indicators: { schedule: "medium", budget: "low", scope: "medium", team: "medium" },
      actions: ["Refuerzo de turnos en fin de semana.", "Escalar a gerencia de terminales."],
    },
    {
      id: "00000000-0000-4000-8000-000000000503",
      projectId: spTelemetria.id,
      topic: "Integración GPS",
      tier: "green",
      title: "Pruebas iniciales satisfactorias",
      levelLabel: "Verde",
      daysAgo: 12,
      indicators: { schedule: "low", budget: "low", scope: "low", team: "low" },
      actions: ["Continuar piloto en corredor norte."],
    },
    {
      id: "00000000-0000-4000-8000-000000000504",
      projectId: spTelemetria.id,
      topic: "Integración GPS",
      tier: "red",
      title: "Bloqueo de firewall en APIs",
      levelLabel: "Rojo — escalamiento",
      daysAgo: 2,
      indicators: { schedule: "high", budget: "medium", scope: "high", team: "medium" },
      actions: ["Comité con TI corporativo.", "Ambiente alterno temporal."],
    },
    {
      id: "00000000-0000-4000-8000-000000000505",
      projectId: spPos.id,
      topic: "Despliegue POS",
      tier: "orange",
      title: "Instalación con retraso",
      levelLabel: "Naranja",
      daysAgo: 4,
      indicators: { schedule: "medium", budget: "low", scope: "medium", team: "low" },
      actions: ["Cuadrilla adicional fin de semana."],
    },
    {
      id: "00000000-0000-4000-8000-000000000506",
      projectId: spPagos.id,
      topic: "Certificación PCI",
      tier: "green",
      title: "Avance según plan",
      levelLabel: "Verde",
      daysAgo: 9,
      indicators: { schedule: "low", budget: "low", scope: "low", team: "low" },
      actions: ["Mantener cronograma con finanzas."],
    },
  ];

  for (const row of escalations) {
    await upsertEscalation(row.id, tenant.id, createdBy, row);
  }

  // --- Reuniones ROI (4) ---
  const meetings = [
    {
      id: "00000000-0000-4000-8000-000000000601",
      projectId: spApp.id,
      sessionName: "Comité semanal MVP",
      objective: "decision",
      totalCost: 16800,
      costLevel: "Moderado",
      costPerMinute: 840,
      totalParticipants: 7,
      durationMinutes: 20,
      diagnosisTitle: "Agenda enfocada",
      diagnosisText: "Tres decisiones cerradas; duración adecuada.",
      daysAgo: 4,
      participants: { junior: 1, senior: 3, director: 2, tech: 1 },
      roleCosts: ROLE_COSTS,
    },
    {
      id: "00000000-0000-4000-8000-000000000602",
      projectId: spTelemetria.id,
      sessionName: "War room firewall APIs",
      objective: "crisis",
      totalCost: 39600,
      costLevel: "Crítico",
      costPerMinute: 1320,
      totalParticipants: 9,
      durationMinutes: 30,
      diagnosisTitle: "Sobreconvocatoria",
      diagnosisText: "Tres directores sin decisión documentada; costo elevado.",
      daysAgo: 1,
      participants: { junior: 0, senior: 3, director: 4, tech: 2 },
      roleCosts: ROLE_COSTS,
    },
    {
      id: "00000000-0000-4000-8000-000000000603",
      projectId: spPos.id,
      sessionName: "Sync instalación POS",
      objective: "informativa",
      totalCost: 7200,
      costLevel: "Bajo",
      costPerMinute: 360,
      totalParticipants: 5,
      durationMinutes: 20,
      diagnosisTitle: "Podría ser async",
      diagnosisText: "Status sin bloqueos; enviar reporte por correo.",
      daysAgo: 6,
      participants: { junior: 2, senior: 2, director: 0, tech: 1 },
      roleCosts: ROLE_COSTS,
    },
    {
      id: "00000000-0000-4000-8000-000000000604",
      projectId: spPagos.id,
      sessionName: "Revisión PCI con finanzas",
      objective: "tecnica",
      totalCost: 9800,
      costLevel: "Bajo",
      costPerMinute: 490,
      totalParticipants: 4,
      durationMinutes: 20,
      diagnosisTitle: "Sesión eficiente",
      diagnosisText: "Participantes correctos y entregable claro.",
      daysAgo: 10,
      participants: { junior: 0, senior: 2, director: 1, tech: 1 },
      roleCosts: ROLE_COSTS,
    },
  ];

  for (const row of meetings) {
    await upsertMeeting(row.id, tenant.id, createdBy, row);
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
          taskLabels: true,
        },
      },
    },
  });

  console.log(`MobilityDEMO cargado en "${tenant.name}" (${slug}).`);
  console.log("Totales:", counts?._count);
  console.log("Iniciativas:");
  for (const p of [initDigital, initFlota, initTerminales]) {
    console.log(`  · ${p.name}`);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
