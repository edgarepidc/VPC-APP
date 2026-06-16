import Link from "next/link";
import { redirect } from "next/navigation";

import { DashboardSectionShell } from "@/app/dashboard/_components/section-shell";
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
import { getProjectHierarchyForSession, getSessionProjectScope } from "@/lib/project-scope";
import { db } from "@/lib/db";
import { personInitialsFromName, ROLE_LABELS, ROLE_SIDEBAR_LABELS } from "@/lib/role-labels";
import { flashMessageFromParam } from "@/lib/server-action-errors";
import { PMO_TEAM } from "@/lib/dashboard-paths";
import { requireTenantId } from "@/lib/tenancy";

import { clearUserAvatarAction, uploadUserAvatarAction } from "./avatar-actions";
import { ProjectAccessList } from "./project-access-list";
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
  const [tenant, user, scope, hierarchy] = await Promise.all([
    db.tenant.findUnique({
      where: { id: tenantId },
      select: { name: true },
    }),
    db.user.findUnique({
      where: { id: session.userId },
      select: { avatarUrl: true, name: true, email: true, phone: true },
    }),
    getSessionProjectScope(session, tenantId),
    getProjectHierarchyForSession(session, tenantId, { activeOnly: false }),
  ]);
  if (!tenant) redirect("/select-tenant");

  const fullProjectAccess = scope.type === "all";

  const personInitials = personInitialsFromName(
    user?.name ?? session.name,
    session.email,
  );

  const okMessage = flashMessageFromParam(params.ok);
  const errorMessage = flashMessageFromParam(params.error);

  return (
    <main className={dashPage}>
      <DashboardSectionShell
        eyebrow="Configuración"
        title={tenant.name}
        titleAs="h1"
      >
        {errorMessage ? <p className={`mx-4 mt-4 ${dashAlertError}`}>{errorMessage}</p> : null}
        {okMessage ? <p className={`mx-4 mt-4 ${dashAlertOk}`}>{okMessage}</p> : null}

        <div className="space-y-4 p-4">
      <section className={`${dashCard} p-4`}>
        <h2 className="text-base font-semibold text-slate-900">Tu acceso</h2>
        <dl className="mt-3 grid gap-2 text-sm text-slate-700 sm:grid-cols-2">
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Rol en esta organización
            </dt>
            <dd className="mt-0.5 font-medium text-slate-900">
              {ROLE_LABELS[session.role]} ({ROLE_SIDEBAR_LABELS[session.role]})
              {session.managerReadOnly ? " · solo lectura" : ""}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Administración global (/admin)
            </dt>
            <dd className="mt-0.5 font-medium text-slate-900">
              {session.isSuperAdmin ? "Sí — consultora VPC" : "No"}
            </dd>
          </div>
        </dl>
        {session.isSuperAdmin && !session.isSuperAdminFromDb && session.isSuperAdminFromEnv ? (
          <p className="mt-3 text-xs text-amber-800">
            Tu acceso a la administración global viene de la configuración de plataforma
            (correo autorizado en Vercel), no del rol PM/admin del cliente.
          </p>
        ) : null}
        {session.managerReadOnly ? (
          <p className="mt-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700">
            Tu perfil PM está en <strong>modo solo lectura</strong>: puedes consultar entregables,
            riesgos, escalómetro y reuniones, pero no crear ni editar registros.
          </p>
        ) : null}

        <div className="mt-4 border-t border-slate-200 pt-4">
          <h3 className="text-sm font-semibold text-slate-900">Iniciativas y subproyectos</h3>
          <ProjectAccessList
            fullAccess={fullProjectAccess}
            groups={hierarchy.groups}
          />
        </div>
      </section>

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
          <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-slate-800 text-2xl font-semibold text-white">
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
          <Link href={PMO_TEAM} className="font-medium text-slate-900 underline">
            Equipo
          </Link>
          .
        </p>
      </section>
        </div>
      </DashboardSectionShell>
    </main>
  );
}
