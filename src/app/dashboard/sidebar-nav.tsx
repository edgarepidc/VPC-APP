"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

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
      <p className="dash-nav-section-label mb-2 text-xs font-semibold uppercase tracking-wider">
        Acceso rápido
      </p>
      {DASHBOARD_NAV_ITEMS.map((item) => {
        const active = isNavItemActive(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onLinkClick}
            className={[
              "dash-nav-link flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors",
              active ? "dash-nav-link--active" : "",
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
          className="mt-2 flex items-center gap-2.5 rounded-lg border border-amber-400/40 bg-amber-500/15 px-3 py-2.5 text-sm font-semibold text-amber-100 transition hover:border-amber-400/60 hover:bg-amber-500/25"
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
