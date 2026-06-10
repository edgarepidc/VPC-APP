import Link from "next/link";
import { redirect } from "next/navigation";

import { AuthShell } from "@/components/auth-shell";
import { uiAlertError, uiAlertWarning, uiButtonGhost } from "@/lib/ui-classes";
import { PMO_HUB } from "@/lib/dashboard-paths";
import { getSessionUser, setActiveTenant } from "@/lib/auth/session";
import { listTenantsForUser } from "@/modules/tenancy/service";

export const dynamic = "force-dynamic";

type SelectTenantPageProps = {
  searchParams: Promise<{ error?: string }>;
};

export default async function SelectTenantPage({
  searchParams,
}: SelectTenantPageProps) {
  const params = await searchParams;
  const session = await getSessionUser();
  if (!session) redirect("/login");

  if (session.isSuperAdmin) {
    redirect("/admin");
  }

  const tenants = await listTenantsForUser(session.userId);

  if (tenants.length === 1) {
    await setActiveTenant(tenants[0].id);
    redirect(PMO_HUB);
  }

  async function selectTenantAction(formData: FormData) {
    "use server";
    const tenantId = String(formData.get("tenantId") ?? "");
    if (!tenantId) return;
    await setActiveTenant(tenantId);
    redirect(PMO_HUB);
  }

  return (
    <AuthShell
      wide
      title="Seleccionar organizacion"
      description={
        <>
          Usuario: {session.email}. Elige un tenant activo para cargar datos
          aislados.
        </>
      }
    >
      {params.error && <p className={`mt-4 ${uiAlertError}`}>{params.error}</p>}

      {tenants.length === 0 ? (
        <div className={`mt-6 space-y-4 ${uiAlertWarning}`}>
          <p>
            No tienes organizaciones asignadas. Un administrador de VPC debe darte acceso
            desde la administración global (alta de usuario o invitación al equipo).
          </p>
          <p className="text-sm text-slate-700">
            Si acabas de recibir credenciales, cierra sesión e inicia de nuevo. Si el
            problema continúa, contacta a soporte con tu correo:{" "}
            <strong>{session.email}</strong>.
          </p>
          <Link href="/login" className="inline-block text-sm font-medium text-slate-800 underline">
            Volver al inicio de sesión
          </Link>
        </div>
      ) : (
        <form action={selectTenantAction} className="mt-6 space-y-3">
          {tenants.map((tenant) => (
            <button
              key={tenant.id}
              name="tenantId"
              value={tenant.id}
              className={uiButtonGhost}
              type="submit"
            >
              {tenant.name} ({tenant.slug})
            </button>
          ))}
        </form>
      )}
    </AuthShell>
  );
}
