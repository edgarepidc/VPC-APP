import Link from "next/link";
import { redirect } from "next/navigation";

import { getSessionUser } from "@/lib/auth/session";

export default async function DashboardLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const session = await getSessionUser();
  if (!session) redirect("/login");
  if (!session.activeTenantId) redirect("/select-tenant");

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 gap-6 px-6 py-8">
      <aside className="w-64 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
        <p className="text-xs uppercase tracking-wide text-zinc-500">Tenant</p>
        <p className="mt-1 text-sm font-medium text-zinc-800">
          {session.activeTenantId}
        </p>
        <nav className="mt-6 space-y-2 text-sm">
          <Link className="block rounded px-2 py-1 hover:bg-zinc-100" href="/dashboard/projects">
            Proyectos
          </Link>
          <Link className="block rounded px-2 py-1 hover:bg-zinc-100" href="/dashboard/tasks">
            Tareas
          </Link>
          <Link className="block rounded px-2 py-1 hover:bg-zinc-100" href="/select-tenant">
            Cambiar tenant
          </Link>
        </nav>
      </aside>
      <section className="flex-1">{children}</section>
    </div>
  );
}
