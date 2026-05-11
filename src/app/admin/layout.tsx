import Link from "next/link";
import { redirect } from "next/navigation";

import { getSessionUser } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const session = await getSessionUser();
  if (!session) redirect("/login");
  if (!session.isSuperAdmin) redirect("/dashboard/projects");

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-4 px-6 py-8">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-amber-800">
            Plataforma
          </p>
          <h1 className="text-lg font-semibold text-slate-900">
            Administracion global
          </h1>
        </div>
        <Link
          className="rounded-md border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50"
          href="/dashboard/projects"
        >
          Volver al tablero
        </Link>
      </header>
      {children}
    </div>
  );
}
