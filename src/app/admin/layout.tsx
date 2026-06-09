import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";

import { uiButtonSecondary } from "@/lib/ui-classes";
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
    <div className="app-shell mx-auto flex w-full max-w-6xl flex-1 flex-col gap-4 px-6 py-8">
      <header className="space-y-5 border-b border-slate-200 pb-5">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div className="flex min-w-0 flex-wrap items-start gap-5 sm:gap-6">
            <div className="shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
              <Image
                src="/branding/vpc-logo.png"
                alt="Value Project Consulting"
                width={331}
                height={331}
                className="h-[5.25rem] w-[5.25rem] object-contain sm:h-[6.5rem] sm:w-[6.5rem]"
                priority
              />
            </div>
            <div className="min-w-0 pt-0.5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                Value Project Consulting
              </p>
              <h1 className="mt-1.5 text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">
                Administración global
              </h1>
              <p className="mt-2 max-w-xl border-l-2 border-slate-300 pl-3 text-sm leading-relaxed text-slate-600">
                Operación de cartera multitenant: organizaciones cliente, altas y
                accesos coordinados desde un solo panel.
              </p>
            </div>
          </div>
          <Link className={uiButtonSecondary} href="/dashboard/projects">
            Volver al tablero
          </Link>
        </div>
        <AdminNav />
      </header>
      {children}
    </div>
  );
}
