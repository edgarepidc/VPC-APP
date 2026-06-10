import Link from "next/link";

import type { MeetingCostTrendDirection } from "@/lib/meeting-roi-utils";
import type { EscalationTrendDirection } from "@/lib/escalation-utils";
import { getEscalationTierBadge } from "@/lib/escalation-utils";
import {
  DELIVERABLES_HUB,
  DELIVERABLES_PROJECT,
  PMO_ESCALATIONS_PROJECT,
  PMO_MEETINGS_PROJECT,
  PMO_PROJECT_DETAIL,
  RISKS_PROJECT,
} from "@/lib/dashboard-paths";
import { projectCardAccent } from "@/lib/project-hierarchy-visuals";
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

function healthCardAccent(tier: string | null, index: number) {
  switch (tier) {
    case "green":
      return "border-t-emerald-500";
    case "orange":
      return "border-t-amber-500";
    case "red":
      return "border-t-rose-500";
    default:
      return projectCardAccent(index);
  }
}

function MetricChip({
  href,
  label,
  title,
}: {
  href: string;
  label: string;
  title?: string;
}) {
  return (
    <Link
      href={href}
      title={title}
      className="inline-flex items-center rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-600 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-800"
    >
      {label}
    </Link>
  );
}

function ProjectHealthCard({
  project,
  index,
}: {
  project: ProjectHealthRow;
  index: number;
}) {
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
  const accent = healthCardAccent(project.latestEscalationTier, index);

  return (
    <article
      className={`rounded-xl border border-slate-200 border-t-4 bg-white p-4 shadow-sm transition hover:border-slate-300 hover:shadow-md ${accent}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <Link
          href={PMO_PROJECT_DETAIL(project.id)}
          className="text-sm font-semibold leading-snug text-slate-900 hover:text-blue-700 hover:underline"
        >
          {project.name}
        </Link>
        <span className={semaphore.className}>{semaphore.label}</span>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-2">
        <span className={statusBadge.className}>{statusBadge.label}</span>
        <MetricChip
          href={DELIVERABLES_PROJECT(project.id)}
          label={`${project.deliverables} entregables · ${project.donePct}%`}
          title="Ver entregables del proyecto"
        />
        <MetricChip
          href={RISKS_PROJECT(project.id)}
          label={`${project.risks} riesgos`}
          title="Ver riesgos del proyecto"
        />
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <div className="rounded-lg border border-slate-200 bg-slate-50/60 p-2.5">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
            Escalamiento
          </p>
          <div className="mt-1.5 flex flex-wrap items-center gap-2">
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
        <div className="rounded-lg border border-slate-200 bg-slate-50/60 p-2.5">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
            Reuniones
          </p>
          <div className="mt-1.5 flex flex-wrap items-center gap-2">
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
}

export function ProjectHealthPanel({ rows, portfolioProgressPct }: ProjectHealthPanelProps) {
  return (
    <div className={`${dashCard} p-4 lg:col-span-2`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-base font-semibold text-slate-900">Salud por iniciativa / subproyecto</h2>
        <Link
          href={DELIVERABLES_HUB}
          className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-700 shadow-sm hover:border-slate-300 hover:bg-slate-50"
        >
          Avance portafolio: {portfolioProgressPct}%
        </Link>
      </div>

      {rows.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-700 shadow-sm">
            <span className="h-1.5 w-1.5 rounded-full bg-slate-400" aria-hidden />
            {rows.length} proyecto{rows.length !== 1 ? "s" : ""}
          </span>
        </div>
      ) : null}

      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {rows.map((project, index) => (
          <ProjectHealthCard key={project.id} project={project} index={index} />
        ))}
      </div>

      {rows.length === 0 && (
        <p className="mt-4 rounded-lg border border-dashed border-slate-200 p-8 text-center text-sm text-slate-500">
          Sin proyectos en este workspace.
        </p>
      )}
    </div>
  );
}
