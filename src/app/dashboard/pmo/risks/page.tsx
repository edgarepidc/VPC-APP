import Link from "next/link";
import { redirect } from "next/navigation";

import { DashboardSectionShell } from "@/app/dashboard/_components/section-shell";
import { fmtMoneyMxn } from "@/app/dashboard/risks/risk-utils";
import { getSessionUser } from "@/lib/auth/session";
import { RISK_DETAIL_IN_PROJECT } from "@/lib/dashboard-paths";
import { getSessionProjectIdsFilter } from "@/lib/project-scope";
import { requireTenantId } from "@/lib/tenancy";
import { dashCard, dashKpiLabel, dashKpiValue, dashPage, dashSectionTitle } from "@/lib/ui-classes";
import { getPmoSnapshot } from "@/modules/pmo/service";

export const dynamic = "force-dynamic";

export default async function PmoRisksPage() {
  const session = await getSessionUser();
  if (!session) redirect("/login");
  const tenantId = await requireTenantId();
  const projectIdsFilter = await getSessionProjectIdsFilter(session, tenantId);

  const snapshot = await getPmoSnapshot(tenantId, {
    restrictToProjectIds: projectIdsFilter,
  });

  return (
    <main className={dashPage}>
      <DashboardSectionShell eyebrow="PMO" title="Riesgos" titleAs="h1">
        <div className="space-y-4 p-4">
      <section className="mb-4 grid grid-cols-2 gap-3 rounded-lg border border-slate-200 bg-white px-3 py-3 sm:flex sm:flex-wrap sm:gap-6 sm:px-4">
        <div>
          <p className={dashKpiLabel}>Riesgos</p>
          <p className={dashKpiValue}>{snapshot.kpis.risks}</p>
        </div>
        <div>
          <p className={dashKpiLabel}>Críticos</p>
          <p className={dashKpiValue}>{snapshot.kpis.criticalRisks}</p>
          <p className="text-xs text-slate-500">score residual &gt; 10</p>
        </div>
        <div>
          <p className={dashKpiLabel}>Exposición residual</p>
          <p className={dashKpiValue}>{fmtMoneyMxn(snapshot.kpis.totalResidualVme)}</p>
          <p className="text-xs text-slate-500">pesos mexicanos</p>
        </div>
      </section>

      <section className={`${dashCard} p-4`}>
        <h2 className={dashSectionTitle}>Riesgos críticos</h2>
        <ul className="mt-3 space-y-2">
          {snapshot.criticalRiskRows.map((risk) => (
            <li key={risk.id} className="rounded-lg border border-amber-100 bg-amber-50/40 p-3">
              <Link
                href={RISK_DETAIL_IN_PROJECT(risk.id, risk.project.id)}
                className="font-medium text-slate-900 hover:underline"
              >
                {risk.title}
              </Link>
              <p className="text-xs text-slate-600">
                {risk.project.name} · {risk.ownerName} · {risk.residualScore}/25
              </p>
              <p className="text-xs text-amber-800">VME: {fmtMoneyMxn(risk.residualVme)}</p>
            </li>
          ))}
          {snapshot.criticalRiskRows.length === 0 ? (
            <li className="rounded-lg border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500">
              Sin riesgos críticos en el portafolio.
            </li>
          ) : null}
        </ul>
      </section>
        </div>
      </DashboardSectionShell>
    </main>
  );
}
