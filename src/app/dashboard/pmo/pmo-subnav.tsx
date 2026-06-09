"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { dashTabActive, dashTabIdle } from "@/lib/ui-classes";
import { PMO_HUB, PMO_PROJECTS, PMO_TEAM, PMO_ESCALATIONS } from "@/lib/dashboard-paths";

const TABS = [
  { href: PMO_HUB, label: "Resumen", exact: true },
  { href: PMO_PROJECTS, label: "Proyectos", exact: false },
  { href: PMO_ESCALATIONS, label: "Escalamientos", exact: false },
  { href: PMO_TEAM, label: "Equipo", exact: false },
] as const;

function isTabActive(pathname: string, href: string, exact: boolean) {
  if (exact) return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function PmoSubnav() {
  const pathname = usePathname();

  return (
    <nav
      className="mb-4 flex flex-wrap gap-1 border-b border-slate-200 pb-2"
      aria-label="Secciones PMO"
    >
      {TABS.map((tab) => {
        const active = isTabActive(pathname, tab.href, tab.exact);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={active ? dashTabActive : dashTabIdle}
            aria-current={active ? "page" : undefined}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
