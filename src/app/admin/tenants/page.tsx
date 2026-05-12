import Link from "next/link";
import { redirect } from "next/navigation";

import { getSessionUser } from "@/lib/auth/session";
import {
  createTenantFromPlatform,
  listAllTenants,
  TENANT_PLAN_KEYS,
} from "@/modules/platform";

export const dynamic = "force-dynamic";

const PLAN_LABEL: Record<(typeof TENANT_PLAN_KEYS)[number], string> = {
  starter: "Starter",
  pro: "Pro",
  enterprise: "Enterprise",
};

type PageProps = {
  searchParams: Promise<{ error?: string; ok?: string }>;
};

export default async function AdminTenantsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const session = await getSessionUser();
  if (!session?.isSuperAdmin) redirect("/dashboard/projects");

  const tenants = await listAllTenants();

  async function createTenantAction(formData: FormData) {
    "use server";
    const s = await getSessionUser();
    if (!s?.isSuperAdmin) redirect("/admin/tenants?error=Sin+permiso");

    const name = String(formData.get("name") ?? "");
    const slug = String(formData.get("slug") ?? "");
    const plan = String(formData.get("plan") ?? "starter");
    const result = await createTenantFromPlatform({ name, slug, plan });
    if (!result.ok) {
      redirect(`/admin/tenants?error=${encodeURIComponent(result.message)}`);
    }
    redirect(
      `/admin/tenants?ok=${encodeURIComponent("Organización creada. Desde la cartera puedes entrar al workspace.")}`,
    );
  }

  return (
    <div className="space-y-8">
      <p className="text-sm text-slate-600">
        Este módulo es el <strong>alta de cliente</strong> en la plataforma: cada
        fila es un tenant aislado. Para operar dentro del cliente usa{" "}
        <Link href="/admin" className="font-medium text-amber-900 underline">
          Cartera de clientes
        </Link>
        .
      </p>

      {params.error && (
        <p className="rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
          {params.error}
        </p>
      )}
      {params.ok && (
        <p className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
          {params.ok}
        </p>
      )}

      <section className="pmo-card p-6">
        <h2 className="text-base font-semibold text-slate-900">
          Nueva organización (tenant)
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          Se crean roles base (owner, admin, etc.) vacíos. Los usuarios entran
          por invitación desde <strong>Miembros</strong> dentro del workspace,
          o tú puedes entrar desde la cartera como consultora.
        </p>
        <form
          action={createTenantAction}
          className="mt-4 grid gap-3 sm:grid-cols-2"
        >
          <div>
            <label className="text-xs font-medium text-slate-600">Nombre</label>
            <input
              name="name"
              required
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              placeholder="Mobility ADO"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600">Slug</label>
            <input
              name="slug"
              required
              pattern="[a-z0-9]+(-[a-z0-9]+)*"
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              placeholder="mobility-ado"
            />
            <p className="mt-1 text-xs text-slate-500">
              URL interna; minúsculas y guiones. Único en toda la plataforma.
            </p>
          </div>
          <div className="sm:col-span-2">
            <label className="text-xs font-medium text-slate-600">Plan</label>
            <select
              name="plan"
              defaultValue="starter"
              className="mt-1 w-full max-w-xs rounded-md border border-slate-300 px-3 py-2 text-sm sm:w-auto"
            >
              {TENANT_PLAN_KEYS.map((key) => (
                <option key={key} value={key}>
                  {PLAN_LABEL[key]}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-slate-500">
              Etiqueta comercial por ahora; luego puedes enlazar límites por plan.
            </p>
          </div>
          <div className="sm:col-span-2">
            <button
              type="submit"
              className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
            >
              Crear organización
            </button>
          </div>
        </form>
      </section>

      <section className="pmo-card overflow-hidden">
        <h2 className="border-b border-slate-200 px-4 py-3 text-base font-semibold text-slate-900">
          Organizaciones ({tenants.length})
        </h2>
        <div className="overflow-x-auto">
          <table className="pmo-table pmo-row-hover w-full text-sm">
            <thead>
              <tr>
                <th className="text-left">Nombre</th>
                <th className="text-left">Slug</th>
                <th className="text-left">Plan</th>
                <th className="text-right">Proyectos</th>
                <th className="text-right">Miembros</th>
              </tr>
            </thead>
            <tbody>
              {tenants.map((t) => (
                <tr key={t.id}>
                  <td className="font-medium">{t.name}</td>
                  <td className="text-slate-600">{t.slug}</td>
                  <td>{t.plan}</td>
                  <td className="text-right">{t._count.projects}</td>
                  <td className="text-right">{t._count.memberships}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
