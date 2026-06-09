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

import type { PmoNavBadges } from "./pmo-action-utils";

const TABS = [
  { href: PMO_HUB, label: "Resumen", exact: true, badgeKey: "resumen" as const },
  { href: PMO_PROJECTS, label: "Proyectos", exact: false, badgeKey: null },
  { href: PMO_DELIVERABLES, label: "Entregables", exact: false, badgeKey: "deliverables" as const },
  { href: PMO_RISKS, label: "Riesgos", exact: false, badgeKey: "risks" as const },
  { href: PMO_ESCALATIONS, label: "Escalamientos", exact: false, badgeKey: "escalations" as const },
  { href: PMO_MEETINGS, label: "Reuniones", exact: false, badgeKey: "meetings" as const },
  { href: PMO_STAKEHOLDERS, label: "Interesados", exact: false, badgeKey: "stakeholders" as const },
  { href: PMO_TEAM, label: "Equipo", exact: false, badgeKey: null },
] as const;

function isTabActive(pathname: string, href: string, exact: boolean) {
  if (exact) return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

type PmoSubnavProps = {
  badges?: PmoNavBadges;
};

export function PmoSubnav({ badges }: PmoSubnavProps) {
  const pathname = usePathname();

  return (
    <nav
      className="mb-4 -mx-1 flex gap-1 overflow-x-auto border-b border-slate-200 pb-2 px-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      aria-label="Secciones PMO"
    >
      {TABS.map((tab) => {
        const active = isTabActive(pathname, tab.href, tab.exact);
        const count = tab.badgeKey && badges ? badges[tab.badgeKey] : 0;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`${active ? dashTabActive : dashTabIdle} inline-flex shrink-0 items-center whitespace-nowrap`}
            aria-current={active ? "page" : undefined}
          >
            {tab.label}
            {count > 0 ? (
              <span
                className="ml-1.5 inline-flex min-h-[1.125rem] min-w-[1.125rem] items-center justify-center rounded-full bg-rose-600 px-1 text-[10px] font-semibold leading-none text-white"
                aria-label={`${count} pendientes`}
              >
                {count > 99 ? "99+" : count}
              </span>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}
