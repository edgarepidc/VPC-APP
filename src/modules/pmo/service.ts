import { db } from "@/lib/db";
import { buildEscalationTrendsByProject } from "@/lib/escalation-utils";
import {
  findGreenToRedDeteriorations,
  latestEscalationByProject,
  listEscalationChecksByTenant,
} from "@/modules/escalations/service";

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
        weight: true,
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
  ]);

  const delivered = deliverables.filter((d) =>
    ["delivered", "approved"].includes(d.status),
  );
  const weightedDone = delivered.reduce((sum, d) => sum + d.weight, 0);
  const weightedTotal = deliverables.reduce((sum, d) => sum + d.weight, 0);
  const portfolioProgressPct =
    weightedTotal > 0 ? Math.round((weightedDone / weightedTotal) * 100) : 0;

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

  const projectHealth = projects.map((project) => {
    const projectDeliverables = deliverables.filter((d) => d.projectId === project.id);
    const projectRisks = risks.filter((r) => r.projectId === project.id);
    const doneCount = projectDeliverables.filter((d) =>
      ["delivered", "approved"].includes(d.status),
    ).length;
    const latestEscalation = latestEscalations.get(project.id);
    const trend = escalationTrends.get(project.id);

    return {
      id: project.id,
      name: project.name,
      status: project.status,
      deliverables: projectDeliverables.length,
      donePct:
        projectDeliverables.length > 0
          ? Math.round((doneCount / projectDeliverables.length) * 100)
          : 0,
      risks: projectRisks.length,
      latestEscalationTier: latestEscalation?.tier ?? null,
      latestEscalationAt: latestEscalation?.createdAt ?? null,
      escalationTrendTiers: trend?.tiers ?? [],
      escalationTrendDirection: trend?.direction ?? null,
    };
  });

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const escalationTrends = buildEscalationTrendsByProject(
    recentEscalations.map((row) => ({
      projectId: row.projectId,
      tier: row.tier,
      createdAt: row.createdAt,
    })),
  );
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

  return {
    kpis: {
      projects: projects.length,
      deliverables: deliverables.length,
      risks: risks.length,
      stakeholders: stakeholders.length,
      overdueDeliverables: overdueDeliverables.length,
      criticalRisks: criticalRiskRows.length,
      portfolioProgressPct,
      totalResidualVme,
      escalationChecks: recentEscalations.filter((r) => r.createdAt >= thirtyDaysAgo).length,
    },
    overdueDeliverables,
    criticalRiskRows,
    stakeholdersByQuadrant,
    projectHealth,
    escalationRadar: {
      rows: recentEscalations.slice(0, 12),
      counts: escalationCounts,
    },
    deteriorationAlerts,
  };
}
