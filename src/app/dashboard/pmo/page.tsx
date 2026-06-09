import Link from "next/link";
import { redirect } from "next/navigation";

import { DashboardPageHeader } from "@/app/dashboard/_components/page-header";
import { dashCard, dashPage } from "@/lib/ui-classes";
import {
  DELIVERABLE_DETAIL_IN_PROJECT,
  RISK_DETAIL_IN_PROJECT,
  STAKEHOLDERS_HUB,
  STAKEHOLDERS_QUADRANT,
} from "@/lib/dashboard-paths";
import { getSessionUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/rbac";
import { getSessionProjectIdsFilter } from "@/lib/project-scope";
import { requireTenantId } from "@/lib/tenancy";
import { serializeEscalationChecks } from "@/lib/escalation-serialize";
import { serializeMeetingRoiSessions } from "@/lib/meeting-roi-utils";
import { getCachedPmoSnapshot } from "@/modules/pmo/cached-snapshot";

import { buildPmoActionQueue } from "./pmo-action-utils";
import { PmoActionQueue } from "./pmo-action-queue";
import { PmoKpiBar } from "./pmo-kpi-bar";
import { EscalationRadarClient } from "./escalation-radar-client";
import { EscalationDeteriorationAlerts } from "./escalation-deterioration-alerts";
import { MeetingCostAlerts } from "./meeting-cost-alerts";
import { MeetingRoiRadarClient } from "./meeting-roi-radar-client";
import { ProjectHealthPanel } from "./project-health-panel";

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
  const snapshot = await getCachedPmoSnapshot(tenantId, {
    restrictToProjectIds: projectIdsFilter,
  });

  const actionItems = buildPmoActionQueue({
    overdueDeliverables: snapshot.overdueDeliverables,
    criticalRiskRows: snapshot.criticalRiskRows,
    stakeholderAlerts: snapshot.stakeholderAlerts,
    deteriorationAlerts: snapshot.deteriorationAlerts,
    meetingCostAlerts: snapshot.meetingCostAlerts,
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

      <PmoKpiBar kpis={snapshot.kpis} formatMxn={mxn} />

      <section className="mb-4">
        <PmoActionQueue items={actionItems} />
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
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-base font-semibold text-slate-900">Interesados</h2>
            <Link href={STAKEHOLDERS_HUB} className="text-xs font-medium text-slate-600 underline">
              Abrir mapa
            </Link>
          </div>
          <div className="mt-3 space-y-2 text-sm">
            {(
              [
                ["Promotores", snapshot.stakeholdersByQuadrant.promotores, "q1"],
                ["Latentes", snapshot.stakeholdersByQuadrant.latentes, "q2"],
                ["Defensores", snapshot.stakeholdersByQuadrant.defensores, "q3"],
                ["Espectadores", snapshot.stakeholdersByQuadrant.espectadores, "q4"],
              ] as const
            ).map(([label, n, q]) => (
              <Link
                key={label}
                href={STAKEHOLDERS_QUADRANT(q)}
                className="flex justify-between rounded-lg border border-slate-200 px-3 py-2 transition hover:border-slate-300 hover:bg-slate-50"
              >
                <span className="text-slate-600">{label}</span>
                <span className="font-semibold text-slate-900">{n}</span>
              </Link>
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
                <Link
                  href={RISK_DETAIL_IN_PROJECT(risk.id, risk.project.id)}
                  className="font-medium text-slate-900 hover:underline"
                >
                  {risk.title}
                </Link>
                <p className="text-slate-600">
                  {risk.project.name} · {risk.ownerName} · {risk.residualScore}/25
                </p>
                <p className="text-xs text-slate-500">VME: {mxn(risk.residualVme)}</p>
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
                <Link
                  href={DELIVERABLE_DETAIL_IN_PROJECT(deliverable.id, deliverable.project.id)}
                  className="font-medium text-slate-900 hover:underline"
                >
                  {deliverable.title}
                </Link>
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
