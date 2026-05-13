"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  {
    href: "/admin",
    label: "Cartera de clientes",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path
          d="M4 20V9l8-4 8 4v11"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        <path d="M9 20v-6h6v6" stroke="currentColor" strokeWidth="1.5" />
      </svg>
    ),
  },
  {
    href: "/admin/tenants",
    label: "Organizaciones",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path
          d="M4 6h16v12H4z"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        <path d="M8 10h8M8 14h5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    href: "/admin/invite",
    label: "Invitar usuario",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path
          d="M4 7h16v10H4z"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        <path
          d="M4 8l8 5 8-5"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
] as const;

export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav
      className="flex flex-wrap gap-2"
      aria-label="Secciones administración Value Project Consulting"
    >
      {links.map(({ href, label, icon }) => {
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
                ? "flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#0f1f5c] to-[#1a3560] px-3.5 py-2 text-sm font-semibold text-white shadow-md shadow-[#0f1f5c]/25 ring-1 ring-[#c9a46c]/35 transition hover:brightness-110"
                : "flex items-center gap-2 rounded-xl border border-[#e3d6c4] bg-[linear-gradient(180deg,#ffffff,#faf8f4)] px-3.5 py-2 text-sm font-medium text-[#3d4a5c] shadow-sm transition hover:border-[#c9a46c]/55 hover:shadow"
            }
          >
            <span className={active ? "text-white/95" : "text-[#6b5c48]"}>{icon}</span>
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
