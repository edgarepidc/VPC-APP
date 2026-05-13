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
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-4 bg-[linear-gradient(180deg,#faf8f4_0%,#ffffff_14rem)] px-6 py-8">
      <header className="space-y-5 border-b border-[#c9a46c]/35 pb-5">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div className="flex min-w-0 flex-wrap items-start gap-5 sm:gap-6">
            <div className="relative shrink-0">
              <div
                className="pointer-events-none absolute -inset-1 rounded-[1.4rem] bg-gradient-to-br from-[#c9a46c]/55 via-[#0f1f5c]/20 to-[#0f1f5c]/45 opacity-90 blur-[2px]"
                aria-hidden
              />
              <div className="relative overflow-hidden rounded-2xl border border-[#c9a46c]/50 bg-gradient-to-br from-[#0f1f5c] via-[#142d4d] to-[#1a1612] p-3.5 shadow-[0_14px_44px_-14px_rgba(15,31,92,0.55)] ring-1 ring-white/20">
                <div
                  className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_30%_20%,rgba(201,164,108,0.22),transparent_55%)]"
                  aria-hidden
                />
                <Image
                  src="/branding/vpc-mark.svg"
                  alt="Value Project Consulting"
                  width={112}
                  height={112}
                  className="relative z-[1] h-[4.75rem] w-[4.75rem] object-contain drop-shadow-[0_6px_16px_rgba(0,0,0,0.45)] sm:h-[5.75rem] sm:w-[5.75rem]"
                  priority
                />
              </div>
            </div>
            <div className="min-w-0 pt-0.5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-transparent bg-clip-text bg-gradient-to-r from-[#0f1f5c] via-[#1b3a6b] to-[#8b6a3e]">
                Value Project Consulting
              </p>
              <h1 className="mt-1.5 text-xl font-semibold tracking-tight text-[#0f1f5c] sm:text-2xl">
                Administración global
              </h1>
              <p className="mt-2 max-w-xl border-l-2 border-[#c9a46c]/70 pl-3 text-sm leading-relaxed text-[#4a5560]">
                Operación de cartera multitenant: organizaciones cliente, altas y
                accesos coordinados desde un solo panel.
              </p>
            </div>
          </div>
          <Link
            className="shrink-0 rounded-xl border border-[#c9a46c]/40 bg-gradient-to-b from-white to-[#faf6ef] px-4 py-2.5 text-sm font-semibold text-[#0f1f5c] shadow-sm ring-1 ring-[#0f1f5c]/8 transition hover:border-[#c9a46c]/70 hover:shadow-md"
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
