import Link from "next/link";
import { redirect } from "next/navigation";

import { getSessionUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { personInitialsFromName, ROLE_SIDEBAR_LABELS } from "@/lib/role-labels";
import type { RoleKey } from "@/lib/types";

import { dashShell } from "@/lib/ui-classes";

import { DashboardChrome } from "./dashboard-chrome";

export const dynamic = "force-dynamic";

function displayPersonName(name: string, email: string): string {
  const n = name?.trim();
  if (n && n !== email) return n;
  return email;
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

  const [tenant, user] = await Promise.all([
    db.tenant.findUnique({
      where: { id: session.activeTenantId },
      select: { name: true },
    }),
    db.user.findUnique({
      where: { id: session.userId },
      select: { name: true, email: true, avatarUrl: true },
    }),
  ]);

  const personDisplayName = displayPersonName(
    user?.name ?? session.name,
    session.email,
  );
  const personInitials = personInitialsFromName(
    user?.name ?? session.name,
    session.email,
  );

  return (
    <div className={dashShell}>
      <DashboardChrome
        personDisplayName={personDisplayName}
        personInitials={personInitials}
        personAvatarUrl={user?.avatarUrl ?? null}
        roleLabel={ROLE_SIDEBAR_LABELS[session.role as RoleKey]}
        tenantName={tenant?.name ?? "Organización"}
        dateLabel={formatTodayEs()}
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
