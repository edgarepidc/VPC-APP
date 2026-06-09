"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { uiSectionLabel } from "@/lib/ui-classes";

import { DASHBOARD_NAV_ITEMS } from "./nav-config";

type SidebarNavProps = {
  showPlatformAdmin?: boolean;
  onLinkClick?: () => void;
};

function isNavItemActive(pathname: string, href: string): boolean {
  if (href === "/dashboard/pmo") {
    return pathname === href || pathname.startsWith("/dashboard/pmo/");
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function SidebarNav({ showPlatformAdmin, onLinkClick }: SidebarNavProps) {
  const pathname = usePathname();

  return (
    <nav className="mt-6 space-y-1.5 text-sm">
      <p className={uiSectionLabel}>Acceso rápido</p>
      {DASHBOARD_NAV_ITEMS.map((item) => {
        const active = isNavItemActive(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onLinkClick}
            className={[
              "dash-nav-link flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors",
              active ? "dash-nav-link--active text-slate-900" : "text-slate-600",
            ].join(" ")}
            aria-current={active ? "page" : undefined}
          >
            <span className="text-base leading-none" aria-hidden>
              {item.emoji}
            </span>
            <span>{item.label}</span>
          </Link>
        );
      })}

      {showPlatformAdmin && (
        <Link
          className="mt-2 flex items-center gap-2.5 rounded-lg border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm font-semibold text-slate-800 shadow-sm transition hover:border-slate-400 hover:bg-slate-100"
          href="/admin"
          onClick={onLinkClick}
        >
          <span className="text-lg" aria-hidden>
            🛡️
          </span>
          Vista consultora
        </Link>
      )}
    </nav>
  );
}
