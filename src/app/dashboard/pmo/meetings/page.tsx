import Link from "next/link";
import { redirect } from "next/navigation";

import { DashboardPageHeader } from "@/app/dashboard/_components/page-header";
import { RoiSessionHistoryList } from "@/app/dashboard/roi-meetings/roi-session-history-list";
import { MeetingCostAlerts } from "@/app/dashboard/pmo/meeting-cost-alerts";
import { getSessionUser } from "@/lib/auth/session";
import { ROI_MEETINGS_HUB } from "@/lib/dashboard-paths";
import { getSessionProjectIdsFilter, listProjectsForSession } from "@/lib/project-scope";
import { requireTenantId } from "@/lib/tenancy";
import { serializeMeetingRoiSessions } from "@/lib/meeting-roi-utils";
import {
  dashCard,
  dashPage,
  uiInput,
  uiLabel,
} from "@/lib/ui-classes";
import {
  findMeetingCostAlerts,
  listMeetingRoiSessionsByTenant,
} from "@/modules/meeting-roi/service";

export const dynamic = "force-dynamic";

type PmoMeetingsPageProps = {
  searchParams: Promise<{ projectId?: string }>;
};

export default async function PmoMeetingsPage({ searchParams }: PmoMeetingsPageProps) {
  const { projectId: filterProjectId = "" } = await searchParams;
  const session = await getSessionUser();
  if (!session) redirect("/login");
  const tenantId = await requireTenantId();
  const projectIdsFilter = await getSessionProjectIdsFilter(session, tenantId);

  const [projects, sessions, alerts] = await Promise.all([
    listProjectsForSession(session, tenantId),
    listMeetingRoiSessionsByTenant(tenantId, {
      restrictToProjectIds: projectIdsFilter,
      projectId: filterProjectId || undefined,
      limit: 100,
    }),
    findMeetingCostAlerts(tenantId, {
      restrictToProjectIds: projectIdsFilter,
      withinDays: 7,
    }),
  ]);

  const rows = serializeMeetingRoiSessions(sessions);
  const alertRows = alerts.map((a) => ({
    projectId: a.projectId,
    projectName: a.projectName,
    sessionName: a.sessionName,
    costLevel: a.costLevel,
    totalCost: a.totalCost,
    diagnosisTitle: a.diagnosisTitle,
    createdAt: a.createdAt.toISOString(),
    alertType: a.alertType,
  }));

  const totalCost = rows.reduce((sum, row) => sum + row.totalCost, 0);

  return (
    <main className={dashPage}>
      <DashboardPageHeader
        title="Reuniones"
        description="Historial de sesiones registradas con la calculadora ROI por proyecto."
      >
        <Link
          href={ROI_MEETINGS_HUB}
          className="mt-2 inline-block text-sm font-medium text-slate-700 underline"
        >
          Registrar nueva sesión
        </Link>
      </DashboardPageHeader>

      <MeetingCostAlerts alerts={alertRows} />

      <section className={`${dashCard} p-4`}>
        <form method="get" className="flex flex-wrap items-end gap-2 border-b border-slate-200 pb-4">
          <label className="block min-w-0 flex-1 sm:flex-none">
            <span className={uiLabel}>Proyecto</span>
            <select
              name="projectId"
              defaultValue={filterProjectId}
              className={`${uiInput} mt-1 w-full min-w-0 sm:min-w-[220px]`}
            >
              <option value="">Todos</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
          <button
            type="submit"
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Filtrar
          </button>
        </form>

        <p className="mt-3 text-sm text-slate-600">
          {rows.length} sesión{rows.length !== 1 ? "es" : ""}
          {filterProjectId ? " en este proyecto" : " en total"}
          {rows.length > 0 && (
            <span className="text-slate-500">
              {" "}
              · inversión acumulada{" "}
              {totalCost.toLocaleString("es-MX", {
                style: "currency",
                currency: "MXN",
                maximumFractionDigits: 0,
              })}
            </span>
          )}
        </p>

        <ul className="mt-3 space-y-2">
          {rows.length > 0 ? (
            <RoiSessionHistoryList rows={rows} />
          ) : (
            <li className="rounded-lg border border-dashed border-slate-200 p-8 text-center text-sm text-slate-500">
              Sin sesiones registradas.
            </li>
          )}
        </ul>
      </section>
    </main>
  );
}
