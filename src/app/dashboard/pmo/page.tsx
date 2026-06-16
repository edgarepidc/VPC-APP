import Link from "next/link";
import { redirect } from "next/navigation";

import { DashboardSectionShell } from "@/app/dashboard/_components/section-shell";
import { dashPage } from "@/lib/ui-classes";
import { getSessionUser } from "@/lib/auth/session";
import { getSessionProjectIdsFilter } from "@/lib/project-scope";
import { requireTenantId } from "@/lib/tenancy";
import { getCachedPmoSnapshot } from "@/modules/pmo/cached-snapshot";

import { buildPmoActionQueue } from "./pmo-action-utils";
import { PmoActionQueue } from "./pmo-action-queue";
import { PmoExecutiveKpiBar } from "./pmo-executive-kpi-bar";
import { PmoPulseStrip } from "./pmo-pulse-strip";
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

  return (
    <main className={dashPage}>
      <DashboardSectionShell eyebrow="PMO" title="Resumen ejecutivo" titleAs="h1">
        <div className="space-y-4 p-4">
          <PmoExecutiveKpiBar
            kpis={{
              projects: snapshot.kpis.projects,
              deliverables: snapshot.kpis.deliverables,
              overdueDeliverables: snapshot.kpis.overdueDeliverables,
              deliverableOnTimePct: snapshot.kpis.deliverableOnTimePct,
              risks: snapshot.kpis.risks,
              criticalRisks: snapshot.kpis.criticalRisks,
              escalationChecks: snapshot.kpis.escalationChecks,
              portfolioProgressPct: snapshot.kpis.portfolioProgressPct,
            }}
          />

          <PmoPulseStrip
            escalationCounts={snapshot.escalationRadar.counts}
            meetingCounts={snapshot.meetingRoiRadar.counts}
            totalMeetingCostMxn={snapshot.meetingRoiRadar.totalCostMxn}
            formatMxn={mxn}
          />

          <PmoActionQueue items={actionItems} />

          <ProjectHealthPanel
            rows={snapshot.projectHealth}
            portfolioProgressPct={snapshot.kpis.portfolioProgressPct}
          />
        </div>
      </DashboardSectionShell>
    </main>
  );
}
