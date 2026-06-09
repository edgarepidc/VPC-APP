import Link from "next/link";
import { redirect } from "next/navigation";

import { DashboardPageHeader } from "@/app/dashboard/_components/page-header";
import {
  dashAlertError,
  dashAlertOk,
  dashCard,
  dashPage,
  uiButtonPrimary,
  uiInput,
  uiLabel,
} from "@/lib/ui-classes";
import { getSessionUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { personInitialsFromName } from "@/lib/role-labels";
import { requireTenantId } from "@/lib/tenancy";

import { clearUserAvatarAction, uploadUserAvatarAction } from "./avatar-actions";
import { updateSelfProfileAction } from "./profile-actions";

export const dynamic = "force-dynamic";

export default async function DashboardSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; ok?: string }>;
}) {
  const params = await searchParams;
  const session = await getSessionUser();
  if (!session) redirect("/login");

  const tenantId = await requireTenantId();
  const [tenant, user] = await Promise.all([
    db.tenant.findUnique({
      where: { id: tenantId },
      select: { name: true },
    }),
    db.user.findUnique({
      where: { id: session.userId },
      select: { avatarUrl: true, name: true, email: true, phone: true },
    }),
  ]);
  if (!tenant) redirect("/select-tenant");

  const personInitials = personInitialsFromName(
    user?.name ?? session.name,
    session.email,
  );

  return (
    <main className={dashPage}>
      <DashboardPageHeader
        title="Configuración"
        description={
          <>
            Workspace: <strong>{tenant.name}</strong>
          </>
        }
      />

      {params.error ? (
        <p className={dashAlertError}>
          {decodeURIComponent(params.error.replace(/\+/g, " "))}
        </p>
      ) : null}
      {params.ok ? (
        <p className={dashAlertOk}>
          {decodeURIComponent(params.ok.replace(/\+/g, " "))}
        </p>
      ) : null}

      <section className={`${dashCard} p-4`}>
        <h2 className="text-base font-semibold text-slate-900">Datos personales</h2>
        <p className="mt-1 text-sm text-slate-600">
          Nombre y teléfono visibles para tu equipo en la organización.
        </p>
        <form action={updateSelfProfileAction} className="mt-4 grid max-w-md gap-3">
          <div>
            <label className={uiLabel}>Correo</label>
            <input
              type="email"
              value={user?.email ?? session.email}
              readOnly
              className={`mt-1 ${uiInput} bg-slate-50 text-slate-600`}
            />
          </div>
          <div>
            <label className={uiLabel}>Nombre</label>
            <input
              name="name"
              defaultValue={user?.name ?? ""}
              placeholder="Ej. María José"
              className={`mt-1 ${uiInput}`}
            />
          </div>
          <div>
            <label className={uiLabel}>Teléfono</label>
            <input
              name="phone"
              type="tel"
              defaultValue={user?.phone ?? ""}
              placeholder="Ej. +52 55 1234 5678"
              className={`mt-1 ${uiInput}`}
            />
          </div>
          <button type="submit" className={uiButtonPrimary.replace("w-full ", "w-auto ")}>
            Guardar datos
          </button>
        </form>
      </section>

      <section className={`${dashCard} p-4`}>
        <h2 className="text-base font-semibold text-slate-900">Foto de perfil</h2>
        <p className="mt-1 text-sm text-slate-600">
          Aparece en el menú lateral junto a tu nombre.
        </p>
        <div className="mt-4 flex flex-wrap items-start gap-4">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-slate-800 text-lg font-semibold text-white">
            {user?.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={user.avatarUrl}
                alt=""
                className="h-full w-full object-cover"
              />
            ) : (
              personInitials
            )}
          </div>
          <div className="min-w-[14rem] flex-1 space-y-3">
            <form action={uploadUserAvatarAction} className="space-y-2">
              <div>
                <label className={uiLabel}>Subir foto (PNG, JPG o WebP, máx. 2 MB)</label>
                <input
                  name="avatar"
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  required
                  className={`mt-1 block w-full max-w-md text-sm ${uiInput}`}
                />
              </div>
              <button type="submit" className={uiButtonPrimary.replace("w-full ", "w-auto ")}>
                Guardar foto
              </button>
            </form>
            {user?.avatarUrl ? (
              <form action={clearUserAvatarAction}>
                <button
                  type="submit"
                  className="text-sm text-red-600 underline decoration-red-300 underline-offset-2 hover:text-red-700"
                >
                  Quitar foto
                </button>
              </form>
            ) : null}
          </div>
        </div>
      </section>

      <section className={`${dashCard} p-4`}>
        <h2 className="text-base font-semibold text-slate-900">Marca del cliente</h2>
        <p className="mt-2 text-sm text-slate-600">
          El logo de la organización lo configura la consultora en{" "}
          {session.isSuperAdmin ? (
            <Link href="/admin" className="font-medium text-slate-900 underline">
              Administración → Clientes
            </Link>
          ) : (
            <span className="font-medium text-slate-900">Administración global</span>
          )}
          . Para invitar al equipo, usa{" "}
          <Link href="/dashboard/members" className="font-medium text-slate-900 underline">
            Miembros
          </Link>
          .
        </p>
      </section>
    </main>
  );
}
