import {
  DELIVERABLE_DETAIL_IN_PROJECT,
  PMO_ESCALATIONS_PROJECT,
  PMO_MEETINGS_PROJECT,
  RISK_DETAIL_IN_PROJECT,
  STAKEHOLDER_DETAIL_IN_PROJECT,
  STAKEHOLDERS_PROJECT,
} from "@/lib/dashboard-paths";
import { resolveProjectFilterIds, type ProjectHierarchyRow } from "@/lib/project-hierarchy";

export type PmoActionKind =
  | "escalation_deterioration"
  | "risk_critical"
  | "deliverable_overdue"
  | "meeting_cost"
  | "stakeholder_alert";

export type PmoActionItem = {
  id: string;
  kind: PmoActionKind;
  label: string;
  sublabel: string;
  href: string;
  priority: number;
  projectId: string;
};

export type PmoNavBadgeSource = {
  overdueDeliverables: { projectId: string }[];
  criticalRisks: { projectId: string }[];
  deteriorationAlerts: { projectId: string }[];
  meetingCostAlerts: { projectId: string }[];
  stakeholderAlerts: { projectId: string }[];
};

export type PmoNavBadges = {
  resumen: number;
  deliverables: number;
  risks: number;
  escalations: number;
  meetings: number;
  stakeholders: number;
};

const kindRank: Record<PmoActionKind, number> = {
  escalation_deterioration: 0,
  risk_critical: 1,
  deliverable_overdue: 2,
  meeting_cost: 3,
  stakeholder_alert: 4,
};

const kindLabels: Record<PmoActionKind, string> = {
  escalation_deterioration: "Deterioro escalamiento",
  risk_critical: "Riesgo crítico",
  deliverable_overdue: "Entregable vencido",
  meeting_cost: "Costo reunión",
  stakeholder_alert: "Interesado",
};

export function pmoActionKindLabel(kind: PmoActionKind) {
  return kindLabels[kind];
}

const stakeholderAlertLabels = {
  promoter_no_obs: "Promotor sin nota",
  project_no_promoters: "Sin promotores",
  project_empty: "Sin interesados",
} as const;

const meetingAlertLabels = {
  critical: "Sesión crítica",
  inefficient: "Reunión ineficiente",
  spike: "Salto de costo",
} as const;

export type PmoActionQueueInput = {
  overdueDeliverables: {
    id: string;
    title: string;
    dueDate: Date | null;
    project: { id: string; name: string };
  }[];
  criticalRiskRows: {
    id: string;
    title: string;
    residualScore: number;
    project: { id: string; name: string };
  }[];
  stakeholderAlerts: {
    kind: "promoter_no_obs" | "project_no_promoters" | "project_empty";
    label: string;
    sublabel: string;
    stakeholderId: string | null;
    projectId: string;
  }[];
  deteriorationAlerts: {
    projectId: string;
    projectName: string;
    topic: string | null;
    title: string;
    currentAt: Date;
  }[];
  meetingCostAlerts: {
    projectId: string;
    projectName: string;
    sessionName: string | null;
    alertType: "critical" | "inefficient" | "spike";
    diagnosisTitle: string;
    createdAt: Date;
  }[];
};

export function buildPmoActionQueue(input: PmoActionQueueInput): PmoActionItem[] {
  const items: PmoActionItem[] = [];

  for (const alert of input.deteriorationAlerts) {
    items.push({
      id: `esc-${alert.projectId}-${alert.currentAt.getTime()}`,
      kind: "escalation_deterioration",
      label: alert.projectName,
      sublabel: alert.topic
        ? `${alert.topic} · verde → rojo`
        : `${alert.title} · verde → rojo`,
      href: PMO_ESCALATIONS_PROJECT(alert.projectId),
      priority: kindRank.escalation_deterioration,
      projectId: alert.projectId,
    });
  }

  for (const risk of input.criticalRiskRows) {
    items.push({
      id: `risk-${risk.id}`,
      kind: "risk_critical",
      label: risk.title,
      sublabel: `${risk.project.name} · score ${risk.residualScore}/25`,
      href: RISK_DETAIL_IN_PROJECT(risk.id, risk.project.id),
      priority: kindRank.risk_critical,
      projectId: risk.project.id,
    });
  }

  for (const deliverable of input.overdueDeliverables) {
    items.push({
      id: `del-${deliverable.id}`,
      kind: "deliverable_overdue",
      label: deliverable.title,
      sublabel: `${deliverable.project.name} · venció ${
        deliverable.dueDate?.toLocaleDateString("es-MX") ?? "—"
      }`,
      href: DELIVERABLE_DETAIL_IN_PROJECT(deliverable.id, deliverable.project.id),
      priority: kindRank.deliverable_overdue,
      projectId: deliverable.project.id,
    });
  }

  for (const alert of input.meetingCostAlerts.slice(0, 6)) {
    items.push({
      id: `meet-${alert.projectId}-${alert.alertType}-${alert.createdAt.getTime()}`,
      kind: "meeting_cost",
      label: alert.sessionName ?? alert.projectName,
      sublabel: `${alert.projectName} · ${meetingAlertLabels[alert.alertType]}`,
      href: PMO_MEETINGS_PROJECT(alert.projectId),
      priority: kindRank.meeting_cost,
      projectId: alert.projectId,
    });
  }

  for (const alert of input.stakeholderAlerts.slice(0, 6)) {
    items.push({
      id: `sh-${alert.stakeholderId ?? alert.projectId}-${alert.kind}`,
      kind: "stakeholder_alert",
      label: alert.label,
      sublabel: alert.sublabel,
      href: alert.stakeholderId
        ? STAKEHOLDER_DETAIL_IN_PROJECT(alert.stakeholderId, alert.projectId)
        : STAKEHOLDERS_PROJECT(alert.projectId),
      priority: kindRank.stakeholder_alert,
      projectId: alert.projectId,
    });
  }

  return items.sort((a, b) => a.priority - b.priority).slice(0, 12);
}

function filterByProjectScope<T extends { projectId: string }>(
  items: T[],
  filterIds: string[] | null,
) {
  if (!filterIds) return items;
  return items.filter((item) => filterIds.includes(item.projectId));
}

export function computeScopedPmoNavBadges(
  source: PmoNavBadgeSource,
  actionItems: PmoActionItem[],
  projectHierarchy: ProjectHierarchyRow[],
  scopeFilterId: string,
): PmoNavBadges {
  const filterIds = resolveProjectFilterIds(projectHierarchy, scopeFilterId || null);
  const overdue = filterByProjectScope(source.overdueDeliverables, filterIds);
  const risks = filterByProjectScope(source.criticalRisks, filterIds);
  const escalations = filterByProjectScope(source.deteriorationAlerts, filterIds);
  const meetings = filterByProjectScope(source.meetingCostAlerts, filterIds);
  const stakeholders = filterByProjectScope(source.stakeholderAlerts, filterIds);
  const resumen = filterByProjectScope(actionItems, filterIds).length;

  return {
    resumen,
    deliverables: overdue.length,
    risks: risks.length,
    escalations: escalations.length,
    meetings: meetings.length,
    stakeholders: stakeholders.length,
  };
}
