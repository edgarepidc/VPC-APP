import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getSessionUser, setActiveTenantAsPlatformOwner } from "@/lib/auth/session";
import { db } from "@/lib/db";
import {
  PLAN_LIMITS,
  createTenantFromPlatform,
  listAllTenants,
  TENANT_PLAN_KEYS,
} from "@/modules/platform";

import {
  IconOrg,
  IconProjects,
  KpiCard,
  PlanDistributionPanel,
  TenantProjectShareBar,
  VpcAdminGradientShell,
  VpcAdminInsetShell,
} from "../_components/vpc-visuals";
import { DeleteTenantForm } from "../delete-tenant-form";
import {
  platformClearTenantLogoAction,
  platformUploadTenantLogoAction,
  putTenantLogoFromBuffer,
} from "../tenant-logo-actions";
import { deleteTenantPlatformAction } from "../tenant-delete-actions";

export const dynamic = "force-dynamic";

const PLAN_LABEL: Record<(typeof TENANT_PLAN_KEYS)[number], string> = {
  starter: "Starter",
  pro: "Pro",
  enterprise: "Enterprise",
};

type PageProps = {
  searchParams: Promise<{
    error?: string;
    ok?: string;
    newTenant?: string;
    /** Logo opcional al crear: código si falló el upload tras crear el tenant */
    logoWarn?: string;
  }>;
};

export default async function AdminTenantsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const session = await getSessionUser();
  if (!session?.isSuperAdmin) redirect("/dashboard/projects");

  const tenants = await listAllTenants();

  const planCounts: Record<string, number> = {};
  let totalProjects = 0;
  let totalMembers = 0;
  for (const t of tenants) {
    planCounts[t.plan] = (planCounts[t.plan] ?? 0) + 1;
    totalProjects += t._count.projects;
    totalMembers += t._count.memberships;
  }
  const tenantProjectRows = tenants.map((t) => ({
    id: t.id,
    name: t.name,
    slug: t.slug,
    projects: t._count.projects,
  }));

  const newTenantId = params.newTenant?.trim() ?? "";
  const newTenantRow =
    newTenantId.length > 0
      ? await db.tenant.findUnique({
          where: { id: newTenantId },
          select: { id: true, name: true, slug: true },
        })
      : null;

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

    const logo = formData.get("logo");
    if (logo instanceof File && logo.size > 0) {
      const buf = Buffer.from(await logo.arrayBuffer());
      const put = await putTenantLogoFromBuffer(result.tenantId, buf, logo.type);
      if (!put.ok) {
        revalidatePath("/admin");
        revalidatePath("/admin/tenants");
        redirect(
          `/admin/tenants?newTenant=${encodeURIComponent(result.tenantId)}&logoWarn=${encodeURIComponent(put.code)}`,
        );
      }
      revalidatePath("/admin");
      revalidatePath("/admin/tenants");
      revalidatePath("/dashboard", "layout");
    }

    redirect(`/admin/tenants?newTenant=${encodeURIComponent(result.tenantId)}`);
  }

  async function enterNewWorkspaceAction(formData: FormData) {
    "use server";
    const s = await getSessionUser();
    if (!s?.isSuperAdmin) redirect("/admin/tenants?error=Sin+permiso");
    const tenantId = String(formData.get("tenantId") ?? "");
    const ok = await setActiveTenantAsPlatformOwner(tenantId);
    if (!ok) redirect("/admin/tenants?error=Organizacion+no+encontrada");
    redirect("/dashboard/projects");
  }

  const logoWarnMessage = (() => {
    const w = params.logoWarn?.trim();
    if (!w) return null;
    const map: Record<string, string> = {
      tamano_logo: "la imagen supera 2 MB.",
      tipo_logo: "formato no permitido (usa PNG, JPEG o WebP).",
      storage_logo:
        "no se pudo guardar en almacenamiento (revisa bucket tenant-logos y SUPABASE_SERVICE_ROLE_KEY).",
    };
    return map[w] ?? w;
  })();

  const resolvedError = (() => {
    const e = params.error?.trim();
    if (!e) return null;
    const map: Record<string, string> = {
      sin_permiso_logo: "No tienes permiso para cambiar logos.",
      tenant_logo: "Falta identificar la organización.",
      tenant_no_encontrado: "Organización no encontrada.",
      archivo_logo: "Selecciona un archivo de imagen (PNG, JPEG o WebP).",
      tamano_logo: "La imagen supera 2 MB.",
      tipo_logo: "Formato no permitido. Usa PNG, JPEG o WebP.",
      storage_logo:
        "No se pudo guardar en almacenamiento. Revisa el bucket tenant-logos y SUPABASE_SERVICE_ROLE_KEY.",
    };
    return map[e] ?? e;
  })();

  return (
    <div className="space-y-8">
      <VpcAdminGradientShell className="p-6">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-white/60">
          Value Project Consulting
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">
          Alta de organizaciones
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-white/78">
          Crea tenants aislados con roles base. Sube el <strong className="text-white">logo del cliente</strong>{" "}
          para que aparezca junto al nombre en el menú del workspace. Luego invita equipos desde{" "}
          <strong className="text-white">Invitar usuario</strong> o entra al workspace desde la cartera.
        </p>
        <dl className="mt-6 grid gap-6 sm:grid-cols-3">
          <div>
            <dt className="text-[11px] font-medium uppercase tracking-wide text-white/50">
              Organizaciones
            </dt>
            <dd className="text-2xl font-semibold tabular-nums">{tenants.length}</dd>
          </div>
          <div>
            <dt className="text-[11px] font-medium uppercase tracking-wide text-white/50">
              Proyectos totales
            </dt>
            <dd className="text-2xl font-semibold tabular-nums">{totalProjects}</dd>
          </div>
          <div>
            <dt className="text-[11px] font-medium uppercase tracking-wide text-white/50">
              Miembros
            </dt>
            <dd className="text-2xl font-semibold tabular-nums">{totalMembers}</dd>
          </div>
        </dl>
      </VpcAdminGradientShell>

      <section className="grid gap-4 sm:grid-cols-2">
        <KpiCard
          label="Proyectos en plataforma"
          value={totalProjects}
          hint="Suma de todos los clientes."
          icon={<IconProjects />}
          accent="steel"
        />
        <KpiCard
          label="Organizaciones registradas"
          value={tenants.length}
          hint="Cada fila en la tabla inferior es un tenant."
          icon={<IconOrg />}
        />
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <PlanDistributionPanel counts={planCounts} title="Planes por organización" />
        <TenantProjectShareBar
          tenants={tenantProjectRows}
          title="Carga de proyectos (top 10)"
        />
      </div>

      <VpcAdminInsetShell innerClassName="p-4 sm:p-5">
        <p className="text-sm leading-relaxed text-[#4a4234]">
          Este módulo es el <strong className="text-[#0f1f5c]">alta de cliente</strong> en la
          plataforma. Para operar dentro del cliente usa{" "}
          <Link
            href="/admin"
            className="font-semibold text-[#0f1f5c] underline decoration-[#c9a46c]/55 underline-offset-2 hover:decoration-[#c9a46c]"
          >
            Cartera de clientes
          </Link>
          .
        </p>
      </VpcAdminInsetShell>

      {resolvedError && (
        <p className="rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
          {resolvedError}
        </p>
      )}
      {params.ok && !newTenantRow && (
        <p className="rounded-md border border-[#c9a46c]/40 bg-[linear-gradient(135deg,#faf8f4_0%,#f3ead8_100%)] p-3 text-sm text-[#2a2412] shadow-sm ring-1 ring-[#0f1f5c]/[0.05]">
          {params.ok === "logo_subido"
            ? "Logo del cliente actualizado. Se mostrará en el menú del workspace al entrar a esa organización."
            : params.ok === "logo_quitado"
              ? "Logo eliminado para esa organización."
              : params.ok}
        </p>
      )}

      {newTenantRow && (
        <VpcAdminInsetShell innerClassName="p-5 text-sm text-[#2a2412]">
          <p className="font-semibold text-[#0f1f5c]">Organización creada</p>
          {logoWarnMessage ? (
            <p className="mt-3 rounded-lg border border-amber-400/60 bg-amber-50 px-3 py-2.5 text-[13px] leading-relaxed text-amber-950">
              El logo no se pudo subir: {logoWarnMessage} Podés volver a intentarlo en la tabla de
              abajo (columna <strong className="font-semibold">Logo cliente</strong>).
            </p>
          ) : null}
          <p className="mt-2">
            <span className="font-medium text-[#1a3052]">{newTenantRow.name}</span>{" "}
            <span className="text-[#6b5c48]">({newTenantRow.slug})</span>
          </p>
          <p className="mt-2 text-[#4a4234]">
            Puedes entrar ya al workspace como consultora, o ir a la cartera para
            seguir creando clientes.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <form action={enterNewWorkspaceAction}>
              <input type="hidden" name="tenantId" value={newTenantRow.id} />
              <button
                type="submit"
                className="rounded-md bg-[#0f1f5c] px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-[#152d4f] active:scale-[0.99]"
              >
                Entrar al workspace ahora
              </button>
            </form>
            <Link
              href="/admin"
              className="inline-flex items-center rounded-md border border-[#c9a46c]/55 bg-white px-4 py-2 text-sm font-medium text-[#0f1f5c] shadow-sm transition hover:bg-[#faf8f4]"
            >
              Ir a la cartera
            </Link>
          </div>
        </VpcAdminInsetShell>
      )}

      <VpcAdminInsetShell innerClassName="p-6">
        <h2 className="text-base font-semibold text-[#0f1f5c]">
          Nueva organización (tenant)
        </h2>
        <p className="mt-1 text-sm text-[#5c5346]">
          Se crean roles base (owner, admin, etc.) vacíos. Los usuarios entran por invitación desde{" "}
          <strong>Miembros</strong> en el workspace. Podés adjuntar un{" "}
          <strong className="text-[#0f1f5c]">logo del cliente</strong> aquí (opcional): se muestra en
          el menú lateral junto al usuario. También podés subirlo o cambiarlo después en la tabla de
          organizaciones.
        </p>
        <form
          action={createTenantAction}
          encType="multipart/form-data"
          className="mt-4 grid gap-3 sm:grid-cols-2"
        >
          <div className="sm:col-span-2 rounded-xl border-2 border-dashed border-[#0f1f5c]/25 bg-[linear-gradient(145deg,#f0f4fb_0%,#faf8f4_100%)] p-4 ring-1 ring-[#c9a46c]/30">
            <p className="text-sm font-semibold text-[#0f1f5c]">Imagen del cliente (opcional)</p>
            <p className="mt-1 text-[12px] leading-snug text-[#5c5346]">
              Se muestra en el <strong className="text-[#0f1f5c]">menú lateral</strong> del workspace
              junto al usuario. Formatos: PNG, JPEG o WebP · máximo 2 MB.
            </p>
            <input
              id="admin-new-tenant-logo"
              type="file"
              name="logo"
              accept="image/png,image/jpeg,image/webp"
              aria-label="Archivo de imagen del logo del cliente"
              className="mt-3 block w-full min-w-0 max-w-lg text-[13px] text-[#1a1916] file:mr-3 file:cursor-pointer file:rounded-lg file:border-0 file:bg-gradient-to-b file:from-[#152d4f] file:to-[#0f1f5c] file:px-4 file:py-2.5 file:text-xs file:font-semibold file:text-white file:shadow-sm"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-[#6b5c48]">Nombre</label>
            <input
              name="name"
              required
              className="mt-1 w-full rounded-lg border border-[#e3d6c4] bg-white px-3 py-2 text-sm text-[#1a1916] focus:border-[#0f1f5c]/40 focus:outline-none focus:ring-2 focus:ring-[#0f1f5c]/15"
              placeholder="Mobility ADO"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-[#6b5c48]">Slug</label>
            <input
              name="slug"
              required
              pattern="[a-z0-9]+(-[a-z0-9]+)*"
              className="mt-1 w-full rounded-lg border border-[#e3d6c4] bg-white px-3 py-2 text-sm text-[#1a1916] focus:border-[#0f1f5c]/40 focus:outline-none focus:ring-2 focus:ring-[#0f1f5c]/15"
              placeholder="mobility-ado"
            />
            <p className="mt-1 text-xs text-[#8a7d6f]">
              URL interna; minúsculas y guiones. Único en toda la plataforma.
            </p>
          </div>
          <div className="sm:col-span-2">
            <label className="text-xs font-medium text-[#6b5c48]">Plan</label>
            <select
              name="plan"
              defaultValue="starter"
              className="mt-1 w-full max-w-xs rounded-lg border border-[#e3d6c4] bg-white px-3 py-2 text-sm sm:w-auto"
            >
              {TENANT_PLAN_KEYS.map((key) => (
                <option key={key} value={key}>
                  {PLAN_LABEL[key]}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-[#8a7d6f]">
              Límites actuales por plan (proyectos / puestos miembro+invitaciones):{" "}
              {TENANT_PLAN_KEYS.map((k) => (
                <span key={k} className="mr-2 inline-block">
                  {PLAN_LABEL[k]}: {PLAN_LIMITS[k].maxProjects} /{" "}
                  {PLAN_LIMITS[k].maxMemberSeats}
                </span>
              ))}
            </p>
          </div>
          <div className="sm:col-span-2">
            <button
              type="submit"
              className="rounded-lg bg-gradient-to-b from-[#152d4f] to-[#0f1f5c] px-4 py-2 text-sm font-semibold text-white shadow-sm ring-1 ring-[#c9a46c]/35 transition hover:from-[#1a3a63] hover:to-[#12224d] active:scale-[0.99]"
            >
              Crear organización
            </button>
          </div>
        </form>
      </VpcAdminInsetShell>

      <VpcAdminInsetShell innerClassName="overflow-hidden p-0">
        <h2 className="border-b border-[#e8dfd0] bg-[linear-gradient(180deg,#faf8f4,#ffffff)] px-5 py-3.5 text-base font-semibold text-[#0f1f5c]">
          Organizaciones ({tenants.length})
        </h2>
        <div className="overflow-x-auto px-1 pb-1">
          <table className="w-full min-w-[860px] border-collapse text-[13px]">
            <thead>
              <tr className="border-b border-[#e8dfd0] text-left">
                <th className="px-4 py-3 font-mono text-[10px] font-medium uppercase tracking-wide text-[#a09d98]">
                  Logo cliente
                </th>
                <th className="px-4 py-3 font-mono text-[10px] font-medium uppercase tracking-wide text-[#a09d98]">
                  Nombre
                </th>
                <th className="px-4 py-3 font-mono text-[10px] font-medium uppercase tracking-wide text-[#a09d98]">
                  Slug
                </th>
                <th className="px-4 py-3 font-mono text-[10px] font-medium uppercase tracking-wide text-[#a09d98]">
                  Plan
                </th>
                <th className="px-4 py-3 text-right font-mono text-[10px] font-medium uppercase tracking-wide text-[#a09d98]">
                  Proyectos
                </th>
                <th className="px-4 py-3 text-right font-mono text-[10px] font-medium uppercase tracking-wide text-[#a09d98]">
                  Miembros
                </th>
                <th className="px-4 py-3 text-right font-mono text-[10px] font-medium uppercase tracking-wide text-[#a09d98]">
                  Eliminar
                </th>
              </tr>
            </thead>
            <tbody>
              {tenants.map((t) => (
                <tr key={t.id} className="border-b border-[#f0ebe0] transition hover:bg-[#faf6ef]">
                  <td className="max-w-[220px] px-4 py-3 align-top">
                    <div className="flex flex-col gap-2 sm:max-w-[200px]">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-[#e3d6c4] bg-white shadow-sm ring-1 ring-[#0f1f5c]/[0.05]">
                        {t.logoUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element -- URL pública Supabase Storage
                          <img
                            src={t.logoUrl}
                            alt=""
                            className="h-full w-full object-contain p-0.5"
                          />
                        ) : (
                          <span className="text-[9px] font-semibold uppercase tracking-wide text-[#c9a46c]">
                            Sin logo
                          </span>
                        )}
                      </div>
                      <form action={platformUploadTenantLogoAction} className="flex flex-col gap-1.5">
                        <input type="hidden" name="tenantId" value={t.id} />
                        <input
                          type="file"
                          name="logo"
                          accept="image/png,image/jpeg,image/webp"
                          className="w-full min-w-0 text-[11px] text-[#57534e] file:mr-1 file:rounded-md file:border-0 file:bg-gradient-to-b file:from-[#152d4f] file:to-[#0f1f5c] file:px-2 file:py-1 file:text-[11px] file:font-semibold file:text-white"
                        />
                        <button
                          type="submit"
                          className="w-fit rounded-lg bg-gradient-to-b from-[#152d4f] to-[#0f1f5c] px-2.5 py-1 text-[11px] font-semibold text-white shadow-sm ring-1 ring-[#c9a46c]/30 hover:from-[#1a3a63] hover:to-[#12224d]"
                        >
                          Subir imagen
                        </button>
                      </form>
                      {t.logoUrl ? (
                        <form action={platformClearTenantLogoAction}>
                          <input type="hidden" name="tenantId" value={t.id} />
                          <button
                            type="submit"
                            className="text-left text-[11px] font-medium text-rose-700 underline decoration-rose-300 underline-offset-2 hover:text-rose-900"
                          >
                            Quitar logo
                          </button>
                        </form>
                      ) : null}
                      <p className="text-[10px] leading-snug text-[#9a8b78]">
                        Visible en el menú lateral del workspace junto al usuario.
                      </p>
                    </div>
                  </td>
                  <td className="px-4 py-3 font-medium text-[#0f1f5c]">{t.name}</td>
                  <td className="px-4 py-3 font-mono text-[12px] text-[#57534e]">{t.slug}</td>
                  <td className="px-4 py-3 text-[#57534e]">{t.plan}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{t._count.projects}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{t._count.memberships}</td>
                  <td className="px-4 py-3 text-right align-top">
                    <div className="flex justify-end">
                      <DeleteTenantForm
                        deleteAction={deleteTenantPlatformAction}
                        tenantId={t.id}
                        tenantSlug={t.slug}
                        tenantName={t.name}
                        next="tenants"
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </VpcAdminInsetShell>
    </div>
  );
}
