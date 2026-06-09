import Link from "next/link";
import { redirect } from "next/navigation";

import { CreateTenantPanel } from "./_components/create-tenant-panel";
import { DeleteTenantForm } from "./delete-tenant-form";
import {
  platformClearTenantLogoAction,
  platformUploadTenantLogoAction,
} from "./tenant-logo-actions";
import { deleteTenantPlatformAction } from "./tenant-delete-actions";
import {
  adminAlertError,
  adminAlertOk,
  adminCard,
  adminPage,
  adminSectionSub,
  adminSectionTitle,
  adminStatLabel,
  adminStatsBar,
  adminStatValue,
  adminTable,
  adminTd,
  adminTh,
  uiButtonPrimary,
} from "@/lib/ui-classes";
import { getSessionUser, setActiveTenantAsPlatformOwner } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { listAllTenants } from "@/modules/platform";

export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<{
    error?: string;
    q?: string;
    ok?: string;
    newTenant?: string;
    logoWarn?: string;
  }>;
};

function resolveError(code: string | undefined) {
  if (!code) return null;
  const map: Record<string, string> = {
    sin_permiso: "No tienes permiso de plataforma.",
    no_encontrado: "Organización no encontrada.",
    sin_permiso_logo: "No tienes permiso para cambiar logos.",
    tenant_logo: "Falta identificar la organización.",
    tenant_no_encontrado: "Organización no encontrada.",
    archivo_logo: "Selecciona un archivo de imagen.",
    tamano_logo: "La imagen supera 2 MB.",
    tipo_logo: "Formato no permitido (PNG, JPEG o WebP).",
    storage_logo: "No se pudo guardar el logo.",
    Sin_permiso: "No tienes permiso.",
    "Datos+invalidos": "Datos inválidos.",
  };
  return map[code] ?? decodeURIComponent(code.replace(/\+/g, " "));
}

function resolveOk(code: string | undefined) {
  if (!code) return null;
  const map: Record<string, string> = {
    logo_subido: "Logo actualizado.",
    logo_quitado: "Logo eliminado.",
  };
  return map[code] ?? decodeURIComponent(code.replace(/\+/g, " "));
}

export default async function AdminHomePage({ searchParams }: Props) {
  const params = await searchParams;
  const session = await getSessionUser();
  if (!session?.isSuperAdmin) redirect("/dashboard/projects");

  const rawQ = params.q?.trim() ?? "";
  const [tenants, totalOrgCount] = await Promise.all([
    listAllTenants(rawQ || undefined),
    db.tenant.count(),
  ]);
  const isFiltered = rawQ.length > 0;
  const totalProjects = tenants.reduce((acc, t) => acc + t._count.projects, 0);
  const totalMembers = tenants.reduce((acc, t) => acc + t._count.memberships, 0);

  async function enterWorkspace(formData: FormData) {
    "use server";
    const s = await getSessionUser();
    if (!s?.isSuperAdmin) redirect("/admin?error=sin_permiso");
    const tenantId = String(formData.get("tenantId") ?? "");
    const ok = await setActiveTenantAsPlatformOwner(tenantId);
    if (!ok) redirect("/admin?error=no_encontrado");
    redirect("/dashboard/projects");
  }

  const errorMsg = resolveError(params.error);
  const okMsg = resolveOk(params.ok);

  return (
    <div className={adminPage}>
      {errorMsg && <p className={adminAlertError}>{errorMsg}</p>}
      {okMsg && <p className={adminAlertOk}>{okMsg}</p>}

      <div className={adminStatsBar}>
        <div>
          <p className={adminStatLabel}>{isFiltered ? "Resultados" : "Organizaciones"}</p>
          <p className={adminStatValue}>
            {tenants.length}
            {isFiltered ? (
              <span className="ml-1 text-sm font-normal text-slate-500">/ {totalOrgCount}</span>
            ) : null}
          </p>
        </div>
        <div>
          <p className={adminStatLabel}>Proyectos</p>
          <p className={adminStatValue}>{totalProjects}</p>
        </div>
        <div>
          <p className={adminStatLabel}>Miembros</p>
          <p className={adminStatValue}>{totalMembers}</p>
        </div>
      </div>

      <CreateTenantPanel
        newTenantId={params.newTenant?.trim()}
        logoWarn={params.logoWarn?.trim() ?? null}
      />

      <section className={`${adminCard} p-4`}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className={adminSectionTitle}>Cartera de clientes</h2>
            <p className={adminSectionSub}>Entra al workspace o invita miembros por fila.</p>
          </div>
        </div>

        <form method="get" action="/admin" className="mt-4 flex flex-wrap items-center gap-2">
          <label className="sr-only" htmlFor="admin-q">
            Buscar
          </label>
          <input
            id="admin-q"
            name="q"
            type="search"
            placeholder="Nombre o slug…"
            defaultValue={rawQ}
            className="min-w-[180px] flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-100"
          />
          <button type="submit" className={uiButtonPrimary.replace("w-full ", "w-auto ")}>
            Buscar
          </button>
          {isFiltered && (
            <Link href="/admin" className="text-sm font-medium text-slate-700 underline">
              Limpiar
            </Link>
          )}
        </form>

        <div className="mt-4 overflow-x-auto">
          <table className={adminTable}>
            <thead>
              <tr className="border-b border-slate-200">
                <th className={adminTh}>Logo</th>
                <th className={adminTh}>Organización</th>
                <th className={adminTh}>Plan</th>
                <th className={`${adminTh} text-right`}>Proy.</th>
                <th className={`${adminTh} text-right`}>Miembros</th>
                <th className={`${adminTh} text-right`}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {tenants.map((t) => (
                <tr key={t.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className={`${adminTd} w-28`}>
                    <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-md border border-slate-200 bg-white">
                      {t.logoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={t.logoUrl} alt="" className="h-full w-full object-contain p-0.5" />
                      ) : (
                        <span className="text-xs text-slate-400">—</span>
                      )}
                    </div>
                    <form action={platformUploadTenantLogoAction} className="mt-1.5 space-y-1">
                      <input type="hidden" name="tenantId" value={t.id} />
                      <input
                        type="file"
                        name="logo"
                        accept="image/png,image/jpeg,image/webp"
                        className="w-full max-w-[7rem] text-xs text-slate-500 file:mr-1 file:rounded file:border-0 file:bg-slate-700 file:px-1.5 file:py-0.5 file:text-[10px] file:text-white"
                      />
                      <button
                        type="submit"
                        className="text-xs font-medium text-slate-700 underline"
                      >
                        Subir
                      </button>
                    </form>
                    {t.logoUrl ? (
                      <form action={platformClearTenantLogoAction} className="mt-1">
                        <input type="hidden" name="tenantId" value={t.id} />
                        <button
                          type="submit"
                          className="text-xs text-rose-700 underline"
                        >
                          Quitar
                        </button>
                      </form>
                    ) : null}
                  </td>
                  <td className={adminTd}>
                    <p className="font-medium text-slate-900">{t.name}</p>
                    <p className="font-mono text-xs text-slate-500">{t.slug}</p>
                  </td>
                  <td className={adminTd}>{t.plan}</td>
                  <td className={`${adminTd} text-right tabular-nums`}>{t._count.projects}</td>
                  <td className={`${adminTd} text-right tabular-nums`}>{t._count.memberships}</td>
                  <td className={`${adminTd} text-right`}>
                    <div className="flex flex-col items-end gap-1.5">
                      <form action={enterWorkspace}>
                        <input type="hidden" name="tenantId" value={t.id} />
                        <button
                          type="submit"
                          className="rounded-lg bg-slate-800 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-700"
                        >
                          Entrar
                        </button>
                      </form>
                      <Link
                        href={`/admin/invite?tenantId=${encodeURIComponent(t.id)}`}
                        className="text-sm font-medium text-slate-700 underline"
                      >
                        Invitar
                      </Link>
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
            <p className="py-8 text-center text-sm text-slate-500">
              Sin organizaciones. Usa «Nueva organización» arriba.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
