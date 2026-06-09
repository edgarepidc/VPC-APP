import { redirect } from "next/navigation";

import { AuthShell } from "@/components/auth-shell";
import {
  uiAlertError,
  uiAlertWarning,
  uiButtonGhost,
  uiButtonPrimary,
  uiInput,
  uiLabel,
} from "@/lib/ui-classes";
import { getSessionUser, setActiveTenant } from "@/lib/auth/session";
import { createFirstOrganizationAsAdmin } from "@/modules/tenancy/first-tenant";
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

  if (!session.isSuperAdmin && tenants.length === 1) {
    await setActiveTenant(tenants[0].id);
    redirect("/dashboard/projects");
  }

  async function selectTenantAction(formData: FormData) {
    "use server";
    const tenantId = String(formData.get("tenantId") ?? "");
    if (!tenantId) return;
    await setActiveTenant(tenantId);
    redirect("/dashboard/projects");
  }

  async function createFirstTenantAction(formData: FormData) {
    "use server";
    const s = await getSessionUser();
    if (!s) redirect("/login");
    const name = String(formData.get("orgName") ?? "");
    const slug = String(formData.get("orgSlug") ?? "");
    const result = await createFirstOrganizationAsAdmin({
      userId: s.userId,
      name,
      slug,
    });
    if (!result.ok) {
      redirect(`/select-tenant?error=${encodeURIComponent(result.message)}`);
    }
    await setActiveTenant(result.tenantId);
    redirect("/dashboard/projects");
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
          <p>No hay organizaciones asignadas. Crea la primera (serás administrador).</p>
          <div className="rounded-lg border border-slate-200 bg-white p-4 text-slate-800">
            <p className="mb-3 font-medium text-slate-900">Nueva organizacion</p>
            <form action={createFirstTenantAction} className="space-y-3">
              <div>
                <label className={uiLabel}>Nombre visible</label>
                <input
                  name="orgName"
                  required
                  minLength={2}
                  defaultValue="Mobility ADO"
                  className={`mt-1 ${uiInput}`}
                />
              </div>
              <div>
                <label className={uiLabel}>Identificador (slug, sin espacios)</label>
                <input
                  name="orgSlug"
                  required
                  pattern="[a-z0-9]+(-[a-z0-9]+)*"
                  defaultValue="mobility-ado"
                  className={`mt-1 ${uiInput}`}
                  title="Minusculas, numeros y guiones"
                />
              </div>
              <button type="submit" className={uiButtonPrimary}>
                Crear y entrar al tablero
              </button>
            </form>
          </div>
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
