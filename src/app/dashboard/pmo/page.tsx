import { redirect } from "next/navigation";

import { getSessionUser } from "@/lib/auth/session";
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

  const snapshot = await getPmoSnapshot(tenantId);

  return (
    <main className="space-y-6">
      <section className="pmo-hero p-6">
        <h1 className="pmo-title">
          PMO Intelligence Platform
        </h1>
        <p className="mt-1 text-sm text-slate-200">
          Vista ejecutiva consolidada de proyectos, entregables, riesgos y stakeholders.
        </p>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="pmo-card p-4">
          <p className="text-xs uppercase tracking-wide text-slate-500">Proyectos</p>
          <p className="mt-2 text-3xl font-semibold text-slate-900">
            {snapshot.kpis.projects}
          </p>
        </div>
        <div className="pmo-card p-4">
          <p className="text-xs uppercase tracking-wide text-slate-500">Entregables</p>
          <p className="mt-2 text-3xl font-semibold text-slate-900">
            {snapshot.kpis.deliverables}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {snapshot.kpis.overdueDeliverables} vencidos pendientes
          </p>
        </div>
        <div className="pmo-card p-4">
          <p className="text-xs uppercase tracking-wide text-slate-500">Riesgos</p>
          <p className="mt-2 text-3xl font-semibold text-slate-900">
            {snapshot.kpis.risks}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {snapshot.kpis.criticalRisks} criticos
          </p>
        </div>
        <div className="pmo-card p-4">
          <p className="text-xs uppercase tracking-wide text-slate-500">
            Exposicion residual
          </p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">
            {money(snapshot.kpis.totalResidualVme)}
          </p>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-3">
        <div className="pmo-card p-6 lg:col-span-2">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">
              Salud por proyecto
            </h2>
            <span className="text-sm text-slate-600">
              Avance cartera: {snapshot.kpis.portfolioProgressPct}%
            </span>
          </div>
          <div className="mt-4 overflow-x-auto">
            <table className="pmo-table pmo-row-hover w-full min-w-[680px] text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-slate-500">
                  <th>Proyecto</th>
                  <th>Semaforo</th>
                  <th>Estado</th>
                  <th>Entregables</th>
                  <th>Avance</th>
                  <th>Riesgos</th>
                </tr>
              </thead>
              <tbody>
                {snapshot.projectHealth.map((project) => {
                  const statusBadge = getProjectStatusBadge(project.status);
                  const semaphore = getSemaphoreBadge(
                    Math.max(0, project.donePct - Math.min(40, project.risks * 8)),
                  );
                  return (
                    <tr key={project.id}>
                      <td className="font-medium text-slate-900">{project.name}</td>
                      <td>
                        <span className={semaphore.className}>{semaphore.label}</span>
                      </td>
                      <td>
                        <span className={statusBadge.className}>{statusBadge.label}</span>
                      </td>
                      <td>{project.deliverables}</td>
                      <td>{project.donePct}%</td>
                      <td>{project.risks}</td>
                    </tr>
                  );
                })}
                {snapshot.projectHealth.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-500">
                      Sin proyectos para este tenant.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="pmo-card p-6">
          <h2 className="text-lg font-semibold text-slate-900">Stakeholders</h2>
          <p className="mt-1 text-sm text-slate-600">
            Distribucion por cuadrante.
          </p>
          <div className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between rounded border border-slate-200 p-2">
              <span>Promotores</span>
              <span className="font-semibold">{snapshot.stakeholdersByQuadrant.promotores}</span>
            </div>
            <div className="flex justify-between rounded border border-slate-200 p-2">
              <span>Latentes</span>
              <span className="font-semibold">{snapshot.stakeholdersByQuadrant.latentes}</span>
            </div>
            <div className="flex justify-between rounded border border-slate-200 p-2">
              <span>Defensores</span>
              <span className="font-semibold">{snapshot.stakeholdersByQuadrant.defensores}</span>
            </div>
            <div className="flex justify-between rounded border border-slate-200 p-2">
              <span>Espectadores</span>
              <span className="font-semibold">{snapshot.stakeholdersByQuadrant.espectadores}</span>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="pmo-card p-6">
          <h2 className="text-lg font-semibold text-slate-900">Riesgos criticos</h2>
          <ul className="mt-4 space-y-2 text-sm">
            {snapshot.criticalRiskRows.map((risk) => (
              <li key={risk.id} className="rounded border border-slate-200 p-3">
                <p className="font-medium text-slate-900">{risk.title}</p>
                <p className="text-slate-600">
                  {risk.project.name} · {risk.ownerName} · Score {risk.residualScore}/25
                </p>
                <p className="text-slate-500">VME residual: {money(risk.residualVme)}</p>
              </li>
            ))}
            {snapshot.criticalRiskRows.length === 0 && (
              <li className="rounded border border-slate-200 p-3 text-slate-500">
                Sin riesgos criticos detectados.
              </li>
            )}
          </ul>
        </div>

        <div className="pmo-card p-6">
          <h2 className="text-lg font-semibold text-slate-900">
            Entregables vencidos
          </h2>
          <ul className="mt-4 space-y-2 text-sm">
            {snapshot.overdueDeliverables.map((deliverable) => (
              <li key={deliverable.id} className="rounded border border-slate-200 p-3">
                <p className="font-medium text-slate-900">{deliverable.title}</p>
                <p className="text-slate-600">{deliverable.project.name}</p>
                <p className="text-slate-500">
                  Vencia: {deliverable.dueDate?.toLocaleDateString("es-MX")}
                </p>
              </li>
            ))}
            {snapshot.overdueDeliverables.length === 0 && (
              <li className="rounded border border-slate-200 p-3 text-slate-500">
                No hay entregables vencidos.
              </li>
            )}
          </ul>
        </div>
      </section>
    </main>
  );
}
