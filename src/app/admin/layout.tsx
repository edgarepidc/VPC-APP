import Image from "next/image";
import Link from "next/link";

import { adminShell, uiButtonSecondary } from "@/lib/ui-classes";
import { PMO_HUB } from "@/lib/dashboard-paths";
import { requirePlatformSuperAdmin } from "@/lib/auth/platform-admin";

import { AdminNav } from "./admin-nav";

export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  await requirePlatformSuperAdmin();

  return (
    <div className={adminShell}>
      <header className="border-b border-slate-200 pb-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-4">
            <div className="shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-white p-2">
              <Image
                src="/branding/vpc-logo.png"
                alt="Value Project Consulting"
                width={331}
                height={331}
                className="h-11 w-11 object-contain sm:h-12 sm:w-12"
                priority
              />
            </div>
            <div className="min-w-0">
              <h1 className="text-lg font-semibold text-slate-900">
                Administración global
              </h1>
              <p className="text-sm text-slate-600">
                Cartera de clientes y accesos de la plataforma.
              </p>
            </div>
          </div>
          <Link className={uiButtonSecondary} href={PMO_HUB}>
            Volver al tablero
          </Link>
        </div>
        <div className="mt-4">
          <AdminNav />
        </div>
      </header>
      {children}
    </div>
  );
}
