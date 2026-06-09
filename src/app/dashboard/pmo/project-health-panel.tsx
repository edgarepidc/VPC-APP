import Link from "next/link";

import type { MeetingCostTrendDirection } from "@/lib/meeting-roi-utils";
import type { EscalationTrendDirection } from "@/lib/escalation-utils";
import { getEscalationTierBadge } from "@/lib/escalation-utils";
import { DELIVERABLES_HUB, DELIVERABLES_PROJECT, PMO_ESCALATIONS_PROJECT, PMO_MEETINGS_PROJECT, PMO_PROJECT_DETAIL, RISKS_PROJECT } from "@/lib/dashboard-paths";
import { getProjectStatusBadge, getSemaphoreBadge } from "@/lib/ui";
import { getCostLevelBadge, formatMxn } from "@/lib/meeting-roi-utils";
import { dashCard } from "@/lib/ui-classes";

import { EscalationTrendDots } from "./escalation-trend-dots";
import { MeetingCostTrendDots } from "./meeting-cost-trend-dots";

export type ProjectHealthRow = {
  id: string;
  name: string;
  status: string;
  deliverables: number;
  donePct: number;
  risks: number;
  latestEscalationTier: string | null;
  escalationTrendTiers: string[];
  escalationTrendDirection: EscalationTrendDirection;
  latestMeetingCostLevel: string | null;
  latestMeetingCost: number | null;
  meetingCostTrendLevels: string[];
  meetingCostTrendDirection: MeetingCostTrendDirection;
};

type ProjectHealthPanelProps = {
  rows: ProjectHealthRow[];
  portfolioProgressPct: number;
};

export function ProjectHealthPanel({ rows, portfolioProgressPct }: ProjectHealthPanelProps) {
  return (
    <div className={`${dashCard} p-4 lg:col-span-2`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-base font-semibold text-slate-900">Salud por proyecto</h2>
        <Link
          href={DELIVERABLES_HUB}
          className="text-sm text-slate-600 hover:text-slate-900 hover:underline"
        >
          Avance: {portfolioProgressPct}%
        </Link>
      </div>

      {/* Vista móvil: tarjetas */}
      <div className="mt-3 space-y-3 lg:hidden">
        {rows.map((project) => {
          const statusBadge = getProjectStatusBadge(project.status);
          const semaphore = getSemaphoreBadge(
            Math.max(0, project.donePct - Math.min(40, project.risks * 8)),
          );
          const escalationBadge = project.latestEscalationTier
            ? getEscalationTierBadge(project.latestEscalationTier)
            : null;
          const meetingBadge = project.latestMeetingCostLevel
            ? getCostLevelBadge(project.latestMeetingCostLevel)
            : null;

          return (
            <article
              key={project.id}
              className="rounded-lg border border-slate-200 p-3 text-sm"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <Link
                  href={PMO_PROJECT_DETAIL(project.id)}
                  className="font-medium text-slate-900 hover:underline"
                >
                  {project.name}
                </Link>
                <span className={semaphore.className}>{semaphore.label}</span>
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                <span className={statusBadge.className}>{statusBadge.label}</span>
                <Link
                  href={DELIVERABLES_PROJECT(project.id)}
                  className="rounded-md border border-slate-200 px-2 py-0.5 text-xs text-slate-600 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900"
                  title="Ver entregables del proyecto"
                >
                  {project.deliverables} entregables · {project.donePct}%
                </Link>
                <span className="rounded-md border border-slate-200 px-2 py-0.5 text-xs text-slate-600">
                  <Link href={RISKS_PROJECT(project.id)} className="hover:underline">
                    {project.risks} riesgos
                  </Link>
                </span>
              </div>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                <div className="rounded-md bg-slate-50 p-2">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                    Escalamiento
                  </p>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    {escalationBadge ? (
                      <Link href={PMO_ESCALATIONS_PROJECT(project.id)}>
                        <span className={escalationBadge.className}>{escalationBadge.label}</span>
                      </Link>
                    ) : (
                      <span className="text-xs text-slate-400">Sin evaluar</span>
                    )}
                    <EscalationTrendDots
                      tiers={project.escalationTrendTiers}
                      direction={project.escalationTrendDirection}
                    />
                  </div>
                </div>
                <div className="rounded-md bg-slate-50 p-2">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                    Reuniones
                  </p>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    {meetingBadge ? (
                      <>
                        <Link href={PMO_MEETINGS_PROJECT(project.id)}>
                          <span className={meetingBadge.className}>{meetingBadge.label}</span>
                        </Link>
                        {project.latestMeetingCost != null && (
                          <span className="text-xs text-slate-600">
                            {formatMxn(project.latestMeetingCost)}
                          </span>
                        )}
                      </>
                    ) : (
                      <span className="text-xs text-slate-400">Sin registrar</span>
                    )}
                    <MeetingCostTrendDots
                      levels={project.meetingCostTrendLevels}
                      direction={project.meetingCostTrendDirection}
                    />
                  </div>
                </div>
              </div>
            </article>
          );
        })}
        {rows.length === 0 && (
          <p className="rounded-lg border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500">
            Sin proyectos en este workspace.
          </p>
        )}
      </div>

      {/* Vista escritorio: tabla */}
      <div className="mt-3 hidden overflow-x-auto lg:block">
        <table className="pmo-table pmo-row-hover w-full min-w-[760px] text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-xs font-medium uppercase text-slate-500">
              <th className="py-2">Proyecto</th>
              <th className="py-2">Semáforo</th>
              <th className="py-2">Estado</th>
              <th className="py-2">Entregables</th>
              <th className="py-2">Avance</th>
              <th className="py-2">Riesgos</th>
              <th className="py-2">Escalamiento</th>
              <th className="py-2">Tendencia</th>
              <th className="py-2">Reuniones</th>
              <th className="py-2">Costo</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((project) => {
              const statusBadge = getProjectStatusBadge(project.status);
              const semaphore = getSemaphoreBadge(
                Math.max(0, project.donePct - Math.min(40, project.risks * 8)),
              );
              const escalationBadge = project.latestEscalationTier
                ? getEscalationTierBadge(project.latestEscalationTier)
                : null;
              const meetingBadge = project.latestMeetingCostLevel
                ? getCostLevelBadge(project.latestMeetingCostLevel)
                : null;

              return (
                <tr key={project.id} className="border-b border-slate-100">
                  <td className="py-2">
                    <Link
                      href={PMO_PROJECT_DETAIL(project.id)}
                      className="font-medium text-slate-900 hover:underline"
                    >
                      {project.name}
                    </Link>
                  </td>
                  <td className="py-2">
                    <span className={semaphore.className}>{semaphore.label}</span>
                  </td>
                  <td className="py-2">
                    <span className={statusBadge.className}>{statusBadge.label}</span>
                  </td>
                  <td className="py-2">
                    <Link
                      href={DELIVERABLES_PROJECT(project.id)}
                      className="font-medium text-slate-900 hover:underline"
                      title="Ver entregables del proyecto"
                    >
                      {project.deliverables}
                    </Link>
                  </td>
                  <td className="py-2">
                    <Link
                      href={DELIVERABLES_PROJECT(project.id)}
                      className="text-slate-900 hover:underline"
                      title="Ver avance en tracker"
                    >
                      {project.donePct}%
                    </Link>
                  </td>
                  <td className="py-2">
                    <Link
                      href={RISKS_PROJECT(project.id)}
                      className="text-slate-900 hover:underline"
                      title="Ver riesgos del proyecto"
                    >
                      {project.risks}
                    </Link>
                  </td>
                  <td className="py-2">
                    {escalationBadge ? (
                      <Link href={PMO_ESCALATIONS_PROJECT(project.id)}>
                        <span className={escalationBadge.className}>{escalationBadge.label}</span>
                      </Link>
                    ) : (
                      <span className="text-xs text-slate-400">Sin evaluar</span>
                    )}
                  </td>
                  <td className="py-2">
                    <EscalationTrendDots
                      tiers={project.escalationTrendTiers}
                      direction={project.escalationTrendDirection}
                    />
                  </td>
                  <td className="py-2">
                    {meetingBadge ? (
                      <Link href={PMO_MEETINGS_PROJECT(project.id)}>
                        <span className={meetingBadge.className}>{meetingBadge.label}</span>
                      </Link>
                    ) : (
                      <span className="text-xs text-slate-400">Sin registrar</span>
                    )}
                    <div className="mt-1">
                      <MeetingCostTrendDots
                        levels={project.meetingCostTrendLevels}
                        direction={project.meetingCostTrendDirection}
                      />
                    </div>
                  </td>
                  <td className="py-2 text-slate-700">
                    {project.latestMeetingCost != null ? (
                      <Link href={PMO_MEETINGS_PROJECT(project.id)} className="hover:underline">
                        {formatMxn(project.latestMeetingCost)}
                      </Link>
                    ) : (
                      "—"
                    )}
                  </td>
                </tr>
              );
            })}
            {rows.length === 0 && (
              <tr>
                <td colSpan={10} className="py-6 text-center text-sm text-slate-500">
                  Sin proyectos en este workspace.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
