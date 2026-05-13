import Link from "next/link";
import { redirect } from "next/navigation";
import { Lora } from "next/font/google";

import { getSessionUser } from "@/lib/auth/session";
import { db } from "@/lib/db";

import { DashboardChrome } from "./dashboard-chrome";

/** Auth + cookies: do not prerender at build without Supabase env. */
export const dynamic = "force-dynamic";

const dashSerif = Lora({
  subsets: ["latin"],
  weight: ["500", "600"],
  variable: "--font-dash-serif",
});

function greetingWord(): string {
  const h = new Date().getHours();
  if (h < 12) return "Buenos días";
  if (h < 19) return "Buenas tardes";
  return "Buenas noches";
}

function displayFirstName(name: string, email: string): string {
  const n = name?.trim();
  if (n && n !== email) {
    const first = n.split(/\s+/)[0];
    if (first) return first;
  }
  return email.split("@")[0] ?? "equipo";
}

function formatTodayEs(): string {
  return new Intl.DateTimeFormat("es-MX", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date());
}

export default async function DashboardLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const session = await getSessionUser();
  if (!session) redirect("/login");
  if (!session.activeTenantId) redirect("/select-tenant");

  const tenant = await db.tenant.findUnique({
    where: { id: session.activeTenantId },
    select: { name: true, slug: true },
  });

  const first = displayFirstName(session.name, session.email);
  const tenantLine = `${tenant?.name ?? "Organización"} · ${tenant?.slug ?? "—"} · ${formatTodayEs()}`;

  return (
    <div
      className={`${dashSerif.variable} dash-shell mx-auto flex w-full max-w-[1680px] flex-1 flex-col gap-6 px-4 py-6 sm:px-6 sm:py-8`}
    >
      <DashboardChrome
        greetingWord={greetingWord()}
        firstName={first}
        tenantLine={tenantLine}
        email={session.email}
        showPlatformAdmin={session.isSuperAdmin}
        mainBanner={
          session.isPlatformVisit ? (
            <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-[13px] leading-relaxed text-amber-950">
              <p className="font-semibold text-amber-900">Modo consultora (sin membresía en este cliente)</p>
              <p className="mt-1 text-amber-900/90">
                Estás operando este workspace como dueño de plataforma. Los cambios afectan datos del cliente;
                úsalo con criterio interno. Para volver a la cartera:{" "}
                <Link href="/admin" className="font-medium text-amber-950 underline decoration-amber-400">
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
