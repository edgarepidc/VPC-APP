import Link from "next/link";
import { redirect } from "next/navigation";

import { DashboardPageHeader } from "@/app/dashboard/_components/page-header";
import { getSessionUser } from "@/lib/auth/session";
import { STAKEHOLDERS_HUB } from "@/lib/dashboard-paths";
import { getSessionProjectIdsFilter } from "@/lib/project-scope";
import { requireTenantId } from "@/lib/tenancy";
import { dashCard, dashKpiLabel, dashKpiValue, dashPage } from "@/lib/ui-classes";
import { getPmoSnapshot } from "@/modules/pmo/service";

export const dynamic = "force-dynamic";

const QUADRANTS = [
  ["Promotores", "promotores"],
  ["Latentes", "latentes"],
  ["Defensores", "defensores"],
  ["Espectadores", "espectadores"],
] as const;

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
        title="Stakeholders"
        description="Mapa de influencia e interés por cuadrante en el portafolio."
      >
        <Link
          href={STAKEHOLDERS_HUB}
          className="mt-2 inline-block text-sm font-medium text-slate-700 underline"
        >
          Abrir mapa de stakeholders
        </Link>
      </DashboardPageHeader>

      <section className="mb-4 grid grid-cols-2 gap-3 rounded-lg border border-slate-200 bg-white px-3 py-3 sm:flex sm:flex-wrap sm:gap-6 sm:px-4">
        <div>
          <p className={dashKpiLabel}>Stakeholders</p>
          <p className={dashKpiValue}>{snapshot.kpis.stakeholders}</p>
        </div>
      </section>

      <section className={`${dashCard} p-4`}>
        <h2 className="text-sm font-semibold text-slate-900">Por cuadrante</h2>
        <div className="mt-3 space-y-2">
          {QUADRANTS.map(([label, key]) => (
            <Link
              key={key}
              href={STAKEHOLDERS_HUB}
              className="flex justify-between rounded-lg border border-slate-200 px-3 py-2 text-sm transition hover:border-slate-300 hover:bg-slate-50"
            >
              <span className="text-slate-600">{label}</span>
              <span className="font-semibold text-slate-900">
                {snapshot.stakeholdersByQuadrant[key]}
              </span>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
