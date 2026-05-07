"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/dashboard/pmo", label: "PMO Dashboard" },
  { href: "/dashboard/projects", label: "Proyectos" },
  { href: "/dashboard/tasks", label: "Tareas" },
  { href: "/dashboard/deliverables", label: "Entregables" },
  { href: "/dashboard/risks", label: "Riesgos" },
  { href: "/dashboard/stakeholders", label: "Stakeholders" },
  { href: "/dashboard/members", label: "Miembros" },
];

export function SidebarNav() {
  const pathname = usePathname();

  return (
    <nav className="mt-6 space-y-2 text-sm">
      {navItems.map((item) => {
        const active = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={[
              "block rounded px-2 py-1 transition-colors",
              active
                ? "bg-slate-900 text-white hover:bg-slate-900"
                : "text-slate-700 hover:bg-slate-100",
            ].join(" ")}
            aria-current={active ? "page" : undefined}
          >
            {item.label}
          </Link>
        );
      })}

      <Link
        className="block rounded px-2 py-1 text-slate-700 hover:bg-slate-100"
        href="/select-tenant"
      >
        Cambiar tenant
      </Link>
    </nav>
  );
}
