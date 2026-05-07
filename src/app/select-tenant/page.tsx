import { redirect } from "next/navigation";

import { getSessionUser, setActiveTenant } from "@/lib/auth/session";
import { tenants } from "@/lib/data/mock-db";

export default async function SelectTenantPage() {
  const session = await getSessionUser();
  if (!session) redirect("/login");

  async function selectTenantAction(formData: FormData) {
    "use server";
    const tenantId = String(formData.get("tenantId") ?? "");
    if (!tenantId) return;
    await setActiveTenant(tenantId);
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
      </div>
    </main>
  );
}
