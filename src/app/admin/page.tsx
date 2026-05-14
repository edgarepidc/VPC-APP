import Link from "next/link";
import { redirect } from "next/navigation";

import { getSessionUser, setActiveTenantAsPlatformOwner } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { listAllTenants } from "@/modules/platform";

import {
  IconOrg,
  IconPeople,
  IconProjects,
  KpiCard,
  PlanDistributionPanel,
  TenantProjectShareBar,
  VpcAdminGradientShell,
  VpcAdminInsetShell,
} from "./_components/vpc-visuals";
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

  const planCounts: Record<string, number> = {};
  let totalMembershipsInView = 0;
  for (const t of tenants) {
    planCounts[t.plan] = (planCounts[t.plan] ?? 0) + 1;
    totalMembershipsInView += t._count.memberships;
  }
  const avgProjects =
    tenants.length > 0
      ? (totalProjectsInView / tenants.length).toFixed(1)
      : "0";

  const tenantProjectRows = tenants.map((t) => ({
    id: t.id,
    name: t.name,
    slug: t.slug,
    projects: t._count.projects,
  }));

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
        <p className="rounded-md border border-[#c9a46c]/40 bg-[linear-gradient(135deg,#faf8f4_0%,#f3ead8_100%)] p-3 text-sm text-[#2a2412] shadow-sm ring-1 ring-[#0f1f5c]/[0.05]">
          {params.ok}
        </p>
      )}

      <VpcAdminGradientShell className="p-6">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-white/60">
          Value Project Consulting
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
      </VpcAdminGradientShell>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <KpiCard
          label={isFiltered ? "Organizaciones (filtro)" : "Organizaciones en vista"}
          value={tenants.length}
          hint={
            isFiltered
              ? `De ${totalOrgCount} en cartera total.`
              : "Clientes activos en cartera."
          }
          icon={<IconOrg />}
        />
        <KpiCard
          label="Proyectos acumulados"
          value={totalProjectsInView}
          hint={
            isFiltered
              ? "Suma de la lista filtrada."
              : "Todos los proyectos bajo estos tenants."
          }
          icon={<IconProjects />}
          accent="steel"
        />
        <KpiCard
          label="Miembros en organización (vista)"
          value={totalMembershipsInView}
          hint={`Promedio de ${avgProjects} proyectos por organización en esta lista.`}
          icon={<IconPeople />}
          accent="tan"
        />
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <PlanDistributionPanel counts={planCounts} />
        <TenantProjectShareBar tenants={tenantProjectRows} />
      </div>

      <VpcAdminInsetShell innerClassName="p-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold text-[#0f1f5c]">
              Cartera de organizaciones
            </h3>
            <p className="mt-1 text-[13px] text-[#5c5346]">
              Entra al workspace del cliente para ver y editar sus proyectos.
            </p>
          </div>
          <Link
            href="/admin/tenants"
            className="rounded-lg border border-[#c9a46c]/45 bg-gradient-to-b from-white to-[#faf6ef] px-3 py-2 text-[13px] font-semibold text-[#0f1f5c] shadow-sm ring-1 ring-[#0f1f5c]/6 transition hover:border-[#c9a46c]/70 hover:shadow-md"
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
            className="min-w-[200px] flex-1 rounded-lg border border-[#e3d6c4] bg-white px-3 py-2 text-[13px] text-[#1a1916] placeholder:text-[#a09d98] focus:border-[#0f1f5c]/40 focus:outline-none focus:ring-2 focus:ring-[#0f1f5c]/15"
          />
          <button
            type="submit"
            className="rounded-lg bg-gradient-to-b from-[#152d4f] to-[#0f1f5c] px-4 py-2 text-[13px] font-semibold text-white shadow-sm ring-1 ring-[#c9a46c]/35 transition hover:from-[#1a3a63] hover:to-[#12224d] active:scale-[0.99]"
          >
            Buscar
          </button>
          {isFiltered && (
            <Link
              href="/admin"
              className="text-[13px] font-semibold text-[#0f1f5c] underline decoration-[#c9a46c]/55 underline-offset-2 hover:decoration-[#c9a46c]"
            >
              Limpiar filtro
            </Link>
          )}
        </form>

        <div className="mt-6 overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse text-[13px]">
            <thead>
              <tr className="border-b border-[#e8dfd0] text-left">
                <th className="pb-3 font-mono text-[10px] font-medium uppercase tracking-wide text-[#a09d98]">
                  Logo
                </th>
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
                  className="border-b border-[#f0ebe0] transition hover:bg-[#faf6ef]"
                >
                  <td className="py-3 pr-3 align-middle">
                    <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-lg border border-[#e3d6c4] bg-white shadow-sm ring-1 ring-[#0f1f5c]/[0.04]">
                      {t.logoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element -- URL pública Supabase Storage
                        <img
                          src={t.logoUrl}
                          alt=""
                          className="h-full w-full object-contain p-0.5"
                        />
                      ) : (
                        <span className="text-[10px] font-semibold text-[#c9a46c]">
                          —
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-3 pr-3 font-medium text-[#0f1f5c]">
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
                          className="rounded-lg bg-gradient-to-b from-[#152d4f] to-[#0f1f5c] px-3 py-1.5 text-[12px] font-semibold text-white shadow-sm ring-1 ring-[#c9a46c]/30 transition hover:from-[#1a3a63] hover:to-[#12224d] active:scale-[0.99]"
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
              <Link
                href="/admin/tenants"
                className="font-semibold text-[#0f1f5c] underline decoration-[#c9a46c]/55 underline-offset-2 hover:decoration-[#c9a46c]"
              >
                Crear la primera
              </Link>
              .
            </p>
          )}
        </div>
      </VpcAdminInsetShell>
    </div>
  );
}
