"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/admin", label: "Cartera de clientes" },
  { href: "/admin/tenants", label: "Organizaciones (tenants)" },
] as const;

export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-wrap gap-2" aria-label="Secciones admin plataforma">
      {links.map(({ href, label }) => {
        const active =
          href === "/admin"
            ? pathname === "/admin"
            : pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            href={href}
            className={
              active
                ? "rounded-md bg-amber-100 px-3 py-1.5 text-sm font-medium text-amber-950 ring-1 ring-amber-300/60"
                : "rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
            }
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
