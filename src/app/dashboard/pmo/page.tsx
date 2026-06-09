import { redirect } from "next/navigation";

import { DashboardPageHeader } from "@/app/dashboard/_components/page-header";
import {
  dashCard,
  dashKpiLabel,
  dashKpiValue,
  dashPage,
} from "@/lib/ui-classes";
import { getSessionUser } from "@/lib/auth/session";
import { getSessionProjectIdsFilter } from "@/lib/project-scope";
import { requireTenantId } from "@/lib/tenancy";
import { getProjectStatusBadge, getSemaphoreBadge } from "@/lib/ui";
import { getPmoSnapshot } from "@/modules/pmo/service";

function money(value: number) {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

export default async function PmoPage() {
  const session = await getSessionUser();
  if (!session) redirect("/login");
  const tenantId = await requireTenantId();

  const projectIdsFilter = await getSessionProjectIdsFilter(session, tenantId);
  const snapshot = await getPmoSnapshot(tenantId, {
    restrictToProjectIds: projectIdsFilter,
  });

  return (
    <main className={dashPage}>
      <DashboardPageHeader
        title="PMO Dashboard"
        description="Vista ejecutiva de proyectos, entregables, riesgos y stakeholders."
      />

      <section className="flex flex-wrap gap-6 rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm">
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
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <div className={`${dashCard} p-4 lg:col-span-2`}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-base font-semibold text-slate-900">Salud por proyecto</h2>
            <span className="text-sm text-slate-600">
              Avance: {snapshot.kpis.portfolioProgressPct}%
            </span>
          </div>
          <div className="mt-3 overflow-x-auto">
            <table className="pmo-table pmo-row-hover w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs font-medium uppercase text-slate-500">
                  <th className="py-2">Proyecto</th>
                  <th className="py-2">Semáforo</th>
                  <th className="py-2">Estado</th>
                  <th className="py-2">Entregables</th>
                  <th className="py-2">Avance</th>
                  <th className="py-2">Riesgos</th>
                </tr>
              </thead>
              <tbody>
                {snapshot.projectHealth.map((project) => {
                  const statusBadge = getProjectStatusBadge(project.status);
                  const semaphore = getSemaphoreBadge(
                    Math.max(0, project.donePct - Math.min(40, project.risks * 8)),
                  );
                  return (
                    <tr key={project.id} className="border-b border-slate-100">
                      <td className="py-2 font-medium text-slate-900">{project.name}</td>
                      <td className="py-2">
                        <span className={semaphore.className}>{semaphore.label}</span>
                      </td>
                      <td className="py-2">
                        <span className={statusBadge.className}>{statusBadge.label}</span>
                      </td>
                      <td className="py-2">{project.deliverables}</td>
                      <td className="py-2">{project.donePct}%</td>
                      <td className="py-2">{project.risks}</td>
                    </tr>
                  );
                })}
                {snapshot.projectHealth.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-6 text-center text-sm text-slate-500">
                      Sin proyectos en este workspace.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

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
