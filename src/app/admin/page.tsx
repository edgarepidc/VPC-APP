import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";

import { CreateTenantPanel } from "./_components/create-tenant-panel";
import { DashboardPageHeader } from "@/app/dashboard/_components/page-header";
import {
  IconOrg,
  IconPeople,
  IconProjects,
  KpiCard,
  PlanDistributionPanel,
  TenantMembersShareBar,
  TenantProjectShareBar,
} from "./_components/vpc-visuals";
import { DeleteTenantForm } from "./delete-tenant-form";
import {
  platformClearTenantLogoAction,
  platformUploadTenantLogoAction,
} from "./tenant-logo-actions";
import { deleteTenantPlatformAction } from "./tenant-delete-actions";
import {
  adminActionBtnPrimary,
  adminActionBtnSecondary,
  adminAlertError,
  adminAlertOk,
  adminCard,
  adminPage,
  adminSectionSub,
  adminSectionTitle,
  adminTable,
  adminTd,
  adminTh,
  uiButtonPrimary,
  uiInput,
} from "@/lib/ui-classes";
import { PMO_HUB } from "@/lib/dashboard-paths";
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
  if (!session?.isSuperAdmin) redirect(PMO_HUB);

  const rawQ = params.q?.trim() ?? "";
  const [tenants, totalOrgCount] = await Promise.all([
    listAllTenants(rawQ || undefined),
    db.tenant.count(),
  ]);
  const isFiltered = rawQ.length > 0;
  const totalProjects = tenants.reduce((acc, t) => acc + t._count.projects, 0);
  const totalMembers = tenants.reduce((acc, t) => acc + t._count.memberships, 0);

  const planCounts = tenants.reduce<Record<string, number>>((acc, t) => {
    acc[t.plan] = (acc[t.plan] ?? 0) + 1;
    return acc;
  }, {});

  const chartTenants = tenants.map((t) => ({
    id: t.id,
    name: t.name,
    slug: t.slug,
    projects: t._count.projects,
    members: t._count.memberships,
  }));

  async function enterWorkspace(formData: FormData) {
    "use server";
    const s = await getSessionUser();
    if (!s?.isSuperAdmin) redirect("/admin?error=sin_permiso");
    const tenantId = String(formData.get("tenantId") ?? "");
    const ok = await setActiveTenantAsPlatformOwner(tenantId);
    if (!ok) redirect("/admin?error=no_encontrado");
    redirect(PMO_HUB);
  }

  const errorMsg = resolveError(params.error);
  const okMsg = resolveOk(params.ok);

  return (
    <div className={adminPage}>
      <DashboardPageHeader
        title="Cartera de clientes"
        description="Organizaciones, planes y acceso a workspaces de la plataforma."
      />

      {errorMsg && <p className={adminAlertError}>{errorMsg}</p>}
      {okMsg && <p className={adminAlertOk}>{okMsg}</p>}

      <div className="grid gap-4 lg:grid-cols-3">
        <KpiCard
          label={isFiltered ? "Organizaciones (vista)" : "Organizaciones"}
          tone="slate"
          value={
            <>
              {tenants.length}
              {isFiltered ? (
                <span className="ml-1 text-base font-normal text-slate-500">
                  / {totalOrgCount}
                </span>
              ) : null}
            </>
          }
          hint="Clientes activos en la plataforma"
          icon={<IconOrg />}
        />
        <KpiCard
          label="Proyectos"
          tone="blue"
          value={totalProjects}
          hint="Suma en la vista actual"
          icon={<IconProjects />}
        />
        <KpiCard
          label="Miembros"
          tone="emerald"
          value={totalMembers}
          hint="Membresías activas en la vista"
          icon={<IconPeople />}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <PlanDistributionPanel counts={planCounts} />
        <TenantProjectShareBar tenants={chartTenants} />
        <TenantMembersShareBar tenants={chartTenants} />
      </div>

      <CreateTenantPanel
        newTenantId={params.newTenant?.trim()}
        logoWarn={params.logoWarn?.trim() ?? null}
      />

      <section className={`${adminCard} p-4`}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className={adminSectionTitle}>Cartera de clientes</h2>
            <p className={adminSectionSub}>
              Entra al workspace, crea usuarios o gestiona cada organización.
            </p>
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
            className={`min-w-[180px] flex-1 ${uiInput}`}
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
                <th className={`${adminTh} min-w-[11rem]`}>Logo</th>
                <th className={adminTh}>Organización</th>
                <th className={adminTh}>Plan</th>
                <th className={`${adminTh} text-right`}>Proy.</th>
                <th className={`${adminTh} text-right`}>Miembros</th>
                <th className={`${adminTh} text-right min-w-[15rem]`}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {tenants.map((t) => (
                <tr key={t.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className={`${adminTd} min-w-[11rem] align-top`}>
                    <div className="flex items-start gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-white">
                        {t.logoUrl ? (
                          <Image
                            src={t.logoUrl}
                            alt=""
                            width={40}
                            height={40}
                            className="h-full w-full object-contain p-0.5"
                            unoptimized
                          />
                        ) : (
                          <span className="text-xs text-slate-400">—</span>
                        )}
                      </div>
                      <div className="min-w-0 flex-1 space-y-1.5">
                        <form action={platformUploadTenantLogoAction} className="space-y-1">
                          <input type="hidden" name="tenantId" value={t.id} />
                          <input
                            type="file"
                            name="logo"
                            accept="image/png,image/jpeg,image/webp"
                            className="w-full min-w-[9rem] text-xs text-slate-600 file:mr-2 file:cursor-pointer file:rounded-md file:border-0 file:bg-slate-700 file:px-2 file:py-1 file:text-[11px] file:font-medium file:text-white hover:file:bg-slate-800"
                          />
                          <button
                            type="submit"
                            className="text-xs font-medium text-slate-700 underline hover:text-slate-900"
                          >
                            Subir logo
                          </button>
                        </form>
                        {t.logoUrl ? (
                          <form action={platformClearTenantLogoAction}>
                            <input type="hidden" name="tenantId" value={t.id} />
                            <button
                              type="submit"
                              className="text-xs text-rose-700 underline hover:text-rose-900"
                            >
                              Quitar
                            </button>
                          </form>
                        ) : null}
                      </div>
                    </div>
                  </td>
                  <td className={adminTd}>
                    <p className="font-medium text-slate-900">{t.name}</p>
                    <p className="font-mono text-xs text-slate-500">{t.slug}</p>
                  </td>
                  <td className={adminTd}>
                    <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs font-medium capitalize text-slate-700">
                      {t.plan}
                    </span>
                  </td>
                  <td className={`${adminTd} text-right tabular-nums`}>{t._count.projects}</td>
                  <td className={`${adminTd} text-right tabular-nums`}>{t._count.memberships}</td>
                  <td className={`${adminTd} text-right align-top`}>
                    <div className="flex flex-wrap items-center justify-end gap-1.5">
                      <form action={enterWorkspace}>
                        <input type="hidden" name="tenantId" value={t.id} />
                        <button type="submit" className={adminActionBtnPrimary}>
                          Entrar
                        </button>
                      </form>
                      <Link
                        href={`/admin/users?tenantId=${encodeURIComponent(t.id)}`}
                        className={adminActionBtnSecondary}
                      >
                        Usuario
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
