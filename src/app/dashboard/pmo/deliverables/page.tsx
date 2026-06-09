import Link from "next/link";
import { redirect } from "next/navigation";

import { DashboardPageHeader } from "@/app/dashboard/_components/page-header";
import { getSessionUser } from "@/lib/auth/session";
import { DELIVERABLES_HUB, DELIVERABLE_DETAIL_IN_PROJECT } from "@/lib/dashboard-paths";
import { getSessionProjectIdsFilter } from "@/lib/project-scope";
import { requireTenantId } from "@/lib/tenancy";
import { dashCard, dashKpiLabel, dashKpiValue, dashPage } from "@/lib/ui-classes";
import { getPmoSnapshot } from "@/modules/pmo/service";

import { DeliverablesPmoClient } from "./deliverables-pmo-client";

export const dynamic = "force-dynamic";

export default async function PmoDeliverablesPage() {
  const session = await getSessionUser();
  if (!session) redirect("/login");
  const tenantId = await requireTenantId();
  const projectIdsFilter = await getSessionProjectIdsFilter(session, tenantId);

  const snapshot = await getPmoSnapshot(tenantId, {
    restrictToProjectIds: projectIdsFilter,
  });

  const recentClosed = snapshot.deliverablesRadar.recentClosed.map((row) => {
    let onTime: boolean | null = null;
    if (row.deliveredAt && row.dueDate) {
      const dueEnd = new Date(row.dueDate);
      dueEnd.setHours(23, 59, 59, 999);
      onTime = row.deliveredAt.getTime() <= dueEnd.getTime();
    }
    return {
      id: row.id,
      title: row.title,
      projectName: row.projectName,
      dueDate: row.dueDate?.toISOString() ?? null,
      deliveredAt: row.deliveredAt?.toISOString() ?? null,
      onTime,
    };
  });

  return (
    <main className={dashPage}>
      <DashboardPageHeader
        title="Entregables"
        description="Cumplimiento de fechas, avance ponderado y tendencia de cierres."
      >
        <Link
          href={DELIVERABLES_HUB}
          className="mt-2 inline-block text-sm font-medium text-slate-700 underline"
        >
          Abrir tracker de entregables
        </Link>
      </DashboardPageHeader>

      <section className="mb-4 grid grid-cols-2 gap-3 rounded-lg border border-slate-200 bg-white px-3 py-3 sm:flex sm:flex-wrap sm:gap-6 sm:px-4">
        <div>
          <p className={dashKpiLabel}>Entregables</p>
          <p className={dashKpiValue}>{snapshot.kpis.deliverables}</p>
        </div>
        <div>
          <p className={dashKpiLabel}>Avance ponderado</p>
          <p className={dashKpiValue}>{snapshot.kpis.portfolioProgressPct}%</p>
        </div>
        <div>
          <p className={dashKpiLabel}>Vencidos</p>
          <p className={dashKpiValue}>{snapshot.kpis.overdueDeliverables}</p>
        </div>
      </section>

      <DeliverablesPmoClient
        onTimePct={snapshot.kpis.deliverableOnTimePct}
        avgLeadDays={snapshot.kpis.deliverableAvgLeadDays}
        weeklyTrend={snapshot.deliverablesRadar.weeklyTrend}
        recentClosed={recentClosed}
      />

      {snapshot.overdueDeliverables.length > 0 ? (
        <section className={`${dashCard} mt-4 p-4`}>
          <h2 className="text-sm font-semibold text-slate-900">Vencidos abiertos</h2>
          <ul className="mt-3 space-y-2">
            {snapshot.overdueDeliverables.map((d) => (
              <li key={d.id} className="rounded-lg border border-rose-100 bg-rose-50/40 p-3">
                <Link
                  href={DELIVERABLE_DETAIL_IN_PROJECT(d.id, d.project.id)}
                  className="font-medium text-slate-900 hover:underline"
                >
                  {d.title}
                </Link>
                <p className="text-xs text-slate-600">{d.project.name}</p>
                <p className="text-xs text-rose-700">
                  Vencía: {d.dueDate?.toLocaleDateString("es-MX")}
                </p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </main>
  );
}
