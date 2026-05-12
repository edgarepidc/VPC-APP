export type DashboardNavItem = {
  href: string;
  label: string;
  emoji: string;
};

/** Navegación principal del workspace (sidebar + hoja “Más”). */
export const DASHBOARD_NAV_ITEMS: DashboardNavItem[] = [
  { href: "/dashboard/pmo", label: "PMO Dashboard", emoji: "📊" },
  { href: "/dashboard/projects", label: "Proyectos", emoji: "📁" },
  { href: "/dashboard/tasks", label: "Tareas", emoji: "✅" },
  { href: "/dashboard/deliverables", label: "Entregables", emoji: "📦" },
  { href: "/dashboard/risks", label: "Riesgos", emoji: "⚠️" },
  { href: "/dashboard/stakeholders", label: "Stakeholders", emoji: "🎯" },
  { href: "/dashboard/members", label: "Miembros", emoji: "👥" },
];

/** Barra inferior (móvil): 3 destinos + “Más”. */
export const MOBILE_BOTTOM_PRIMARY: DashboardNavItem[] = [
  { href: "/dashboard/pmo", label: "Inicio", emoji: "📊" },
  { href: "/dashboard/projects", label: "Proyectos", emoji: "📁" },
  { href: "/dashboard/tasks", label: "Tareas", emoji: "✅" },
];

export const STORAGE_SIDEBAR_HIDDEN = "vpc-dash-sidebar-hidden";
