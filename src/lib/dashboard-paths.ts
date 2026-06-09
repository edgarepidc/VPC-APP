/** Rutas unificadas del hub PMO (resumen, proyectos, equipo). */
export const PMO_HUB = "/dashboard/pmo";
export const PMO_PROJECTS = "/dashboard/pmo/projects";
export const PMO_TEAM = "/dashboard/pmo/team";
export const PMO_ESCALATIONS = "/dashboard/pmo/escalations";
export const PMO_MEETINGS = "/dashboard/pmo/meetings";

export const ESCALOMETRO_REPORT = (checkId: string) =>
  `/dashboard/escalometro/report/${checkId}`;

/** Rutas legacy — redirigen al hub PMO. */
export const LEGACY_PROJECTS = "/dashboard/projects";
export const LEGACY_MEMBERS = "/dashboard/members";
