import { redirect } from "next/navigation";

import { clearActiveTenant, getSessionUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { getSupabasePublicEnv } from "@/utils/supabase/env";
import { createClient } from "@/utils/supabase/server";
import { SidebarNav } from "./sidebar-nav";

/** Auth + cookies: do not prerender at build without Supabase env. */
export const dynamic = "force-dynamic";

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

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-1 gap-6 px-6 py-8">
      <aside className="pmo-card w-64 p-4">
        <p className="text-xs uppercase tracking-wide text-slate-500">
          Organizacion
        </p>
        <p className="mt-1 text-sm font-medium text-slate-800">
          {tenant?.name ?? "Tenant"}
        </p>
        <p className="mt-0.5 text-xs text-slate-500">{tenant?.slug}</p>
        <p className="mt-2 text-xs text-slate-500">{session.email}</p>
        <SidebarNav showPlatformAdmin={session.isSuperAdmin} />
        <form action={signOutAction} className="mt-6">
          <button
            type="submit"
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm hover:bg-slate-100"
          >
            Cerrar sesion
          </button>
        </form>
      </aside>
      <section className="flex-1">{children}</section>
    </div>
  );
}
