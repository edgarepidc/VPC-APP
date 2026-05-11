import { redirect } from "next/navigation";

import { getSessionUser, setActiveTenant } from "@/lib/auth/session";
import { createFirstOrganizationAsOwner } from "@/modules/tenancy/first-tenant";
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
  const tenants = await listTenantsForUser(session.userId);

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
    const result = await createFirstOrganizationAsOwner({
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
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center px-6 py-16">
      <div className="rounded-xl border border-zinc-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-semibold text-zinc-900">
          Seleccionar organizacion
        </h1>
        <p className="mt-2 text-sm text-zinc-600">
          Usuario: {session.email}. Elige un tenant activo para cargar datos
          aislados.
        </p>

        {params.error && (
          <p className="mt-4 rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
            {params.error}
          </p>
        )}

        {tenants.length === 0 ? (
          <div className="mt-6 space-y-4 rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
            <p>No hay organizaciones asignadas. Crea la primera (seras owner).</p>
            <div className="rounded-md border border-amber-200 bg-white p-4 text-zinc-800">
              <p className="mb-3 font-medium text-zinc-900">Nueva organizacion</p>
              <form action={createFirstTenantAction} className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-zinc-600">
                    Nombre visible
                  </label>
                  <input
                    name="orgName"
                    required
                    minLength={2}
                    defaultValue="Mobility ADO"
                    className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-600">
                    Identificador (slug, sin espacios)
                  </label>
                  <input
                    name="orgSlug"
                    required
                    pattern="[a-z0-9]+(-[a-z0-9]+)*"
                    defaultValue="mobility-ado"
                    className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
                    title="Minusculas, numeros y guiones"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
                >
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
                className="w-full rounded-md border border-zinc-300 px-4 py-3 text-left text-sm hover:bg-zinc-100"
                type="submit"
              >
                {tenant.name} ({tenant.slug})
              </button>
            ))}
          </form>
        )}
      </div>
    </main>
  );
}
