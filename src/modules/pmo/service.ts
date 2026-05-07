import { db } from "@/lib/db";

export async function getPmoSnapshot(tenantId: string) {
  const [
    projects,
    deliverables,
    risks,
    stakeholders,
    overdueDeliverables,
    criticalRisks,
  ] = await Promise.all([
    db.project.findMany({
      where: { tenantId },
      select: { id: true, name: true, status: true, createdAt: true },
      orderBy: { createdAt: "desc" },
    }),
    db.deliverable.findMany({
      where: { tenantId },
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
      where: { tenantId },
      select: {
        id: true,
        projectId: true,
        title: true,
        residualProb: true,
        impactAmount: true,
      },
    }),
    db.stakeholder.findMany({
      where: { tenantId },
      select: { id: true, projectId: true, name: true, influence: true, interest: true },
    }),
    db.deliverable.findMany({
      where: {
        tenantId,
        dueDate: { lt: new Date() },
        status: { notIn: ["delivered", "approved"] },
      },
      select: { id: true, title: true, dueDate: true, project: { select: { name: true } } },
      orderBy: { dueDate: "asc" },
      take: 8,
    }),
    db.risk.findMany({
      where: { tenantId },
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
    };
  });

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
    },
    overdueDeliverables,
    criticalRiskRows,
    stakeholdersByQuadrant,
    projectHealth,
  };
}
