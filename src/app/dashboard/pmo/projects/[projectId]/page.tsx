import Link from "next/link";
import { redirect } from "next/navigation";

import { fmtMoneyMxn } from "@/app/dashboard/risks/risk-utils";
import { DashboardPageHeader } from "@/app/dashboard/_components/page-header";
import { EscalationTrendDots } from "@/app/dashboard/pmo/escalation-trend-dots";
import { MeetingCostTrendDots } from "@/app/dashboard/pmo/meeting-cost-trend-dots";
import { getSessionUser } from "@/lib/auth/session";
import {
  DELIVERABLE_DETAIL_IN_PROJECT,
  DELIVERABLES_PROJECT,
  PMO_ESCALATIONS_PROJECT,
  PMO_MEETINGS_PROJECT,
  PMO_PROJECT_DETAIL,
  PMO_PROJECTS,
  RISK_DETAIL_IN_PROJECT,
  RISKS_PROJECT,
  STAKEHOLDERS_PROJECT,
} from "@/lib/dashboard-paths";
import { getEscalationTierBadge } from "@/lib/escalation-utils";
import { getSessionProjectIdsFilter, getProjectHierarchyForSession } from "@/lib/project-scope";
import { resolveProjectFilterIds } from "@/lib/project-hierarchy";
import { requireTenantId } from "@/lib/tenancy";
import { getCostLevelBadge, formatMxn } from "@/lib/meeting-roi-utils";
import { getProjectStatusBadge, getSemaphoreBadge } from "@/lib/ui";
import {
  dashCard,
  dashKpiLabel,
  dashKpiValue,
  dashPage,
  dashSectionTitle,
} from "@/lib/ui-classes";
import { assertCanAccessProject } from "@/modules/memberships/project-access";
import { getPmoSnapshot } from "@/modules/pmo/service";
import { getProjectById, listSubprojectsByInitiative } from "@/modules/projects/service";

export const dynamic = "force-dynamic";

type ProjectDetailPageProps = {
  params: Promise<{ projectId: string }>;
};

export default async function ProjectDetailPage({ params }: ProjectDetailPageProps) {
  const { projectId } = await params;
  const session = await getSessionUser();
  if (!session) redirect("/login");
  const tenantId = await requireTenantId();

  try {
    await assertCanAccessProject({
      tenantId,
      userId: session.userId,
      role: session.role,
      projectId,
      isPlatformVisit: session.isPlatformVisit,
    });
  } catch (e) {
    redirect(
      `/dashboard/pmo/projects?error=${encodeURIComponent((e as Error).message)}`,
    );
  }

  const projectIdsFilter = await getSessionProjectIdsFilter(session, tenantId);
  if (projectIdsFilter !== undefined && !projectIdsFilter.includes(projectId)) {
    redirect("/dashboard/pmo/projects?error=Proyecto+fuera+de+tu+alcance");
  }

  const [project, hierarchy] = await Promise.all([
    getProjectById(tenantId, projectId),
    getProjectHierarchyForSession(session, tenantId),
  ]);

  if (!project) {
    redirect("/dashboard/pmo/projects?error=Proyecto+no+encontrado");
  }

  const isInitiative = !project.parentProjectId;
  const subprojects = isInitiative
    ? await listSubprojectsByInitiative(tenantId, projectId)
    : [];
  const scopeIds = resolveProjectFilterIds(hierarchy.projects, projectId) ?? [projectId];
  const rollupMode = isInitiative && subprojects.length > 0;

  const snapshot = await getPmoSnapshot(tenantId, { restrictToProjectIds: scopeIds });

  const health = rollupMode
    ? null
    : (snapshot.projectHealth.find((h) => h.id === projectId) ?? snapshot.projectHealth[0]);
  const subprojectHealthRows = rollupMode ? snapshot.projectHealth : [];
  const statusBadge = getProjectStatusBadge(project.status);
  const semaphore = health
    ? getSemaphoreBadge(Math.max(0, health.donePct - Math.min(40, health.risks * 8)))
    : getSemaphoreBadge(50);
  const escalationBadge = health?.latestEscalationTier
    ? getEscalationTierBadge(health.latestEscalationTier)
    : null;
  const meetingBadge = health?.latestMeetingCostLevel
    ? getCostLevelBadge(health.latestMeetingCostLevel)
    : null;

  const moduleLinks = [
    { label: "Entregables", href: DELIVERABLES_PROJECT(projectId) },
    { label: "Riesgos", href: RISKS_PROJECT(projectId) },
    { label: "Interesados", href: STAKEHOLDERS_PROJECT(projectId) },
    { label: "Escalamientos", href: PMO_ESCALATIONS_PROJECT(projectId) },
    { label: "Reuniones", href: PMO_MEETINGS_PROJECT(projectId) },
  ] as const;

  return (
    <main className={dashPage}>
      <DashboardPageHeader
        title={project.name}
        description={
          rollupMode
            ? `Iniciativa · ${subprojects.length} subproyecto${subprojects.length !== 1 ? "s" : ""}`
            : project.description?.trim() ||
              (isInitiative ? "Ficha de la iniciativa." : "Ficha del subproyecto.")
        }
      >
        <Link
          href={PMO_PROJECTS}
          className="mt-2 inline-block text-sm font-medium text-slate-700 underline"
        >
          ← Volver a iniciativas
        </Link>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className={statusBadge.className}>{statusBadge.label}</span>
          <span className={semaphore.className}>{semaphore.label}</span>
        </div>
      </DashboardPageHeader>

      <section className="mb-4 grid grid-cols-2 gap-3 rounded-lg border border-slate-200 bg-white px-3 py-3 sm:grid-cols-4 sm:px-4">
        <div>
          <p className={dashKpiLabel}>Avance</p>
          <p className={dashKpiValue}>{health?.donePct ?? snapshot.kpis.portfolioProgressPct}%</p>
        </div>
        <div>
          <p className={dashKpiLabel}>Entregables</p>
          <p className={dashKpiValue}>{snapshot.kpis.deliverables}</p>
          {snapshot.kpis.overdueDeliverables > 0 ? (
            <p className="text-xs text-rose-700">{snapshot.kpis.overdueDeliverables} vencidos</p>
          ) : null}
        </div>
        <div>
          <p className={dashKpiLabel}>Riesgos</p>
          <p className={dashKpiValue}>{snapshot.kpis.risks}</p>
          {snapshot.kpis.criticalRisks > 0 ? (
            <p className="text-xs text-amber-700">{snapshot.kpis.criticalRisks} críticos</p>
          ) : null}
        </div>
        <div>
          <p className={dashKpiLabel}>Exposición residual</p>
          <p className={dashKpiValue}>{fmtMoneyMxn(snapshot.kpis.totalResidualVme)}</p>
        </div>
        <div>
          <p className={dashKpiLabel}>Interesados</p>
          <p className={dashKpiValue}>{snapshot.kpis.stakeholders}</p>
        </div>
        <div>
          <p className={dashKpiLabel}>Escalamiento</p>
          {escalationBadge ? (
            <span className={`${escalationBadge.className} mt-1 inline-block`}>
              {escalationBadge.label}
            </span>
          ) : (
            <p className={dashKpiValue}>—</p>
          )}
        </div>
        <div>
          <p className={dashKpiLabel}>Reuniones (30d)</p>
          <p className={dashKpiValue}>{snapshot.kpis.meetingSessions}</p>
          {meetingBadge ? (
            <span className={`${meetingBadge.className} mt-1 inline-block`}>{meetingBadge.label}</span>
          ) : null}
        </div>
        <div>
          <p className={dashKpiLabel}>Costo reuniones</p>
          <p className={dashKpiValue}>{formatMxn(snapshot.kpis.totalMeetingCostMxn)}</p>
        </div>
      </section>

      {rollupMode ? (
        <section className={`${dashCard} mb-4 p-4`}>
          <h2 className={dashSectionTitle}>Subproyectos</h2>
          <ul className="mt-3 space-y-2">
            {subprojects.map((sub) => {
              const subHealth = subprojectHealthRows.find((h) => h.id === sub.id);
              return (
                <li
                  key={sub.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 p-3"
                >
                  <Link
                    href={PMO_PROJECT_DETAIL(sub.id)}
                    className="font-medium text-slate-900 hover:underline"
                  >
                    {sub.name}
                  </Link>
                  <span className="text-xs text-slate-600">
                    Avance {subHealth?.donePct ?? 0}% · {subHealth?.deliverables ?? 0} entregables ·{" "}
                    {subHealth?.risks ?? 0} riesgos
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      <section className={`${dashCard} mb-4 p-4`}>
        <h2 className={dashSectionTitle}>Acceso rápido</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {moduleLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
            >
              {link.label}
            </Link>
          ))}
        </div>
      </section>

      {health ? (
        <section className={`${dashCard} mb-4 p-4`}>
          <h2 className={dashSectionTitle}>Tendencias</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Escalamiento
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                {escalationBadge ? (
                  <Link href={PMO_ESCALATIONS_PROJECT(projectId)}>
                    <span className={escalationBadge.className}>{escalationBadge.label}</span>
                  </Link>
                ) : (
                  <span className="text-sm text-slate-500">Sin evaluar</span>
                )}
                <EscalationTrendDots
                  tiers={health.escalationTrendTiers}
                  direction={health.escalationTrendDirection}
                />
              </div>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Costo reuniones
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                {meetingBadge ? (
                  <>
                    <Link href={PMO_MEETINGS_PROJECT(projectId)}>
                      <span className={meetingBadge.className}>{meetingBadge.label}</span>
                    </Link>
                    {health.latestMeetingCost != null ? (
                      <span className="text-sm text-slate-600">
                        {formatMxn(health.latestMeetingCost)}
                      </span>
                    ) : null}
                  </>
                ) : (
                  <span className="text-sm text-slate-500">Sin registrar</span>
                )}
                <MeetingCostTrendDots
                  levels={health.meetingCostTrendLevels}
                  direction={health.meetingCostTrendDirection}
                />
              </div>
            </div>
          </div>
        </section>
      ) : null}

      <section className="grid gap-4 lg:grid-cols-2">
        <div className={`${dashCard} p-4`}>
          <h2 className={dashSectionTitle}>Riesgos críticos</h2>
          <ul className="mt-3 space-y-2">
            {snapshot.criticalRiskRows.map((risk) => (
              <li key={risk.id} className="rounded-lg border border-amber-100 bg-amber-50/40 p-3">
                <Link
                  href={RISK_DETAIL_IN_PROJECT(risk.id, projectId)}
                  className="font-medium text-slate-900 hover:underline"
                >
                  {risk.title}
                </Link>
                <p className="text-xs text-slate-600">
                  {risk.ownerName} · score {risk.residualScore}/25
                </p>
              </li>
            ))}
            {snapshot.criticalRiskRows.length === 0 ? (
              <li className="rounded-lg border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500">
                Sin riesgos críticos en este proyecto.
              </li>
            ) : null}
          </ul>
        </div>

        <div className={`${dashCard} p-4`}>
          <h2 className={dashSectionTitle}>Entregables vencidos</h2>
          <ul className="mt-3 space-y-2">
            {snapshot.overdueDeliverables.map((deliverable) => (
              <li key={deliverable.id} className="rounded-lg border border-rose-100 bg-rose-50/40 p-3">
                <Link
                  href={DELIVERABLE_DETAIL_IN_PROJECT(deliverable.id, projectId)}
                  className="font-medium text-slate-900 hover:underline"
                >
                  {deliverable.title}
                </Link>
                <p className="text-xs text-slate-600">
                  Vencía: {deliverable.dueDate?.toLocaleDateString("es-MX")}
                </p>
              </li>
            ))}
            {snapshot.overdueDeliverables.length === 0 ? (
              <li className="rounded-lg border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500">
                Sin entregables vencidos.
              </li>
            ) : null}
          </ul>
        </div>
      </section>

      {snapshot.stakeholderAlerts.length > 0 ? (
        <section className={`${dashCard} mt-4 p-4`}>
          <h2 className={dashSectionTitle}>Alertas de interesados</h2>
          <ul className="mt-3 space-y-2">
            {snapshot.stakeholderAlerts.map((alert) => (
              <li key={`${alert.kind}-${alert.projectId}`} className="rounded-lg border border-slate-200 p-3 text-sm">
                <p className="font-medium text-slate-900">{alert.label}</p>
                <p className="text-xs text-slate-600">{alert.sublabel}</p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </main>
  );
}
