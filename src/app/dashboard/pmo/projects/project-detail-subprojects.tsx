import Link from "next/link";

import type { ProjectHealthRow } from "@/app/dashboard/pmo/project-health-panel";
import {
  DELIVERABLES_HUB,
  PMO_ESCALATIONS,
  PMO_PROJECT_DETAIL,
  RISKS_HUB,
} from "@/lib/dashboard-paths";
import { getEscalationTierBadge } from "@/lib/escalation-utils";
import { projectCardAccent } from "@/lib/project-hierarchy-visuals";
import { getProjectStatusBadge } from "@/lib/ui";
import { dashSectionTitle } from "@/lib/ui-classes";

const MODULE_LINKS = [
  { label: "Entregables", suffix: "deliverables" },
  { label: "Riesgos", suffix: "risks" },
  { label: "Interesados", suffix: "stakeholders" },
  { label: "Escalamientos", suffix: "escalations" },
  { label: "Reuniones", suffix: "meetings" },
] as const;

function moduleHref(projectId: string, kind: (typeof MODULE_LINKS)[number]["suffix"]) {
  const base = `/dashboard/pmo/projects/${encodeURIComponent(projectId)}`;
  switch (kind) {
    case "deliverables":
      return `/dashboard/deliverables?project=${encodeURIComponent(projectId)}`;
    case "risks":
      return `/dashboard/risks?project=${encodeURIComponent(projectId)}`;
    case "stakeholders":
      return `/dashboard/stakeholders?project=${encodeURIComponent(projectId)}`;
    case "escalations":
      return `/dashboard/pmo/escalations?projectId=${encodeURIComponent(projectId)}`;
    case "meetings":
      return `/dashboard/pmo/meetings?projectId=${encodeURIComponent(projectId)}`;
    default:
      return base;
  }
}

type SubprojectRow = {
  id: string;
  name: string;
  description: string | null;
  status: string;
};

type ProjectDetailSubprojectsProps = {
  subprojects: SubprojectRow[];
  healthById: Map<string, ProjectHealthRow>;
};

export function ProjectDetailSubprojects({
  subprojects,
  healthById,
}: ProjectDetailSubprojectsProps) {
  if (subprojects.length === 0) return null;

  return (
    <section className="mb-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <h2 className={dashSectionTitle}>Subproyectos</h2>
      <p className="mt-1 text-sm text-slate-600">
        {subprojects.length} unidad{subprojects.length !== 1 ? "es" : ""} de trabajo bajo esta
        iniciativa.
      </p>
      <ul className="mt-4 space-y-3">
        {subprojects.map((sub, index) => {
          const health = healthById.get(sub.id);
          const statusBadge = getProjectStatusBadge(sub.status);
          const escalationBadge = health?.latestEscalationTier
            ? getEscalationTierBadge(health.latestEscalationTier)
            : null;
          const accent = health?.latestEscalationTier
            ? health.latestEscalationTier === "green"
              ? "border-t-emerald-500"
              : health.latestEscalationTier === "orange"
                ? "border-t-amber-500"
                : "border-t-rose-500"
            : projectCardAccent(index);

          return (
            <li
              key={sub.id}
              className={`rounded-xl border border-slate-200 border-t-4 bg-slate-50/40 p-4 transition hover:border-slate-300 hover:bg-white ${accent}`}
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-sky-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-sky-800">
                      Subproyecto
                    </span>
                    <span className={statusBadge.className}>{statusBadge.label}</span>
                    {escalationBadge ? (
                      <span className={escalationBadge.className}>{escalationBadge.label}</span>
                    ) : null}
                  </div>
                  <Link
                    href={PMO_PROJECT_DETAIL(sub.id)}
                    className="mt-1.5 block text-sm font-semibold text-slate-900 hover:text-blue-700 hover:underline"
                  >
                    {sub.name}
                  </Link>
                  {sub.description?.trim() ? (
                    <p className="mt-1 text-xs leading-relaxed text-slate-600">
                      {sub.description.trim()}
                    </p>
                  ) : null}
                </div>
                {health ? (
                  <div className="text-right text-xs text-slate-600">
                    <p>
                      Avance <strong className="text-slate-900">{health.donePct}%</strong>
                    </p>
                    <p>
                      {health.deliverables} entreg. · {health.risks} riesgos
                    </p>
                  </div>
                ) : null}
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5 border-t border-slate-200/80 pt-2.5">
                {MODULE_LINKS.map(({ label, suffix }) => (
                  <Link
                    key={suffix}
                    href={moduleHref(sub.id, suffix)}
                    className="inline-flex items-center rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-600 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-800"
                  >
                    {label}
                  </Link>
                ))}
              </div>
            </li>
          );
        })}
      </ul>
      <p className="mt-4 text-xs text-slate-500">
        Vista consolidada:{" "}
        <Link href={DELIVERABLES_HUB} className="font-medium underline hover:text-slate-800">
          entregables
        </Link>
        {" · "}
        <Link href={RISKS_HUB} className="font-medium underline hover:text-slate-800">
          riesgos
        </Link>
        {" · "}
        <Link href={PMO_ESCALATIONS} className="font-medium underline hover:text-slate-800">
          escalamientos
        </Link>
      </p>
    </section>
  );
}
