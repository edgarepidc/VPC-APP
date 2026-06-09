import { db } from "@/lib/db";
import {
  averageLeadTimeDays,
  buildWeeklyDeliverableTrend,
  onTimeDeliveryPct,
  weightedProgressPct,
  type DeliverableMetricRow,
} from "@/lib/deliverable-pmo-utils";
import { buildEscalationTrendsByProject } from "@/lib/escalation-utils";
import { buildMeetingCostTrendsByProject } from "@/lib/meeting-roi-utils";
import {
  findGreenToRedDeteriorations,
  latestEscalationByProject,
  listEscalationChecksByTenant,
} from "@/modules/escalations/service";
import {
  findMeetingCostAlerts,
  latestMeetingRoiByProject,
  listMeetingRoiSessionsByTenant,
} from "@/modules/meeting-roi/service";

export async function getPmoSnapshot(
  tenantId: string,
  options?: { restrictToProjectIds?: string[] },
) {
  const restrict = options?.restrictToProjectIds;
  const projectWhere = {
    tenantId,
    ...(restrict !== undefined ? { id: { in: restrict } } : {}),
  };
  const childWhere = {
    tenantId,
    ...(restrict !== undefined ? { projectId: { in: restrict } } : {}),
  };

  const [
    projects,
    deliverables,
    risks,
    stakeholders,
    overdueDeliverables,
    criticalRisks,
    recentEscalations,
    latestEscalations,
    deteriorationAlerts,
    recentMeetings,
    latestMeetings,
    meetingCostAlerts,
  ] = await Promise.all([
    db.project.findMany({
      where: projectWhere,
      select: { id: true, name: true, status: true, createdAt: true },
      orderBy: { createdAt: "desc" },
    }),
    db.deliverable.findMany({
      where: childWhere,
      select: {
        id: true,
        projectId: true,
        title: true,
        status: true,
        dueDate: true,
        deliveredAt: true,
        createdAt: true,
        weight: true,
        dependsOnId: true,
      },
    }),
    db.risk.findMany({
      where: childWhere,
      select: {
        id: true,
        projectId: true,
        title: true,
        residualProb: true,
        impactAmount: true,
      },
    }),
    db.stakeholder.findMany({
      where: childWhere,
      select: { id: true, projectId: true, name: true, influence: true, interest: true },
    }),
    db.deliverable.findMany({
      where: {
        ...childWhere,
        dueDate: { lt: new Date() },
        status: { notIn: ["delivered", "approved"] },
      },
      select: { id: true, title: true, dueDate: true, project: { select: { name: true } } },
      orderBy: { dueDate: "asc" },
      take: 8,
    }),
    db.risk.findMany({
      where: childWhere,
      select: {
        id: true,
        title: true,
        residualProb: true,
        impactAmount: true,
        ownerName: true,
        project: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
    listEscalationChecksByTenant(tenantId, {
      restrictToProjectIds: restrict,
      limit: 200,
    }),
    latestEscalationByProject(tenantId, { restrictToProjectIds: restrict }),
    findGreenToRedDeteriorations(tenantId, {
      restrictToProjectIds: restrict,
      withinDays: 7,
    }),
    listMeetingRoiSessionsByTenant(tenantId, {
      restrictToProjectIds: restrict,
      limit: 200,
    }),
    latestMeetingRoiByProject(tenantId, { restrictToProjectIds: restrict }),
    findMeetingCostAlerts(tenantId, {
      restrictToProjectIds: restrict,
      withinDays: 7,
    }),
  ]);

  const deliverableMetrics: DeliverableMetricRow[] = deliverables.map((d) => ({
    id: d.id,
    projectId: d.projectId,
    status: d.status,
    weight: d.weight,
    dueDate: d.dueDate,
    deliveredAt: d.deliveredAt,
    createdAt: d.createdAt,
  }));

  const portfolioProgressPct = (() => {
    const byProject = new Map<string, DeliverableMetricRow[]>();
    for (const d of deliverableMetrics) {
      const list = byProject.get(d.projectId) ?? [];
      list.push(d);
      byProject.set(d.projectId, list);
    }
    if (byProject.size === 0) return 0;
    let sumPct = 0;
    for (const [, projectRows] of byProject) {
      sumPct += weightedProgressPct(projectRows);
    }
    return Math.round(sumPct / byProject.size);
  })();

  const deliverableOnTimePct = onTimeDeliveryPct(deliverableMetrics);
  const deliverableAvgLeadDays = averageLeadTimeDays(deliverableMetrics);
  const deliverableWeeklyTrend = buildWeeklyDeliverableTrend(deliverableMetrics);

  const totalResidualVme = risks.reduce(
    (sum, risk) => sum + (risk.residualProb / 100) * risk.impactAmount,
    0,
  );

  const criticalRiskRows = criticalRisks
    .map((risk) => {
      const impactLevel =
        risk.impactAmount <= 10000
          ? 1
          : risk.impactAmount <= 50000
            ? 2
            : risk.impactAmount <= 200000
              ? 3
              : risk.impactAmount <= 1000000
                ? 4
                : 5;
      const probabilityLevel = Math.max(
        1,
        Math.min(5, Math.ceil(risk.residualProb / 20)),
      );
      const residualScore = impactLevel * probabilityLevel;

      return {
        ...risk,
        residualScore,
        residualVme: (risk.residualProb / 100) * risk.impactAmount,
      };
    })
    .filter((risk) => risk.residualScore > 10)
    .sort((a, b) => b.residualScore - a.residualScore)
    .slice(0, 6);

  const stakeholdersByQuadrant = stakeholders.reduce(
    (acc, stakeholder) => {
      if (stakeholder.influence >= 5 && stakeholder.interest < 5) acc.promotores += 1;
      else if (stakeholder.influence >= 5 && stakeholder.interest >= 5) acc.latentes += 1;
      else if (stakeholder.influence < 5 && stakeholder.interest < 5) acc.defensores += 1;
      else acc.espectadores += 1;
      return acc;
    },
    { promotores: 0, latentes: 0, defensores: 0, espectadores: 0 },
  );

  const escalationTrends = buildEscalationTrendsByProject(
    recentEscalations.map((row) => ({
      projectId: row.projectId,
      tier: row.tier,
      createdAt: row.createdAt,
    })),
  );

  const meetingCostTrends = buildMeetingCostTrendsByProject(
    recentMeetings.map((row) => ({
      projectId: row.projectId,
      costLevel: row.costLevel,
      createdAt: row.createdAt,
    })),
  );

  const projectHealth = projects.map((project) => {
    const projectDeliverables = deliverableMetrics.filter((d) => d.projectId === project.id);
    const projectRisks = risks.filter((r) => r.projectId === project.id);
    const donePct = weightedProgressPct(projectDeliverables);
    const latestEscalation = latestEscalations.get(project.id);
    const trend = escalationTrends.get(project.id);
    const latestMeeting = latestMeetings.get(project.id);
    const meetingTrend = meetingCostTrends.get(project.id);

    return {
      id: project.id,
      name: project.name,
      status: project.status,
      deliverables: projectDeliverables.length,
      donePct,
      risks: projectRisks.length,
      latestEscalationTier: latestEscalation?.tier ?? null,
      latestEscalationAt: latestEscalation?.createdAt ?? null,
      escalationTrendTiers: trend?.tiers ?? [],
      escalationTrendDirection: trend?.direction ?? null,
      latestMeetingCostLevel: latestMeeting?.costLevel ?? null,
      latestMeetingCost: latestMeeting?.totalCost ?? null,
      latestMeetingAt: latestMeeting?.createdAt ?? null,
      meetingCostTrendLevels: meetingTrend?.levels ?? [],
      meetingCostTrendDirection: meetingTrend?.direction ?? null,
    };
  });

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const escalationCounts = recentEscalations
    .filter((row) => row.createdAt >= thirtyDaysAgo)
    .reduce(
      (acc, row) => {
        if (row.tier === "red") acc.red += 1;
        else if (row.tier === "orange") acc.orange += 1;
        else acc.green += 1;
        return acc;
      },
      { red: 0, orange: 0, green: 0 },
    );

  const meetingsLast30 = recentMeetings.filter((row) => row.createdAt >= thirtyDaysAgo);
  const meetingCostCounts = meetingsLast30.reduce(
    (acc, row) => {
      if (row.costLevel === "Crítico") acc.critico += 1;
      else if (row.costLevel === "Alto") acc.alto += 1;
      else if (row.costLevel === "Moderado") acc.moderado += 1;
      else acc.bajo += 1;
      return acc;
    },
    { bajo: 0, moderado: 0, alto: 0, critico: 0 },
  );
  const totalMeetingCostMxn = meetingsLast30.reduce((sum, row) => sum + row.totalCost, 0);

  return {
    kpis: {
      projects: projects.length,
      deliverables: deliverables.length,
      risks: risks.length,
      stakeholders: stakeholders.length,
      overdueDeliverables: overdueDeliverables.length,
      criticalRisks: criticalRiskRows.length,
      portfolioProgressPct,
      deliverableOnTimePct,
      deliverableAvgLeadDays,
      totalResidualVme,
      escalationChecks: recentEscalations.filter((r) => r.createdAt >= thirtyDaysAgo).length,
      meetingSessions: meetingsLast30.length,
      totalMeetingCostMxn,
    },
    overdueDeliverables,
    criticalRiskRows,
    stakeholdersByQuadrant,
    projectHealth,
    escalationRadar: {
      rows: recentEscalations.slice(0, 12),
      counts: escalationCounts,
    },
    meetingRoiRadar: {
      rows: recentMeetings.slice(0, 12),
      counts: meetingCostCounts,
      totalCostMxn: totalMeetingCostMxn,
    },
    deteriorationAlerts,
    meetingCostAlerts,
    deliverablesRadar: {
      onTimePct: deliverableOnTimePct,
      avgLeadDays: deliverableAvgLeadDays,
      weeklyTrend: deliverableWeeklyTrend,
      recentClosed: deliverables
        .filter((d) => d.deliveredAt)
        .sort((a, b) => (b.deliveredAt?.getTime() ?? 0) - (a.deliveredAt?.getTime() ?? 0))
        .slice(0, 10)
        .map((d) => ({
          id: d.id,
          title: d.title,
          projectId: d.projectId,
          projectName: projects.find((p) => p.id === d.projectId)?.name ?? "—",
          dueDate: d.dueDate,
          deliveredAt: d.deliveredAt,
          status: d.status,
        })),
    },
  };
}
