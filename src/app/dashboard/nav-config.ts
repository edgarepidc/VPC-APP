export type DashboardNavItem = {
  href: string;
  label: string;
  emoji: string;
};

/** Navegación principal del workspace (sidebar + hoja móvil). */
export const DASHBOARD_NAV_ITEMS: DashboardNavItem[] = [
  { href: "/dashboard/pmo", label: "PMO", emoji: "📊" },
  { href: "/dashboard/projects", label: "Proyectos", emoji: "📁" },
  { href: "/dashboard/escalometro", label: "Escalómetro", emoji: "📐" },
  { href: "/dashboard/roi-meetings", label: "ROI", emoji: "💰" },
  { href: "/dashboard/deliverables", label: "Entregables", emoji: "📦" },
  { href: "/dashboard/risks", label: "Riesgos", emoji: "⚠️" },
  { href: "/dashboard/stakeholders", label: "Stakeholders", emoji: "🎯" },
  { href: "/dashboard/members", label: "Miembros", emoji: "👥" },
];

export const STORAGE_SIDEBAR_HIDDEN = "vpc-dash-sidebar-hidden";
