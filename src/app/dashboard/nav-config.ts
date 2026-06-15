export type DashboardNavItem = {
  href: string;
  label: string;
  emoji: string;
};

/** Navegación principal del workspace (sidebar + hoja móvil). */
export const DASHBOARD_NAV_ITEMS: DashboardNavItem[] = [
  { href: "/dashboard/pmo", label: "PMO", emoji: "📊" },
  { href: "/dashboard/deliverables", label: "Entregables", emoji: "📦" },
  { href: "/dashboard/risks", label: "Riesgos", emoji: "⚠️" },
  { href: "/dashboard/tasks", label: "Tareas", emoji: "✅" },
  { href: "/dashboard/minutes", label: "Minutas", emoji: "📝" },
  { href: "/dashboard/stakeholders", label: "Interesados", emoji: "🎯" },
  { href: "/dashboard/escalometro", label: "Escalómetro", emoji: "📐" },
  { href: "/dashboard/roi-meetings", label: "ROI reuniones", emoji: "💰" },
  { href: "/dashboard/settings", label: "Configuración", emoji: "⚙️" },
];

export const STORAGE_SIDEBAR_HIDDEN = "vpc-dash-sidebar-hidden";
