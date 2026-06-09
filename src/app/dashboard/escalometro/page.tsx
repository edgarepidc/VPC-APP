import { redirect } from "next/navigation";

import { DashboardPageHeader } from "@/app/dashboard/_components/page-header";
import { EscalometroClient } from "@/app/dashboard/escalometro/escalometro-client";
import { getSessionUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/rbac";
import { listProjectsForSession, getSessionProjectIdsFilter } from "@/lib/project-scope";
import { requireTenantId } from "@/lib/tenancy";
import {
  dashCard,
  dashPage,
} from "@/lib/ui-classes";
import {
  ESCALATION_INDICATOR_KEYS,
  ESCALATION_INDICATOR_SHORT,
  formatRelativeDate,
  getEscalationTierBadge,
  getIndicatorLevelClass,
  parseEscalationIndicators,
} from "@/lib/escalation-utils";
import { listEscalationChecksByTenant } from "@/modules/escalations/service";

export default async function EscalometroPage() {
  const session = await getSessionUser();
  if (!session) redirect("/login");
  const tenantId = await requireTenantId();
  const canSave = hasPermission(session.role, "tasks.write");

  const projectIdsFilter = await getSessionProjectIdsFilter(session, tenantId);
  const [projects, recentChecks] = await Promise.all([
    listProjectsForSession(session, tenantId),
    listEscalationChecksByTenant(tenantId, {
      restrictToProjectIds: projectIdsFilter,
      limit: 8,
    }),
  ]);

  return (
    <main className={dashPage}>
      <DashboardPageHeader
        title="Escalómetro"
        description="Evalúa el nivel de escalamiento en 6 dimensiones y registra el resultado por proyecto."
      />

      <EscalometroClient projects={projects} canSave={canSave} />

      <section className={`${dashCard} p-4`}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-base font-semibold text-slate-900">Registros recientes</h2>
          <span className="text-xs text-slate-500">Historial ligero — distinto al registro de riesgos</span>
        </div>
        <ul className="mt-3 space-y-2">
          {recentChecks.map((check) => {
            const badge = getEscalationTierBadge(check.tier);
            const indicators = parseEscalationIndicators(check.indicators);
            return (
              <li
                key={check.id}
                className="rounded-lg border border-slate-200 p-3 text-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-medium text-slate-900">
                      {check.project.name}
                      {check.topic ? (
                        <span className="font-normal text-slate-600"> · {check.topic}</span>
                      ) : null}
                    </p>
                    <p className="text-slate-600">{check.title}</p>
                  </div>
                  <div className="text-right">
                    <span className={badge.className}>{badge.label}</span>
                    <p className="mt-1 text-xs text-slate-500">
                      {formatRelativeDate(check.createdAt)}
                    </p>
                  </div>
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {ESCALATION_INDICATOR_KEYS.map((key) => {
                    const level = indicators[key] ?? "low";
                    return (
                      <span
                        key={key}
                        title={key}
                        className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] font-medium text-slate-600"
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${getIndicatorLevelClass(level)}`}
                          aria-hidden
                        />
                        {ESCALATION_INDICATOR_SHORT[key]}
                      </span>
                    );
                  })}
                </div>
              </li>
            );
          })}
          {recentChecks.length === 0 && (
            <li className="rounded-lg border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500">
              Aún no hay evaluaciones registradas. Completa el escalómetro y pulsa Evaluar.
            </li>
          )}
        </ul>
      </section>
    </main>
  );
}
