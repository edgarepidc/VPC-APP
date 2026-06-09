import Link from "next/link";
import { redirect } from "next/navigation";

import { getSessionUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import type { RoleKey } from "@/lib/types";

import { dashShell } from "@/lib/ui-classes";

import { DashboardChrome } from "./dashboard-chrome";

export const dynamic = "force-dynamic";

function roleLabelEs(role: RoleKey): string {
  const map: Record<RoleKey, string> = {
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
    <div className={dashShell}>
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
            <div className="mb-4 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700">
              <p className="font-semibold text-slate-900">
                Modo consultora (sin membresía en este cliente)
              </p>
              <p className="mt-1">
                Estás operando este workspace como dueño de plataforma. Los cambios afectan datos del
                cliente; úsalo con criterio interno. Para volver a la cartera:{" "}
                <Link
                  href="/admin"
                  className="font-semibold text-slate-900 underline decoration-slate-400 underline-offset-2"
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
