"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/admin", label: "Cartera de clientes" },
  { href: "/admin/tenants", label: "Organizaciones (tenants)" },
  { href: "/admin/invite", label: "Invitar usuario" },
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
                ? "rounded-lg bg-[#0f1f5c]/10 px-3 py-1.5 text-sm font-semibold text-[#0f1f5c] ring-1 ring-[#0f1f5c]/20"
                : "rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm hover:border-slate-300 hover:bg-slate-50"
            }
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
