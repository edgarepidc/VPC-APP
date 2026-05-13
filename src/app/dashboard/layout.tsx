import Link from "next/link";
import { redirect } from "next/navigation";
import { Lora } from "next/font/google";

import { getSessionUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import type { RoleKey } from "@/lib/types";

import { DashboardChrome } from "./dashboard-chrome";

/** Auth + cookies: do not prerender at build without Supabase env. */
export const dynamic = "force-dynamic";

const dashSerif = Lora({
  subsets: ["latin"],
  weight: ["500", "600"],
  variable: "--font-dash-serif",
});

function roleLabelEs(role: RoleKey): string {
  const map: Record<RoleKey, string> = {
    owner: "Propietario",
    admin: "Administrador",
    manager: "Gestor",
    member: "Miembro",
  };
  return map[role];
}

function displayPersonName(name: string, email: string): string {
  const n = name?.trim();
  if (n && n !== email) return n;
  return email;
}

function tenantInitialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    const a = parts[0][0];
    const b = parts[1][0];
    if (a && b) return `${a}${b}`.toUpperCase();
  }
  const w = parts[0] ?? "?";
  return w.slice(0, 2).toUpperCase();
}

function formatTodayEs(): string {
  const raw = new Intl.DateTimeFormat("es-MX", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date());
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

export default async function DashboardLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const session = await getSessionUser();
  if (!session) redirect("/login");
  if (!session.activeTenantId) redirect("/select-tenant");

  const tenant = await db.tenant.findUnique({
    where: { id: session.activeTenantId },
    select: { name: true, slug: true, logoUrl: true },
  });

  const personDisplayName = displayPersonName(session.name, session.email);
  const tenantInitials = tenantInitialsFromName(tenant?.name ?? "Org");

  return (
    <div
      className={`${dashSerif.variable} dash-shell mx-auto flex w-full max-w-[1680px] flex-1 flex-col gap-6 px-4 py-6 sm:px-6 sm:py-8`}
    >
      <DashboardChrome
        personDisplayName={personDisplayName}
        roleLabel={roleLabelEs(session.role)}
        tenantName={tenant?.name ?? "Organización"}
        tenantSlug={tenant?.slug ?? "—"}
        dateLabel={formatTodayEs()}
        tenantLogoUrl={tenant?.logoUrl ?? null}
        tenantInitials={tenantInitials}
        showPlatformAdmin={session.isSuperAdmin}
        mainBanner={
          session.isPlatformVisit ? (
            <div className="mb-5 rounded-xl border border-[#c9a46c]/40 bg-[linear-gradient(135deg,#faf6ef_0%,#f3ead8_100%)] px-4 py-3 text-[13px] leading-relaxed text-[#3d2a12] ring-1 ring-[#0f1f5c]/[0.06]">
              <p className="font-semibold text-[#0f1f5c]">
                Modo consultora (sin membresía en este cliente)
              </p>
              <p className="mt-1 text-[#4a4234]">
                Estás operando este workspace como dueño de plataforma. Los cambios afectan datos del
                cliente; úsalo con criterio interno. Para volver a la cartera:{" "}
                <Link
                  href="/admin"
                  className="font-semibold text-[#0f1f5c] underline decoration-[#c9a46c]/60 underline-offset-2"
                >
                  Vista consultora
                </Link>
                .
              </p>
            </div>
          ) : undefined
        }
      >
        {children}
      </DashboardChrome>
    </div>
  );
}
