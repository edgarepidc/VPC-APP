"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  {
    href: "/admin",
    label: "Clientes",
    match: (pathname: string) =>
      pathname === "/admin" || pathname.startsWith("/admin/tenants"),
  },
  {
    href: "/admin/invite",
    label: "Accesos",
    match: (pathname: string) => pathname.startsWith("/admin/invite"),
  },
] as const;

export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-wrap gap-2" aria-label="Administración global">
      {links.map(({ href, label, match }) => {
        const active = match(pathname);
        return (
          <Link
            key={href}
            href={href}
            className={
              active
                ? "rounded-lg bg-slate-800 px-3.5 py-2 text-sm font-semibold text-white hover:bg-slate-700"
                : "rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            }
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
