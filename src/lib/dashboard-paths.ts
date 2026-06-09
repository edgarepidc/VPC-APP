/** Rutas unificadas del hub PMO (resumen, proyectos, equipo). */
export const PMO_HUB = "/dashboard/pmo";
export const PMO_PROJECTS = "/dashboard/pmo/projects";
export const PMO_TEAM = "/dashboard/pmo/team";
export const PMO_ESCALATIONS = "/dashboard/pmo/escalations";
export const PMO_MEETINGS = "/dashboard/pmo/meetings";
export const PMO_DELIVERABLES = "/dashboard/pmo/deliverables";

export const DELIVERABLES_HUB = "/dashboard/deliverables";
export const DELIVERABLE_DETAIL = (id: string) =>
  `/dashboard/deliverables?id=${encodeURIComponent(id)}`;
export const DELIVERABLE_DETAIL_IN_PROJECT = (id: string, projectId: string) =>
  `/dashboard/deliverables?id=${encodeURIComponent(id)}&project=${encodeURIComponent(projectId)}`;
export const DELIVERABLES_PROJECT = (projectId: string) =>
  `/dashboard/deliverables?project=${encodeURIComponent(projectId)}`;

export const ESCALOMETRO_REPORT = (checkId: string) =>
  `/dashboard/escalometro/report/${checkId}`;

/** Rutas legacy — redirigen al hub PMO. */
export const LEGACY_PROJECTS = "/dashboard/projects";
export const LEGACY_MEMBERS = "/dashboard/members";
