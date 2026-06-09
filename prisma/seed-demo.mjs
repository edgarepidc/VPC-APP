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
  return prisma.project.upsert({
    where: { id },
    update: { tenantId, createdBy, ...data },
    create: { id, tenantId, createdBy, ...data },
  });
}

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

  const pEmbus = existingProjects.find((p) => p.name === "EMBUS") ?? existingProjects[0] ?? null;

  // --- Entregables proyecto App ---
  const dMatriz = await prisma.deliverable.upsert({
    where: { id: "00000000-0000-4000-8000-000000000201" },
    update: {
      tenantId: tenant.id,
      projectId: pApp.id,
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
      projectId: pApp.id,
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
      projectId: pApp.id,
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
      projectId: pApp.id,
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
      projectId: pApp.id,
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
      projectId: pApp.id,
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
      projectId: pApp.id,
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
      projectId: pApp.id,
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
      projectId: pIntegracion.id,
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
      projectId: pIntegracion.id,
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
      projectId: pIntegracion.id,
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
      projectId: pIntegracion.id,
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
      projectId: pIntegracion.id,
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
      projectId: pIntegracion.id,
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
      projectId: pApp.id,
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
      projectId: pApp.id,
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
      projectId: pApp.id,
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
      projectId: pApp.id,
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
      projectId: pIntegracion.id,
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
      projectId: pIntegracion.id,
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
      projectId: pIntegracion.id,
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
      projectId: pIntegracion.id,
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
      projectId: pApp.id,
      name: "Dirección Mobility ADO",
      role: "Patrocinador",
      influence: 9,
      interest: 8,
      observation: "Prioriza time-to-market del MVP en Q3.",
    },
    {
      id: "00000000-0000-4000-8000-000000000402",
      projectId: pApp.id,
      name: "Operaciones campo",
      role: "Usuario clave",
      influence: 7,
      interest: 9,
      observation: "Impacto directo en rutas diarias y capacitación.",
    },
    {
      id: "00000000-0000-4000-8000-000000000403",
      projectId: pApp.id,
      name: "Marketing digital",
      role: "Comunicación",
      influence: 6,
      interest: 4,
      observation: null,
    },
    {
      id: "00000000-0000-4000-8000-000000000404",
      projectId: pIntegracion.id,
      name: "TI Corporativo",
      role: "Integración",
      influence: 8,
      interest: 6,
      observation: "Dueño del ERP y políticas de seguridad.",
    },
    {
      id: "00000000-0000-4000-8000-000000000405",
      projectId: pIntegracion.id,
      name: "Proveedor telemetría",
      role: "Externo",
      influence: 5,
      interest: 7,
      observation: "SLA 99.5% en contrato marco.",
    },
    {
      id: "00000000-0000-4000-8000-000000000406",
      projectId: pIntegracion.id,
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
      projectId: pApp.id,
      title: "Workshop kickoff con stakeholders",
      status: "in_progress",
    },
    {
      id: "00000000-0000-4000-8000-000000000102",
      projectId: pApp.id,
      title: "Validar flujos de pago con legal",
      status: "todo",
    },
    {
      id: "00000000-0000-4000-8000-000000000103",
      projectId: pIntegracion.id,
      title: "Mapeo de interfaces API SAP",
      status: "in_progress",
    },
    {
      id: "00000000-0000-4000-8000-000000000104",
      projectId: pIntegracion.id,
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
      projectId: pApp.id,
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
      projectId: pApp.id,
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
      projectId: pIntegracion.id,
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
      projectId: pIntegracion.id,
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
      projectId: pApp.id,
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
      projectId: pApp.id,
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
      projectId: pIntegracion.id,
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
      projectId: pIntegracion.id,
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
  console.log("Proyectos demo nuevos:");
  console.log(`  - ${pApp.name}`);
  console.log(`  - ${pIntegracion.name}`);
  if (pEmbus) console.log(`  - ${pEmbus.name} (enriquecido)`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
