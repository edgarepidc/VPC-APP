import type { EscalationDetailRecord } from "@/app/dashboard/pmo/escalation-detail-dialog";
import type { DeteriorationAlertRow } from "@/app/dashboard/pmo/escalation-deterioration-alerts";
import { resolveProjectFilterIds, type ProjectHierarchyRow } from "@/lib/project-hierarchy";

export const ESCALATION_TIERS = ["green", "orange", "red"] as const;
export type EscalationTierFilter = (typeof ESCALATION_TIERS)[number];

export function normalizeEscalationTier(raw: string | undefined): EscalationTierFilter | "" {
  const v = raw?.trim().toLowerCase();
  return ESCALATION_TIERS.includes(v as EscalationTierFilter) ? (v as EscalationTierFilter) : "";
}

export function filterEscalationHistory(
  rows: EscalationDetailRecord[],
  opts: {
    projectHierarchy: ProjectHierarchyRow[];
    projectFilter: string;
    q: string;
    tierFilter: EscalationTierFilter | "";
  },
) {
  const filterIds = resolveProjectFilterIds(opts.projectHierarchy, opts.projectFilter || null);
  const ql = opts.q.trim().toLowerCase();
  return rows.filter((row) => {
    const projectOk = !filterIds || filterIds.includes(row.project.id);
    const tierOk = !opts.tierFilter || row.tier === opts.tierFilter;
    const hay =
      !ql ||
      row.project.name.toLowerCase().includes(ql) ||
      row.title.toLowerCase().includes(ql) ||
      (row.topic ?? "").toLowerCase().includes(ql) ||
      row.authorName.toLowerCase().includes(ql);
    return projectOk && tierOk && hay;
  });
}

export function computeEscalationKpis(
  rows: EscalationDetailRecord[],
  projectHierarchy: ProjectHierarchyRow[],
  projectFilter: string,
) {
  const filterIds = resolveProjectFilterIds(projectHierarchy, projectFilter || null);
  const scoped = rows.filter((row) => !filterIds || filterIds.includes(row.project.id));
  const countTier = (tier: EscalationTierFilter) =>
    scoped.filter((row) => row.tier === tier).length;
  return {
    total: scoped.length,
    green: countTier("green"),
    orange: countTier("orange"),
    red: countTier("red"),
  };
}

export function filterDeteriorationAlerts(
  alerts: DeteriorationAlertRow[],
  projectHierarchy: ProjectHierarchyRow[],
  projectFilter: string,
) {
  const filterIds = resolveProjectFilterIds(projectHierarchy, projectFilter || null);
  if (!filterIds) return alerts;
  return alerts.filter((alert) => filterIds.includes(alert.projectId));
}
