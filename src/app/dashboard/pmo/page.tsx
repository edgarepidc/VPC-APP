import { redirect } from "next/navigation";

import { DashboardPageHeader } from "@/app/dashboard/_components/page-header";
import {
  dashCard,
  dashKpiLabel,
  dashKpiValue,
  dashPage,
} from "@/lib/ui-classes";
import { getSessionUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/rbac";
import { getSessionProjectIdsFilter } from "@/lib/project-scope";
import { requireTenantId } from "@/lib/tenancy";
import { serializeEscalationChecks } from "@/lib/escalation-serialize";
import { serializeMeetingRoiSessions } from "@/lib/meeting-roi-utils";
import { getPmoSnapshot } from "@/modules/pmo/service";
import { EscalationRadarClient } from "./escalation-radar-client";
import { EscalationDeteriorationAlerts } from "./escalation-deterioration-alerts";
import { MeetingCostAlerts } from "./meeting-cost-alerts";
import { MeetingRoiRadarClient } from "./meeting-roi-radar-client";
import { ProjectHealthPanel } from "./project-health-panel";

function money(value: number) {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function mxn(value: number) {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    maximumFractionDigits: 0,
  }).format(value);
}

export default async function PmoPage() {
  const session = await getSessionUser();
  if (!session) redirect("/login");
  const tenantId = await requireTenantId();
  const canCreateRisk = hasPermission(session.role, "tasks.write");

  const projectIdsFilter = await getSessionProjectIdsFilter(session, tenantId);
  const snapshot = await getPmoSnapshot(tenantId, {
    restrictToProjectIds: projectIdsFilter,
  });

  const radarRows = serializeEscalationChecks(snapshot.escalationRadar.rows);
  const meetingRows = serializeMeetingRoiSessions(snapshot.meetingRoiRadar.rows);
  const deteriorationAlerts = snapshot.deteriorationAlerts.map((a) => ({
    projectId: a.projectId,
    projectName: a.projectName,
    previousAt: a.previousAt.toISOString(),
    currentAt: a.currentAt.toISOString(),
    topic: a.topic,
    title: a.title,
  }));
  const meetingCostAlerts = snapshot.meetingCostAlerts.map((a) => ({
    projectId: a.projectId,
    projectName: a.projectName,
    sessionName: a.sessionName,
    costLevel: a.costLevel,
    totalCost: a.totalCost,
    diagnosisTitle: a.diagnosisTitle,
    createdAt: a.createdAt.toISOString(),
    alertType: a.alertType,
  }));

  return (
    <main className={dashPage}>
      <DashboardPageHeader
        title="PMO"
        description="Resumen ejecutivo de la organización: proyectos, entregables, riesgos y equipo."
      />

      <section className="grid grid-cols-2 gap-3 rounded-lg border border-slate-200 bg-white px-3 py-3 text-sm sm:flex sm:flex-wrap sm:gap-6 sm:px-4">
        <div>
          <p className={dashKpiLabel}>Proyectos</p>
          <p className={dashKpiValue}>{snapshot.kpis.projects}</p>
        </div>
        <div>
          <p className={dashKpiLabel}>Entregables</p>
          <p className={dashKpiValue}>{snapshot.kpis.deliverables}</p>
          <p className="text-xs text-slate-500">{snapshot.kpis.overdueDeliverables} vencidos</p>
        </div>
        <div>
          <p className={dashKpiLabel}>Riesgos</p>
          <p className={dashKpiValue}>{snapshot.kpis.risks}</p>
          <p className="text-xs text-slate-500">{snapshot.kpis.criticalRisks} críticos</p>
        </div>
        <div>
          <p className={dashKpiLabel}>Exposición residual</p>
          <p className={dashKpiValue}>{money(snapshot.kpis.totalResidualVme)}</p>
        </div>
        <div>
          <p className={dashKpiLabel}>Escalamientos</p>
          <p className={dashKpiValue}>{snapshot.kpis.escalationChecks}</p>
          <p className="text-xs text-slate-500">últimos 30 días</p>
        </div>
        <div>
          <p className={dashKpiLabel}>Reuniones</p>
          <p className={dashKpiValue}>{snapshot.kpis.meetingSessions}</p>
          <p className="text-xs text-slate-500">{mxn(snapshot.kpis.totalMeetingCostMxn)} · 30 días</p>
        </div>
      </section>

      <EscalationDeteriorationAlerts alerts={deteriorationAlerts} />
      <MeetingCostAlerts alerts={meetingCostAlerts} />

      <EscalationRadarClient
        rows={radarRows}
        counts={snapshot.escalationRadar.counts}
        canCreateRisk={canCreateRisk}
      />

      <MeetingRoiRadarClient
        rows={meetingRows}
        counts={snapshot.meetingRoiRadar.counts}
        totalCostMxn={snapshot.meetingRoiRadar.totalCostMxn}
      />

      <section className="grid gap-4 lg:grid-cols-3">
        <ProjectHealthPanel
          rows={snapshot.projectHealth}
          portfolioProgressPct={snapshot.kpis.portfolioProgressPct}
        />

        <div className={`${dashCard} p-4`}>
          <h2 className="text-base font-semibold text-slate-900">Stakeholders</h2>
          <div className="mt-3 space-y-2 text-sm">
            {(
              [
                ["Promotores", snapshot.stakeholdersByQuadrant.promotores],
                ["Latentes", snapshot.stakeholdersByQuadrant.latentes],
                ["Defensores", snapshot.stakeholdersByQuadrant.defensores],
                ["Espectadores", snapshot.stakeholdersByQuadrant.espectadores],
              ] as const
            ).map(([label, n]) => (
              <div
                key={label}
                className="flex justify-between rounded-lg border border-slate-200 px-3 py-2"
              >
                <span className="text-slate-600">{label}</span>
                <span className="font-semibold text-slate-900">{n}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className={`${dashCard} p-4`}>
          <h2 className="text-base font-semibold text-slate-900">Riesgos críticos</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {snapshot.criticalRiskRows.map((risk) => (
              <li key={risk.id} className="rounded-lg border border-slate-200 p-3">
                <p className="font-medium text-slate-900">{risk.title}</p>
                <p className="text-slate-600">
                  {risk.project.name} · {risk.ownerName} · {risk.residualScore}/25
                </p>
                <p className="text-xs text-slate-500">VME: {money(risk.residualVme)}</p>
              </li>
            ))}
            {snapshot.criticalRiskRows.length === 0 && (
              <li className="rounded-lg border border-slate-200 p-3 text-slate-500">
                Sin riesgos críticos.
              </li>
            )}
          </ul>
        </div>

        <div className={`${dashCard} p-4`}>
          <h2 className="text-base font-semibold text-slate-900">Entregables vencidos</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {snapshot.overdueDeliverables.map((deliverable) => (
              <li key={deliverable.id} className="rounded-lg border border-slate-200 p-3">
                <p className="font-medium text-slate-900">{deliverable.title}</p>
                <p className="text-slate-600">{deliverable.project.name}</p>
                <p className="text-xs text-slate-500">
                  Vencía: {deliverable.dueDate?.toLocaleDateString("es-MX")}
                </p>
              </li>
            ))}
            {snapshot.overdueDeliverables.length === 0 && (
              <li className="rounded-lg border border-slate-200 p-3 text-slate-500">
                Sin entregables vencidos.
              </li>
            )}
          </ul>
        </div>
      </section>
    </main>
  );
}
