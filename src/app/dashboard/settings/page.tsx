import Link from "next/link";
import { redirect } from "next/navigation";

import { getSessionUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { requireTenantId } from "@/lib/tenancy";

export const dynamic = "force-dynamic";

export default async function DashboardSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; ok?: string }>;
}) {
  const params = await searchParams;
  const session = await getSessionUser();
  if (!session) redirect("/login");

  const tenantId = await requireTenantId();
  const tenant = await db.tenant.findUnique({
    where: { id: tenantId },
    select: { name: true, slug: true },
  });
  if (!tenant) redirect("/select-tenant");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Organización</h1>
        <p className="mt-1 text-sm text-slate-600">
          Workspace activo:{" "}
          <strong className="text-slate-900">{tenant.name}</strong>{" "}
          <span className="text-slate-400">({tenant.slug})</span>
        </p>
      </div>

      {params.error ? (
        <p className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
          {params.error}
        </p>
      ) : null}
      {params.ok ? (
        <p className="rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm text-[#2a2412] ring-1 ring-slate-200">
          {params.ok}
        </p>
      ) : null}

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <h2 className="text-base font-semibold text-slate-900">Marca del cliente</h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">
          El logo que aparece en el menú lateral lo configura la consultora en{" "}
          {session.isSuperAdmin ? (
            <Link
              href="/admin"
              className="font-semibold text-slate-900 underline decoration-slate-400 underline-offset-2 hover:decoration-slate-600"
            >
              Administración global → Organizaciones
            </Link>
          ) : (
            <span className="font-medium text-slate-900">Administración global → Organizaciones</span>
          )}
          . Para invitar o cambiar roles del equipo, usa{" "}
          <Link
            href="/dashboard/members"
            className="font-semibold text-slate-900 underline decoration-slate-400 underline-offset-2 hover:decoration-slate-600"
          >
            Miembros
          </Link>
          .
        </p>
      </section>
    </div>
  );
}
