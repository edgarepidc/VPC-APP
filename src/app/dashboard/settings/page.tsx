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
        <h1 className="text-xl font-semibold text-[#0f1f5c]">Organización</h1>
        <p className="mt-1 text-sm text-[#5c5346]">
          Workspace activo:{" "}
          <strong className="text-[#0f1f5c]">{tenant.name}</strong>{" "}
          <span className="text-[#a09d98]">({tenant.slug})</span>
        </p>
      </div>

      {params.error ? (
        <p className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
          {params.error}
        </p>
      ) : null}
      {params.ok ? (
        <p className="rounded-lg border border-[#c9a46c]/40 bg-[linear-gradient(135deg,#faf8f4_0%,#f3ead8_100%)] px-4 py-3 text-sm text-[#2a2412] ring-1 ring-[#0f1f5c]/[0.06]">
          {params.ok}
        </p>
      ) : null}

      <section className="rounded-xl border border-[#e3d6c4] bg-[linear-gradient(165deg,#ffffff_0%,#faf8f4_100%)] p-6 shadow-sm ring-1 ring-[#0f1f5c]/[0.04]">
        <h2 className="text-base font-semibold text-[#0f1f5c]">Marca del cliente</h2>
        <p className="mt-2 text-sm leading-relaxed text-[#5c5346]">
          El logo que aparece en el menú lateral lo configura la consultora en{" "}
          {session.isSuperAdmin ? (
            <Link
              href="/admin/tenants"
              className="font-semibold text-[#0f1f5c] underline decoration-[#c9a46c]/50 underline-offset-2 hover:decoration-[#c9a46c]"
            >
              Administración global → Organizaciones
            </Link>
          ) : (
            <span className="font-medium text-[#0f1f5c]">Administración global → Organizaciones</span>
          )}
          . Para invitar o cambiar roles del equipo, usa{" "}
          <Link
            href="/dashboard/members"
            className="font-semibold text-[#0f1f5c] underline decoration-[#c9a46c]/50 underline-offset-2 hover:decoration-[#c9a46c]"
          >
            Miembros
          </Link>
          .
        </p>
      </section>
    </div>
  );
}
