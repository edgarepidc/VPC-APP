import Link from "next/link";
import { redirect } from "next/navigation";

import {
  getSessionUser,
  setActiveTenantAsPlatformOwner,
} from "@/lib/auth/session";
import { db } from "@/lib/db";
import { listAllTenants } from "@/modules/platform";

import { DeleteTenantForm } from "./delete-tenant-form";
import { deleteTenantPlatformAction } from "./tenant-delete-actions";

export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<{ error?: string; q?: string; ok?: string }>;
};

export default async function AdminHomePage({ searchParams }: Props) {
  const params = await searchParams;
  const session = await getSessionUser();
  if (!session?.isSuperAdmin) redirect("/dashboard/projects");

  const rawQ = params.q?.trim() ?? "";
  const [tenants, totalOrgCount] = await Promise.all([
    listAllTenants(rawQ || undefined),
    db.tenant.count(),
  ]);
  const totalProjectsInView = tenants.reduce(
    (acc, t) => acc + t._count.projects,
    0,
  );
  const isFiltered = rawQ.length > 0;

  async function enterWorkspace(formData: FormData) {
    "use server";
    const s = await getSessionUser();
    if (!s?.isSuperAdmin) redirect("/admin?error=sin_permiso");
    const tenantId = String(formData.get("tenantId") ?? "");
    const ok = await setActiveTenantAsPlatformOwner(tenantId);
    if (!ok) redirect("/admin?error=no_encontrado");
    redirect("/dashboard/projects");
  }

  return (
    <div className="space-y-8">
      {params.error && (
        <p className="rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
          {params.error === "sin_permiso"
            ? "No tienes permiso de plataforma."
            : params.error === "no_encontrado"
              ? "Organizacion no encontrada."
              : params.error}
        </p>
      )}
      {params.ok && (
        <p className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
          {params.ok}
        </p>
      )}

      <section className="rounded-xl border border-[#e8e6e1] bg-gradient-to-br from-[#0f1f5c] to-[#1b2a6b] p-6 text-white shadow-md">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-white/60">
          Consultora — vista plataforma
        </p>
        <h2 className="mt-1 text-xl font-semibold tracking-tight">
          Organizaciones cliente y proyectos
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-white/75">
          Cada fila es una organizacion (tenant) que atiendes. Pulsa{" "}
          <strong className="text-white">Entrar al workspace</strong> para
          operar como owner dentro de ese cliente: proyectos, PMO, riesgos,
          stakeholders, etc. Tu sesión actual queda en esa organizacion hasta que
          cambies de tenant.
        </p>
        <div className="mt-5 flex flex-wrap gap-6 text-sm">
          <div>
            <p className="text-[11px] uppercase tracking-wide text-white/50">
              {isFiltered ? "Coincidencias" : "Organizaciones"}
            </p>
            <p className="text-2xl font-semibold tabular-nums">{tenants.length}</p>
            {isFiltered && (
              <p className="mt-1 text-[11px] text-white/55">
                de {totalOrgCount} en cartera
              </p>
            )}
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-wide text-white/50">
              Proyectos {isFiltered ? "(esta vista)" : "(todos los tenants)"}
            </p>
            <p className="text-2xl font-semibold tabular-nums">
              {totalProjectsInView}
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-[#e8e6e1] bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold text-[#1a1916]">
              Cartera de organizaciones
            </h3>
            <p className="mt-1 text-[13px] text-[#6b6860]">
              Entra al workspace del cliente para ver y editar sus proyectos.
            </p>
          </div>
          <Link
            href="/admin/tenants"
            className="rounded-md border border-[#e8e6e1] bg-[#f7f6f3] px-3 py-2 text-[13px] font-medium text-[#1a1916] hover:bg-[#f0ede8]"
          >
            Crear organizacion nueva
          </Link>
        </div>

        <form
          method="get"
          action="/admin"
          className="mt-5 flex flex-wrap items-center gap-2"
        >
          <label className="sr-only" htmlFor="admin-q">
            Buscar organizacion
          </label>
          <input
            id="admin-q"
            name="q"
            type="search"
            placeholder="Nombre o slug..."
            defaultValue={rawQ}
            className="min-w-[200px] flex-1 rounded-md border border-[#e8e6e1] bg-white px-3 py-2 text-[13px] text-[#1a1916] placeholder:text-[#a09d98] focus:border-[#1a1916] focus:outline-none focus:ring-1 focus:ring-[#1a1916]"
          />
          <button
            type="submit"
            className="rounded-md bg-[#1a1916] px-4 py-2 text-[13px] font-medium text-white hover:bg-[#2d2c29]"
          >
            Buscar
          </button>
          {isFiltered && (
            <Link
              href="/admin"
              className="text-[13px] font-medium text-[#2563eb] underline"
            >
              Limpiar filtro
            </Link>
          )}
        </form>

        <div className="mt-6 overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse text-[13px]">
            <thead>
              <tr className="border-b border-[#e8e6e1] text-left">
                <th className="pb-3 font-mono text-[10px] font-medium uppercase tracking-wide text-[#a09d98]">
                  Organizacion
                </th>
                <th className="pb-3 font-mono text-[10px] font-medium uppercase tracking-wide text-[#a09d98]">
                  Slug
                </th>
                <th className="pb-3 font-mono text-[10px] font-medium uppercase tracking-wide text-[#a09d98]">
                  Plan
                </th>
                <th className="pb-3 text-right font-mono text-[10px] font-medium uppercase tracking-wide text-[#a09d98]">
                  Proyectos
                </th>
                <th className="pb-3 text-right font-mono text-[10px] font-medium uppercase tracking-wide text-[#a09d98]">
                  Miembros
                </th>
                <th className="pb-3 text-right font-mono text-[10px] font-medium uppercase tracking-wide text-[#a09d98]">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody>
              {tenants.map((t) => (
                <tr
                  key={t.id}
                  className="border-b border-[#f0ede8] transition hover:bg-[#f7f6f3]"
                >
                  <td className="py-3 pr-3 font-medium text-[#1a1916]">
                    {t.name}
                  </td>
                  <td className="py-3 pr-3 font-mono text-[12px] text-[#57534e]">
                    {t.slug}
                  </td>
                  <td className="py-3 pr-3 text-[#57534e]">{t.plan}</td>
                  <td className="py-3 pr-3 text-right tabular-nums">
                    {t._count.projects}
                  </td>
                  <td className="py-3 pr-3 text-right tabular-nums">
                    {t._count.memberships}
                  </td>
                  <td className="py-3 text-right align-top">
                    <div className="flex flex-col items-end gap-2">
                      <form action={enterWorkspace}>
                        <input type="hidden" name="tenantId" value={t.id} />
                        <button
                          type="submit"
                          className="rounded-md bg-[#1a1916] px-3 py-1.5 text-[12px] font-medium text-white hover:bg-[#2d2c29]"
                        >
                          Entrar al workspace
                        </button>
                      </form>
                      <DeleteTenantForm
                        deleteAction={deleteTenantPlatformAction}
                        tenantId={t.id}
                        tenantSlug={t.slug}
                        tenantName={t.name}
                        next="cartera"
                        compact
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {tenants.length === 0 && (
            <p className="py-10 text-center text-[13px] text-[#a09d98]">
              Aún no hay organizaciones.{" "}
              <Link href="/admin/tenants" className="font-medium text-[#2563eb] underline">
                Crear la primera
              </Link>
              .
            </p>
          )}
        </div>
      </section>

      <section className="rounded-xl border border-slate-200/90 bg-gradient-to-br from-slate-50 to-white p-5 text-[13px] leading-relaxed text-slate-800 shadow-sm ring-1 ring-slate-900/[0.04]">
        <p className="font-semibold text-slate-900">
          Configuración en Vercel (una vez por entorno)
        </p>
        <p className="mt-2 text-slate-600">
          Para reconocer al dueño de la consultora sin tocar la base de datos,
          define en <strong className="text-slate-800">Production</strong>:
        </p>
        <ul className="mt-3 list-inside list-disc space-y-1.5 text-slate-700">
          <li>
            <code className="rounded-md border border-slate-200 bg-white px-1.5 py-0.5 text-[12px] text-slate-900">
              PLATFORM_OWNER_EMAIL
            </code>{" "}
            = tu correo exacto de login (el mismo que usas en /login).
          </li>
        </ul>
        <p className="mt-3 text-[12px] text-slate-600">
          Opcional: varios super admins con{" "}
          <code className="rounded-md border border-slate-200 bg-white px-1.5 py-0.5 text-[12px] text-slate-900">
            PLATFORM_SUPERADMIN_EMAILS
          </code>{" "}
          (correos separados por coma). Tras guardar variables, ejecuta un{" "}
          <strong className="text-slate-800">Redeploy</strong> en Vercel.
        </p>
      </section>
    </div>
  );
}
