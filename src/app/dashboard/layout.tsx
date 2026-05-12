import Link from "next/link";
import { redirect } from "next/navigation";
import { Lora } from "next/font/google";

import { clearActiveTenant, getSessionUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { getSupabasePublicEnv } from "@/utils/supabase/env";
import { createClient } from "@/utils/supabase/server";
import { SidebarNav } from "./sidebar-nav";

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
  async function signOutAction() {
    "use server";
    if (!getSupabasePublicEnv()) {
      await clearActiveTenant();
      redirect("/login");
    }
    const supabase = await createClient();
    await supabase.auth.signOut();
    await clearActiveTenant();
    redirect("/login");
  }

  const session = await getSessionUser();
  if (!session) redirect("/login");
  if (!session.activeTenantId) redirect("/select-tenant");

  const tenant = await db.tenant.findUnique({
    where: { id: session.activeTenantId },
    select: { name: true, slug: true },
  });

  const first = displayFirstName(session.name, session.email);

  return (
    <div
      className={`${dashSerif.variable} dash-shell mx-auto flex w-full max-w-[1680px] flex-1 flex-col gap-6 px-4 py-6 sm:px-6 sm:py-8`}
    >
      <div className="relative z-[1] flex flex-1 flex-col gap-6 lg:flex-row">
        <aside className="dash-glass w-full shrink-0 p-5 sm:w-72 lg:max-w-[18rem]">
          <p className="dash-greeting text-lg font-medium leading-snug text-zinc-100">
            {greetingWord()},
          </p>
          <p className="mt-1 text-xl font-semibold leading-tight">
            <span className="bg-gradient-to-r from-emerald-300 to-teal-200 bg-clip-text text-transparent">
              {first}
            </span>{" "}
            <span aria-hidden className="dash-hand-wave inline-block">
              👋
            </span>
          </p>
          <p className="mt-2 text-xs leading-relaxed text-zinc-400">
            {tenant?.name ?? "Organización"} · {tenant?.slug ?? "—"} · {formatTodayEs()}
          </p>
          <p className="mt-3 truncate text-[11px] text-zinc-500">{session.email}</p>

          <SidebarNav showPlatformAdmin={session.isSuperAdmin} />

          <form action={signOutAction} className="mt-6">
            <button
              type="submit"
              className="w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2.5 text-sm font-medium text-zinc-200 transition hover:bg-white/10 hover:text-white"
            >
              🚪 Cerrar sesión
            </button>
          </form>
        </aside>

        <section className="dash-content-shell min-h-[min(100vh,920px)] flex-1 overflow-hidden p-4 sm:p-6">
          {session.isPlatformVisit && (
            <div className="mb-5 rounded-xl border border-amber-400/35 bg-amber-500/15 px-4 py-3 text-[13px] leading-relaxed text-amber-50">
              <p className="font-semibold text-amber-100">Modo consultora (sin membresía en este cliente)</p>
              <p className="mt-1 text-amber-100/90">
                Estás operando este workspace como dueño de plataforma. Los cambios afectan datos del
                cliente; úsalo con criterio interno. Para volver a la cartera:{" "}
                <Link href="/admin" className="font-medium text-white underline decoration-amber-200/80">
                  Vista consultora
                </Link>
                .
              </p>
            </div>
          )}
          {children}
        </section>
      </div>
    </div>
  );
}
