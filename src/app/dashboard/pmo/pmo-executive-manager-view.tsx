"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { DashboardScopeSelect } from "@/app/dashboard/_components/dashboard-scope-select";
import { DashboardSectionShell } from "@/app/dashboard/_components/section-shell";
import type { ProjectHierarchyGroup, ProjectHierarchyRow } from "@/lib/project-hierarchy";

import { type PmoActionItem } from "./pmo-action-utils";
import { PmoActionQueue } from "./pmo-action-queue";
import { PmoExecutiveKpiBar } from "./pmo-executive-kpi-bar";
import { PmoPulseStrip } from "./pmo-pulse-strip";
import { type ProjectHealthRow, ProjectHealthPanel } from "./project-health-panel";

type PmoExecutiveManagerViewProps = {
  projectGroups: ProjectHierarchyGroup[];
  projectHierarchy: ProjectHierarchyRow[];
  initialProject?: string;
  kpis: {
    projects: number;
    deliverables: number;
    overdueDeliverables: number;
    deliverableOnTimePct: number | null;
    risks: number;
    criticalRisks: number;
    escalationChecks: number;
    portfolioProgressPct: number;
  };
  escalationCounts: { red: number; orange: number; green: number };
  meetingCounts: { bajo: number; moderado: number; alto: number; critico: number };
  totalMeetingCostMxn: number;
  actionItems: PmoActionItem[];
  projectHealth: ProjectHealthRow[];
};

function mxn(value: number) {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    maximumFractionDigits: 0,
  }).format(value);
}

export function PmoExecutiveManagerView({
  projectGroups,
  projectHierarchy,
  initialProject = "",
  kpis,
  escalationCounts,
  meetingCounts,
  totalMeetingCostMxn,
  actionItems,
  projectHealth,
}: PmoExecutiveManagerViewProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [projectFilter, setProjectFilter] = useState(() => {
    if (initialProject && projectHierarchy.some((p) => p.id === initialProject)) {
      return initialProject;
    }
    return "";
  });

  function syncUrl(project: string) {
    const p = new URLSearchParams(searchParams.toString());
    if (project) p.set("project", project);
    else p.delete("project");
    p.delete("projectId");
    const qs = p.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  function setProject(next: string) {
    setProjectFilter(next);
    syncUrl(next);
  }

  useEffect(() => {
    const raw = initialProject ?? "";
    if (raw && projectHierarchy.some((p) => p.id === raw)) {
      setProjectFilter(raw);
    } else if (!raw) {
      setProjectFilter("");
    }
  }, [initialProject, projectHierarchy]);

  return (
    <DashboardSectionShell
      eyebrow="PMO"
      title="Resumen ejecutivo"
      titleAs="h1"
      headerTrailing={
        <DashboardScopeSelect
          value={projectFilter}
          onChange={setProject}
          groups={projectGroups}
          allLabel="Todas las iniciativas"
          aria-label="Filtrar por iniciativa o subproyecto"
        />
      }
      bodyClassName="p-4"
    >
      <div className="space-y-4 text-slate-900">
        <PmoExecutiveKpiBar kpis={kpis} />

        <PmoPulseStrip
          escalationCounts={escalationCounts}
          meetingCounts={meetingCounts}
          totalMeetingCostMxn={totalMeetingCostMxn}
          formatMxn={mxn}
        />

        <PmoActionQueue items={actionItems} />

        <ProjectHealthPanel
          rows={projectHealth}
          portfolioProgressPct={kpis.portfolioProgressPct}
        />
      </div>
    </DashboardSectionShell>
  );
}
