import { redirect } from "next/navigation";

import { DashboardPageHeader } from "@/app/dashboard/_components/page-header";
import { EscalometroClient } from "@/app/dashboard/escalometro/escalometro-client";
import { EscalationHistoryList } from "@/app/dashboard/escalometro/escalation-history-list";
import { getSessionUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/rbac";
import { listProjectsForSession, getSessionProjectIdsFilter } from "@/lib/project-scope";
import { requireTenantId } from "@/lib/tenancy";
import {
  dashAlertWarn,
  dashCard,
  dashPage,
  uiInput,
  uiLabel,
} from "@/lib/ui-classes";
import { serializeEscalationChecks } from "@/lib/escalation-serialize";
import { escalationTableMissingMessage } from "@/lib/prisma-errors";
import {
  isEscalationStorageReady,
  listEscalationChecksByTenant,
} from "@/modules/escalations/service";

export const dynamic = "force-dynamic";

type EscalometroPageProps = {
  searchParams: Promise<{ projectId?: string }>;
};

export default async function EscalometroPage({ searchParams }: EscalometroPageProps) {
  const { projectId: filterProjectId = "" } = await searchParams;
  const session = await getSessionUser();
  if (!session) redirect("/login");
  const tenantId = await requireTenantId();
  const canSave = hasPermission(session.role, "tasks.write");

  const projectIdsFilter = await getSessionProjectIdsFilter(session, tenantId);
  const [projects, recentChecks, storageReady] = await Promise.all([
    listProjectsForSession(session, tenantId),
    listEscalationChecksByTenant(tenantId, {
      restrictToProjectIds: projectIdsFilter,
      projectId: filterProjectId || undefined,
      limit: 20,
    }),
    isEscalationStorageReady(),
  ]);

  const historyRows = serializeEscalationChecks(recentChecks);

  return (
    <main className={dashPage}>
      <DashboardPageHeader
        title="Escalómetro"
        description="Evalúa el nivel de escalamiento en 6 dimensiones y registra el resultado por proyecto."
      />

      {!storageReady && (
        <p className={dashAlertWarn} role="status">
          {escalationTableMissingMessage()} Mientras tanto puedes usar la herramienta, pero los
          registros no se guardarán.
        </p>
      )}

      <EscalometroClient projects={projects} canSave={canSave} />

      <section className={`${dashCard} p-4`}>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Registros recientes</h2>
            <span className="text-xs text-slate-500">
              Historial ligero — distinto al registro de riesgos
            </span>
          </div>
          <form method="get" className="flex flex-wrap items-end gap-2">
            <label className="block">
              <span className={uiLabel}>Filtrar por proyecto</span>
              <select
                name="projectId"
                defaultValue={filterProjectId}
                className={`${uiInput} mt-1 min-w-[200px]`}
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
            <EscalationHistoryList rows={historyRows} />
          ) : (
            <li className="rounded-lg border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500">
              {filterProjectId
                ? "No hay evaluaciones para este proyecto."
                : "Aún no hay evaluaciones registradas. Completa el escalómetro y pulsa Evaluar."}
            </li>
          )}
        </ul>
      </section>
    </main>
  );
}
