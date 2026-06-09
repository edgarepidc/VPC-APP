import Link from "next/link";
import { redirect } from "next/navigation";

import { DashboardPageHeader } from "@/app/dashboard/_components/page-header";
import { PMO_MEETINGS } from "@/lib/dashboard-paths";
import { RoiMeetingsClient } from "@/app/dashboard/roi-meetings/roi-meetings-client";
import { RoiSessionHistoryList } from "@/app/dashboard/roi-meetings/roi-session-history-list";
import { getSessionUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/rbac";
import { listProjectsForSession, getSessionProjectIdsFilter } from "@/lib/project-scope";
import { requireTenantId } from "@/lib/tenancy";
import { serializeMeetingRoiSessions } from "@/lib/meeting-roi-utils";
import { meetingRoiTableMissingMessage } from "@/lib/prisma-errors";
import {
  dashAlertWarn,
  dashCard,
  dashPage,
  uiInput,
  uiLabel,
} from "@/lib/ui-classes";
import {
  isMeetingRoiStorageReady,
  listMeetingRoiSessionsByTenant,
} from "@/modules/meeting-roi/service";

export const dynamic = "force-dynamic";

type RoiMeetingsPageProps = {
  searchParams: Promise<{ projectId?: string }>;
};

export default async function RoiMeetingsPage({ searchParams }: RoiMeetingsPageProps) {
  const { projectId: filterProjectId = "" } = await searchParams;
  const session = await getSessionUser();
  if (!session) redirect("/login");
  const tenantId = await requireTenantId();
  const canSave = hasPermission(session.role, "tasks.write");

  const projectIdsFilter = await getSessionProjectIdsFilter(session, tenantId);
  const [projects, recentSessions, storageReady] = await Promise.all([
    listProjectsForSession(session, tenantId),
    listMeetingRoiSessionsByTenant(tenantId, {
      restrictToProjectIds: projectIdsFilter,
      projectId: filterProjectId || undefined,
      limit: 20,
    }),
    isMeetingRoiStorageReady(),
  ]);

  const historyRows = serializeMeetingRoiSessions(recentSessions);

  return (
    <main className={dashPage}>
      <DashboardPageHeader
        title="ROI de reuniones"
        description="Calcula el costo de tus sesiones y registra el resultado por proyecto."
      >
        <Link
          href={PMO_MEETINGS}
          className="mt-2 inline-block text-sm font-medium text-slate-700 underline"
        >
          Ver historial PMO de reuniones
        </Link>
      </DashboardPageHeader>

      {!storageReady && (
        <p className={dashAlertWarn} role="status">
          {meetingRoiTableMissingMessage()} Mientras tanto puedes usar la calculadora, pero los
          registros no se guardarán.
        </p>
      )}

      <RoiMeetingsClient projects={projects} canSave={canSave} />

      <section className={`${dashCard} p-4`}>
        <div className="mt-3 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Registros recientes</h2>
            <span className="text-xs text-slate-500">
              Historial de sesiones registradas por proyecto
            </span>
          </div>
          <form method="get" className="flex w-full flex-wrap items-end gap-2 sm:w-auto">
            <label className="block min-w-0 flex-1 sm:flex-none">
              <span className={uiLabel}>Filtrar por proyecto</span>
              <select
                name="projectId"
                defaultValue={filterProjectId}
                className={`${uiInput} mt-1 w-full min-w-0 sm:min-w-[200px]`}
              >
                <option value="">Todos los proyectos</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
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
        </div>
        <ul className="mt-3 space-y-2">
          {historyRows.length > 0 ? (
            <RoiSessionHistoryList rows={historyRows} />
          ) : (
            <li className="rounded-lg border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500">
              {filterProjectId
                ? "No hay sesiones registradas para este proyecto."
                : "Aún no hay sesiones registradas. Configura la calculadora y pulsa Registrar sesión."}
            </li>
          )}
        </ul>
      </section>
    </main>
  );
}
