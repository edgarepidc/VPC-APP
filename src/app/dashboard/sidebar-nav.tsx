"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/dashboard/pmo", label: "PMO Dashboard", emoji: "📊" },
  { href: "/dashboard/projects", label: "Proyectos", emoji: "📁" },
  { href: "/dashboard/tasks", label: "Tareas", emoji: "✅" },
  { href: "/dashboard/deliverables", label: "Entregables", emoji: "📦" },
  { href: "/dashboard/risks", label: "Riesgos", emoji: "⚠️" },
  { href: "/dashboard/stakeholders", label: "Stakeholders", emoji: "🎯" },
  { href: "/dashboard/members", label: "Miembros", emoji: "👥" },
];

type SidebarNavProps = {
  showPlatformAdmin?: boolean;
};

export function SidebarNav({ showPlatformAdmin }: SidebarNavProps) {
  const pathname = usePathname();

  return (
    <nav className="mt-6 space-y-1.5 text-sm">
      <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
        Acceso rápido
      </p>
      {navItems.map((item) => {
        const active = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={[
              "dash-nav-link flex items-center gap-2.5 rounded-xl px-3 py-2.5 font-medium transition-colors",
              active ? "dash-nav-link--active text-white" : "text-zinc-300",
            ].join(" ")}
            aria-current={active ? "page" : undefined}
          >
            <span className="text-lg leading-none opacity-95" aria-hidden>
              {item.emoji}
            </span>
            <span>{item.label}</span>
          </Link>
        );
      })}

      <Link
        className="dash-nav-link mt-3 flex items-center gap-2.5 rounded-xl px-3 py-2.5 font-medium text-zinc-300 transition-colors"
        href="/select-tenant"
      >
        <span className="text-lg" aria-hidden>
          🔄
        </span>
        Cambiar tenant
      </Link>

      {showPlatformAdmin && (
        <Link
          className="mt-2 flex items-center gap-2.5 rounded-xl border border-amber-400/35 bg-amber-500/15 px-3 py-2.5 text-sm font-medium text-amber-50 transition hover:bg-amber-500/25"
          href="/admin"
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
