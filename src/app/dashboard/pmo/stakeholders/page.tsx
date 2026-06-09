import Link from "next/link";
import { redirect } from "next/navigation";

import { DashboardPageHeader } from "@/app/dashboard/_components/page-header";
import { getSessionUser } from "@/lib/auth/session";
import {
  STAKEHOLDER_DETAIL_IN_PROJECT,
  STAKEHOLDERS_HUB,
  STAKEHOLDERS_PROJECT,
  STAKEHOLDERS_QUADRANT,
} from "@/lib/dashboard-paths";
import { getSessionProjectIdsFilter } from "@/lib/project-scope";
import { requireTenantId } from "@/lib/tenancy";
import {
  dashCard,
  dashKpiLabel,
  dashKpiValue,
  dashPage,
  dashSectionTitle,
} from "@/lib/ui-classes";
import { getPmoSnapshot } from "@/modules/pmo/service";

export const dynamic = "force-dynamic";

const QUADRANTS = [
  { label: "Promotores", key: "promotores" as const, q: "q1", hint: "Alta influencia, bajo interés" },
  { label: "Latentes", key: "latentes" as const, q: "q2", hint: "Alta influencia e interés" },
  { label: "Defensores", key: "defensores" as const, q: "q3", hint: "Baja influencia, bajo interés" },
  { label: "Espectadores", key: "espectadores" as const, q: "q4", hint: "Resto del mapa" },
] as const;

const alertStyle = {
  promoter_no_obs: "border-amber-100 bg-amber-50/40",
  project_no_promoters: "border-orange-100 bg-orange-50/40",
  project_empty: "border-red-100 bg-red-50/40",
} as const;

export default async function PmoStakeholdersPage() {
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
        title="Interesados"
        description="Mapa de influencia e interés por cuadrante en el portafolio."
      >
        <Link
          href={STAKEHOLDERS_HUB}
          className="mt-2 inline-block text-sm font-medium text-slate-700 underline"
        >
          Abrir mapa de interesados
        </Link>
      </DashboardPageHeader>

      <section className="mb-4 grid grid-cols-2 gap-3 rounded-lg border border-slate-200 bg-white px-3 py-3 sm:flex sm:flex-wrap sm:gap-6 sm:px-4">
        <div>
          <p className={dashKpiLabel}>Interesados</p>
          <p className={dashKpiValue}>{snapshot.kpis.stakeholders}</p>
        </div>
        <div>
          <p className={dashKpiLabel}>Promotores (Q1)</p>
          <p className={dashKpiValue}>{snapshot.stakeholdersByQuadrant.promotores}</p>
          <p className="text-xs text-slate-500">jugadores clave</p>
        </div>
        <div>
          <p className={dashKpiLabel}>Latentes (Q2)</p>
          <p className={dashKpiValue}>{snapshot.stakeholdersByQuadrant.latentes}</p>
        </div>
        <div>
          <p className={dashKpiLabel}>Alertas</p>
          <p className={dashKpiValue}>{snapshot.stakeholderAlerts.length}</p>
          <p className="text-xs text-slate-500">requieren atención</p>
        </div>
      </section>

      <section className={`${dashCard} mb-4 p-4`}>
        <h2 className={dashSectionTitle}>Por cuadrante</h2>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {QUADRANTS.map(({ label, key, q, hint }) => (
            <Link
              key={key}
              href={STAKEHOLDERS_QUADRANT(q)}
              className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2 text-sm transition hover:border-slate-300 hover:bg-slate-50"
            >
              <div>
                <span className="font-medium text-slate-900">{label}</span>
                <p className="text-xs text-slate-500">{hint}</p>
              </div>
              <span className="text-lg font-semibold text-slate-900">
                {snapshot.stakeholdersByQuadrant[key]}
              </span>
            </Link>
          ))}
        </div>
      </section>

      <section className={`${dashCard} mb-4 p-4`}>
        <h2 className={dashSectionTitle}>Jugadores clave (Q1)</h2>
        <ul className="mt-3 space-y-2">
          {snapshot.keyStakeholderRows.map((s) => (
            <li key={s.id} className="rounded-lg border border-green-100 bg-green-50/40 p-3">
              <Link
                href={STAKEHOLDER_DETAIL_IN_PROJECT(s.id, s.projectId)}
                className="font-medium text-slate-900 hover:underline"
              >
                {s.name}
              </Link>
              <p className="text-xs text-slate-600">
                {s.project.name}
                {s.role ? ` · ${s.role}` : ""} · Inf {s.influence} · Int {s.interest}
              </p>
              {!s.observation?.trim() ? (
                <p className="mt-1 text-xs text-amber-800">
                  Sin observación — documenta el plan de comunicación
                </p>
              ) : null}
            </li>
          ))}
          {snapshot.keyStakeholderRows.length === 0 ? (
            <li className="rounded-lg border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500">
              Sin promotores identificados en el portafolio.
            </li>
          ) : null}
        </ul>
      </section>

      <section className={`${dashCard} p-4`}>
        <h2 className={dashSectionTitle}>Requiere acción</h2>
        <ul className="mt-3 space-y-2">
          {snapshot.stakeholderAlerts.map((alert) => (
            <li
              key={`${alert.kind}-${alert.projectId}-${alert.stakeholderId ?? "proj"}`}
              className={`rounded-lg border p-3 ${alertStyle[alert.kind]}`}
            >
              {alert.stakeholderId ? (
                <Link
                  href={STAKEHOLDER_DETAIL_IN_PROJECT(alert.stakeholderId, alert.projectId)}
                  className="font-medium text-slate-900 hover:underline"
                >
                  {alert.label}
                </Link>
              ) : (
                <Link
                  href={STAKEHOLDERS_PROJECT(alert.projectId)}
                  className="font-medium text-slate-900 hover:underline"
                >
                  {alert.label}
                </Link>
              )}
              <p className="text-xs text-slate-600">{alert.sublabel}</p>
            </li>
          ))}
          {snapshot.stakeholderAlerts.length === 0 ? (
            <li className="rounded-lg border border-dashed border-emerald-200 bg-emerald-50/50 p-6 text-center text-sm text-emerald-800">
              Cobertura de interesados al día en el portafolio visible.
            </li>
          ) : null}
        </ul>
      </section>
    </main>
  );
}
