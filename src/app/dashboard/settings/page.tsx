import Link from "next/link";
import { redirect } from "next/navigation";

import { DashboardPageHeader } from "@/app/dashboard/_components/page-header";
import {
  dashAlertError,
  dashAlertOk,
  dashCard,
  dashPage,
} from "@/lib/ui-classes";
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
    <main className={dashPage}>
      <DashboardPageHeader
        title="Organización"
        description={
          <>
            Workspace: <strong>{tenant.name}</strong>{" "}
            <span className="text-slate-500">({tenant.slug})</span>
          </>
        }
      />

      {params.error ? <p className={dashAlertError}>{params.error}</p> : null}
      {params.ok ? <p className={dashAlertOk}>{params.ok}</p> : null}

      <section className={`${dashCard} p-4`}>
        <h2 className="text-base font-semibold text-slate-900">Marca del cliente</h2>
        <p className="mt-2 text-sm text-slate-600">
          El logo del menú lateral lo configura la consultora en{" "}
          {session.isSuperAdmin ? (
            <Link href="/admin" className="font-medium text-slate-900 underline">
              Administración → Clientes
            </Link>
          ) : (
            <span className="font-medium text-slate-900">Administración global</span>
          )}
          . Para invitar al equipo, usa{" "}
          <Link href="/dashboard/members" className="font-medium text-slate-900 underline">
            Miembros
          </Link>
          .
        </p>
      </section>
    </main>
  );
}
