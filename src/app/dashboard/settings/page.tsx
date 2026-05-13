import Link from "next/link";
import { redirect } from "next/navigation";

import { getSessionUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { canManageMembers } from "@/lib/rbac";
import { requireTenantId } from "@/lib/tenancy";

import { clearTenantLogoAction, uploadTenantLogoAction } from "./actions";

export const dynamic = "force-dynamic";

const ERR: Record<string, string> = {
  sin_permiso: "Solo el propietario o un administrador puede cambiar el logo.",
  archivo: "Selecciona un archivo de imagen (PNG, JPG o WebP).",
  tamano: "El archivo supera el máximo de 2 MB.",
  tipo: "Formato no admitido. Usa PNG, JPG o WebP.",
  storage:
    "No se pudo guardar en almacenamiento. Crea el bucket público «tenant-logos» en Supabase (ver prisma/tenant_logos_bucket.sql) y revisa SUPABASE_SERVICE_ROLE_KEY.",
};

export default async function DashboardSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; ok?: string }>;
}) {
  const params = await searchParams;
  const session = await getSessionUser();
  if (!session) redirect("/login");

  const tenantId = await requireTenantId();
  const tenant = await db.tenant.findUnique({
    where: { id: tenantId },
    select: { name: true, slug: true, logoUrl: true },
  });
  if (!tenant) redirect("/select-tenant");

  const canEdit = canManageMembers(session.role);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-[#0f1f5c]">Organización</h1>
        <p className="mt-1 text-sm text-[#5c5346]">
          Marca del workspace: logo en el menú lateral y cabecera móvil.
        </p>
      </div>

      {params.error && (
        <p className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
          {ERR[params.error] ?? params.error}
        </p>
      )}
      {params.ok && (
        <p className="rounded-lg border border-[#c9a46c]/40 bg-[linear-gradient(135deg,#faf8f4_0%,#f3ead8_100%)] px-4 py-3 text-sm text-[#2a2412] ring-1 ring-[#0f1f5c]/[0.06]">
          Cambios guardados.
        </p>
      )}

      <section className="rounded-xl border border-[#e3d6c4] bg-[linear-gradient(165deg,#ffffff_0%,#faf8f4_100%)] p-6 shadow-sm ring-1 ring-[#0f1f5c]/[0.04]">
        <h2 className="text-base font-semibold text-[#0f1f5c]">Logo del tenant</h2>
        <p className="mt-1 text-sm text-[#5c5346]">
          {tenant.name} <span className="text-[#a09d98]">· {tenant.slug}</span>
        </p>

        {!canEdit ? (
          <p className="mt-4 text-sm text-[#6b5c48]">
            Solo un <strong className="text-[#0f1f5c]">propietario</strong> o{" "}
            <strong className="text-[#0f1f5c]">administrador</strong> puede subir o
            quitar el logo.{" "}
            <Link
              href="/dashboard/members"
              className="font-medium text-[#0f1f5c] underline decoration-[#c9a46c]/50"
            >
              Miembros
            </Link>
          </p>
        ) : (
          <div className="mt-6 space-y-6">
            <div className="flex flex-wrap items-start gap-6">
              <div className="rounded-xl border border-[#c9a46c]/40 bg-white p-3 shadow-sm ring-1 ring-[#0f1f5c]/[0.05]">
                {tenant.logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element -- URL dinámica de Storage
                  <img
                    src={tenant.logoUrl}
                    alt=""
                    className="h-24 w-24 object-contain"
                  />
                ) : (
                  <div className="flex h-24 w-24 items-center justify-center rounded-lg bg-[#0f1f5c]/[0.06] text-sm font-semibold text-[#0f1f5c]">
                    Sin logo
                  </div>
                )}
              </div>
              <div className="min-w-[220px] flex-1 space-y-3 text-sm text-[#4a4234]">
                <form
                  action={uploadTenantLogoAction}
                  encType="multipart/form-data"
                  className="space-y-3"
                >
                  <label className="grid gap-1.5">
                    <span className="font-medium text-[#0f1f5c]">Subir imagen</span>
                    <input
                      name="logo"
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      required
                      className="text-[13px] file:mr-3 file:rounded-md file:border-0 file:bg-[#0f1f5c] file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-white"
                    />
                  </label>
                  <p className="text-[12px] text-[#7a7268]">
                    PNG, JPG o Webp. Máximo 2 MB. Sustituye el logo anterior si ya
                    había uno.
                  </p>
                  <button
                    type="submit"
                    className="rounded-lg bg-gradient-to-b from-[#152d4f] to-[#0f1f5c] px-4 py-2 text-sm font-semibold text-white shadow-sm ring-1 ring-[#c9a46c]/30 transition hover:from-[#1a3a63] hover:to-[#12224d]"
                  >
                    Guardar logo
                  </button>
                </form>
                {tenant.logoUrl ? (
                  <form action={clearTenantLogoAction}>
                    <button
                      type="submit"
                      className="text-sm font-medium text-rose-800 underline decoration-rose-300 underline-offset-2 hover:text-rose-950"
                    >
                      Quitar logo
                    </button>
                  </form>
                ) : null}
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
