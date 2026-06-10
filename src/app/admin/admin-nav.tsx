"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  {
    href: "/admin",
    label: "Clientes",
    emoji: "🏢",
    match: (pathname: string) =>
      pathname === "/admin" || pathname.startsWith("/admin/tenants"),
  },
  {
    href: "/admin/users",
    label: "Usuarios",
    emoji: "👥",
    match: (pathname: string) =>
      pathname.startsWith("/admin/users") || pathname.startsWith("/admin/invite"),
  },
] as const;

type AdminNavProps = {
  onLinkClick?: () => void;
};

export function AdminNav({ onLinkClick }: AdminNavProps) {
  const pathname = usePathname();

  return (
    <nav className="mt-6 space-y-1.5 text-sm" aria-label="Administración global">
      <p className="dash-nav-section-label mb-2 text-xs font-semibold uppercase tracking-wider">
        Plataforma
      </p>
      {links.map(({ href, label, emoji, match }) => {
        const active = match(pathname);
        return (
          <Link
            key={href}
            href={href}
            onClick={onLinkClick}
            className={[
              "dash-nav-link flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors",
              active ? "dash-nav-link--active" : "",
            ].join(" ")}
            aria-current={active ? "page" : undefined}
          >
            <span className="text-base leading-none" aria-hidden>
              {emoji}
            </span>
            <span>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
