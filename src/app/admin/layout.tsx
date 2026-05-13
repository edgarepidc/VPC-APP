import Image from "next/image";
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
      <header className="space-y-5 border-b border-slate-200 pb-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 flex-wrap items-start gap-4">
            <Image
              src="/branding/vpc-logo.png"
              alt="VPC — consultora"
              width={56}
              height={56}
              className="h-14 w-14 shrink-0 object-contain"
              priority
            />
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wide text-[#1b3a6b]">
                Consultora VPC
              </p>
              <h1 className="text-lg font-semibold text-slate-900">
                Administración global
              </h1>
              <p className="mt-1 max-w-xl text-sm leading-relaxed text-slate-600">
                Crea y gestiona la organización (tenant) de cada cliente. Los
                usuarios se suman por invitación dentro del workspace del cliente.
              </p>
            </div>
          </div>
          <Link
            className="shrink-0 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
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
