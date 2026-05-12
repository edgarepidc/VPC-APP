import Link from "next/link";
import { redirect } from "next/navigation";

import { getSessionUser } from "@/lib/auth/session";

import { AdminNav } from "./admin-nav";

export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const session = await getSessionUser();
  if (!session) redirect("/login");
  if (!session.isSuperAdmin) redirect("/dashboard/projects");

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-4 px-6 py-8">
      <header className="space-y-4 border-b border-slate-200 pb-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-amber-800">
              Plataforma SaaS
            </p>
            <h1 className="text-lg font-semibold text-slate-900">
              Administración global
            </h1>
            <p className="mt-1 max-w-xl text-sm text-slate-600">
              Crea y gestiona la organización (tenant) de cada cliente. Los
              usuarios se suman por invitación dentro del workspace del cliente.
            </p>
          </div>
          <Link
            className="shrink-0 rounded-md border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50"
            href="/dashboard/projects"
          >
            Volver al tablero
          </Link>
        </div>
        <AdminNav />
      </header>
      {children}
    </div>
  );
}
