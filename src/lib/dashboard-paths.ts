/** Rutas unificadas del hub PMO (resumen, proyectos, equipo). */
export const PMO_HUB = "/dashboard/pmo";
export const PMO_PROJECTS = "/dashboard/pmo/projects";
export const PMO_PROJECT_DETAIL = (projectId: string) =>
  `/dashboard/pmo/projects/${encodeURIComponent(projectId)}`;
export const PMO_TEAM = "/dashboard/pmo/team";
export const PMO_ESCALATIONS = "/dashboard/pmo/escalations";
export const PMO_MEETINGS = "/dashboard/pmo/meetings";
export const PMO_DELIVERABLES = "/dashboard/pmo/deliverables";
export const PMO_RISKS = "/dashboard/pmo/risks";
export const PMO_STAKEHOLDERS = "/dashboard/pmo/stakeholders";

export const DELIVERABLES_HUB = "/dashboard/deliverables";
export const DELIVERABLE_DETAIL = (id: string) =>
  `/dashboard/deliverables?id=${encodeURIComponent(id)}`;
export const DELIVERABLE_DETAIL_IN_PROJECT = (id: string, projectId: string) =>
  `/dashboard/deliverables?id=${encodeURIComponent(id)}&project=${encodeURIComponent(projectId)}`;
export const DELIVERABLES_PROJECT = (projectId: string) =>
  `/dashboard/deliverables?project=${encodeURIComponent(projectId)}`;

export const RISKS_HUB = "/dashboard/risks";
export const RISK_DETAIL = (id: string) =>
  `/dashboard/risks?id=${encodeURIComponent(id)}`;
export const RISK_DETAIL_IN_PROJECT = (id: string, projectId: string) =>
  `/dashboard/risks?id=${encodeURIComponent(id)}&project=${encodeURIComponent(projectId)}`;
export const RISKS_PROJECT = (projectId: string) =>
  `/dashboard/risks?project=${encodeURIComponent(projectId)}`;

export const STAKEHOLDERS_HUB = "/dashboard/stakeholders";
export const STAKEHOLDER_DETAIL = (id: string) =>
  `/dashboard/stakeholders?id=${encodeURIComponent(id)}`;
export const STAKEHOLDER_DETAIL_IN_PROJECT = (id: string, projectId: string) =>
  `/dashboard/stakeholders?id=${encodeURIComponent(id)}&project=${encodeURIComponent(projectId)}`;
export const STAKEHOLDERS_PROJECT = (projectId: string) =>
  `/dashboard/stakeholders?project=${encodeURIComponent(projectId)}`;
export const STAKEHOLDERS_QUADRANT = (quadrant: string, projectId?: string) => {
  const p = new URLSearchParams({ q: quadrant });
  if (projectId) p.set("project", projectId);
  return `/dashboard/stakeholders?${p.toString()}`;
};

export const ESCALOMETRO_HUB = "/dashboard/escalometro";
export const ESCALOMETRO_DETAIL = (id: string) =>
  `/dashboard/escalometro?id=${encodeURIComponent(id)}`;
export const ESCALOMETRO_DETAIL_IN_PROJECT = (id: string, projectId: string) =>
  `/dashboard/escalometro?id=${encodeURIComponent(id)}&project=${encodeURIComponent(projectId)}`;
export const ESCALOMETRO_PROJECT = (projectId: string) =>
  `/dashboard/escalometro?project=${encodeURIComponent(projectId)}`;
export const ROI_MEETINGS_HUB = "/dashboard/roi-meetings";
export const MINUTES_HUB = "/dashboard/minutes";
export const MINUTES_DETAIL = (minuteId: string) =>
  `/dashboard/minutes/${encodeURIComponent(minuteId)}`;
export const TASKS_HUB = "/dashboard/tasks";

export const PMO_ESCALATIONS_PROJECT = (projectId: string) =>
  `${PMO_ESCALATIONS}?project=${encodeURIComponent(projectId)}`;
export const PMO_ESCALATIONS_DETAIL = (id: string) =>
  `${PMO_ESCALATIONS}?id=${encodeURIComponent(id)}`;
export const PMO_MEETINGS_PROJECT = (projectId: string) =>
  `${PMO_MEETINGS}?projectId=${encodeURIComponent(projectId)}`;

export const ESCALOMETRO_REPORT = (checkId: string) =>
  `/dashboard/escalometro/report/${checkId}`;

export const DASHBOARD_SETTINGS = "/dashboard/settings";

/** Rutas legacy — redirigen al hub PMO. */
export const LEGACY_PROJECTS = "/dashboard/projects";
export const LEGACY_MEMBERS = "/dashboard/members";
