"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { dashTabActive, dashTabIdle } from "@/lib/ui-classes";
import {
  PMO_HUB,
  PMO_PROJECTS,
  PMO_TEAM,
  PMO_ESCALATIONS,
  PMO_MEETINGS,
  PMO_DELIVERABLES,
  PMO_RISKS,
  PMO_STAKEHOLDERS,
} from "@/lib/dashboard-paths";

const TABS = [
  { href: PMO_HUB, label: "Resumen", exact: true },
  { href: PMO_PROJECTS, label: "Proyectos", exact: false },
  { href: PMO_DELIVERABLES, label: "Entregables", exact: false },
  { href: PMO_RISKS, label: "Riesgos", exact: false },
  { href: PMO_ESCALATIONS, label: "Escalamientos", exact: false },
  { href: PMO_MEETINGS, label: "Reuniones", exact: false },
  { href: PMO_STAKEHOLDERS, label: "Stakeholders", exact: false },
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
      className="mb-4 -mx-1 flex gap-1 overflow-x-auto border-b border-slate-200 pb-2 px-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      aria-label="Secciones PMO"
    >
      {TABS.map((tab) => {
        const active = isTabActive(pathname, tab.href, tab.exact);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`${active ? dashTabActive : dashTabIdle} shrink-0 whitespace-nowrap`}
            aria-current={active ? "page" : undefined}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
