import {
  DELIVERABLE_DETAIL_IN_PROJECT,
  PMO_ESCALATIONS_PROJECT,
  PMO_MEETINGS_PROJECT,
  RISK_DETAIL_IN_PROJECT,
  STAKEHOLDER_DETAIL_IN_PROJECT,
  STAKEHOLDERS_PROJECT,
} from "@/lib/dashboard-paths";

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
    });
  }

  return items.sort((a, b) => a.priority - b.priority).slice(0, 12);
}

export function buildPmoNavBadges(input: {
  overdueDeliverablesCount: number;
  criticalRisksCount: number;
  deteriorationAlertsCount: number;
  meetingCostAlertsCount: number;
  stakeholderAlertsCount: number;
  actionQueueCount: number;
}): PmoNavBadges {
  return {
    resumen: input.actionQueueCount,
    deliverables: input.overdueDeliverablesCount,
    risks: input.criticalRisksCount,
    escalations: input.deteriorationAlertsCount,
    meetings: input.meetingCostAlertsCount,
    stakeholders: input.stakeholderAlertsCount,
  };
}
