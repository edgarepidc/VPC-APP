import Link from "next/link";
import { redirect } from "next/navigation";

import { UserMembershipManager } from "../_components/user-membership-manager";
import { UserPasswordReset } from "../_components/user-password-reset";
import {
  IconMail,
  IconPeople,
  InvitationStatusDonut,
  KpiCard,
  UsersGrowthChart,
} from "../_components/vpc-visuals";
import {
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
  uiButtonSecondary,
  uiInput,
  uiLabel,
} from "@/lib/ui-classes";
import { getSessionUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { ROLE_LABELS } from "@/lib/role-labels";
import type { RoleKey } from "@/lib/types";
import { auditActionLabel, listPlatformUserAudits } from "@/modules/platform-users/audit";
import { listRecentInvitationsForPlatform } from "@/modules/invitations/service";
import { listAllTenants } from "@/modules/platform";
import {
  getUsersGrowthByMonth,
  listPlatformUsers,
  syncUsersLastSignIn,
} from "@/modules/platform-users/service";

import { AdminManagerProjectScopeFields } from "../_components/manager-project-scope-fields";

import { createUserAction, updateUserAction } from "./actions";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<{
    error?: string;
    ok?: string;
    tenantId?: string;
    q?: string;
  }>;
};

function formatShortDate(d: Date | null | undefined) {
  if (!d) return "—";
  return new Intl.DateTimeFormat("es-MX", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(d);
}

export default async function AdminUsersPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const session = await getSessionUser();
  if (!session?.isSuperAdmin) redirect("/dashboard/projects");

  const rawQ = params.q?.trim() ?? "";
  const filterTenant = params.tenantId?.trim() ?? "";

  const [
    tenants,
    recentInvites,
    pendingTotal,
    acceptedTotal,
    totalUsers,
    activeUsers,
    growthPoints,
    audits,
  ] = await Promise.all([
    listAllTenants(),
    listRecentInvitationsForPlatform({ take: 10 }),
    db.invitation.count({ where: { status: "pending" } }),
    db.invitation.count({ where: { status: "accepted" } }),
    db.user.count(),
    db.user.count({ where: { isActive: true } }),
    getUsersGrowthByMonth(12),
    listPlatformUserAudits({ take: 30 }),
  ]);

  let users = await listPlatformUsers({
    q: rawQ || undefined,
    tenantId: filterTenant || undefined,
  });

  await syncUsersLastSignIn(users.map((u) => u.id));
  users = await listPlatformUsers({
    q: rawQ || undefined,
    tenantId: filterTenant || undefined,
  });

  const createTarget =
    (filterTenant ? tenants.find((t) => t.id === filterTenant) : undefined) ??
    (tenants.length === 1 ? tenants[0] : undefined);

  const tenantOptions = tenants.map((t) => ({ id: t.id, name: t.name, slug: t.slug }));
  const allProjects = await db.project.findMany({
    select: { id: true, name: true, tenantId: true },
    orderBy: { name: "asc" },
  });
  const projectsByTenant = allProjects.reduce<Record<string, { id: string; name: string }[]>>(
    (acc, p) => {
      if (!acc[p.tenantId]) acc[p.tenantId] = [];
      acc[p.tenantId].push({ id: p.id, name: p.name });
      return acc;
    },
    {},
  );
  const exportHref = `/admin/users/export?${new URLSearchParams({
    ...(rawQ ? { q: rawQ } : {}),
    ...(filterTenant ? { tenantId: filterTenant } : {}),
  }).toString()}`;

  return (
    <div className={adminPage}>
      {params.error && (
        <p className={adminAlertError}>
          {decodeURIComponent(params.error.replace(/\+/g, " "))}
        </p>
      )}
      {params.ok && (
        <p className={adminAlertOk}>
          {decodeURIComponent(params.ok.replace(/\+/g, " "))}
        </p>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <KpiCard
          label="Usuarios totales"
          value={totalUsers}
          hint={`${activeUsers} activos en plataforma`}
          icon={<IconPeople />}
        />
        <KpiCard
          label="En esta vista"
          value={users.length}
          hint={
            filterTenant
              ? `Org: ${tenants.find((t) => t.id === filterTenant)?.name ?? "—"}`
              : rawQ
                ? `Búsqueda: «${rawQ}»`
                : "Directorio completo"
          }
          icon={<IconMail />}
        />
        <UsersGrowthChart points={growthPoints} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <InvitationStatusDonut pending={pendingTotal} accepted={acceptedTotal} />
        </div>
        <section className={`${adminCard} p-4 lg:col-span-2`}>
          <h2 className={adminSectionTitle}>Nuevo usuario</h2>
          <p className={adminSectionSub}>
            Alta directa con correo y contraseña confirmados. Sin invitación por correo.
          </p>

          {tenants.length === 0 ? (
            <p className="mt-4 text-sm text-slate-600">
              Primero crea una organización en{" "}
              <Link href="/admin" className="font-medium underline">
                Clientes
              </Link>
              .
            </p>
          ) : (
            <form action={createUserAction} className="mt-4 grid gap-3 sm:grid-cols-2">
              <input type="hidden" name="filterQ" value={rawQ} />
              <input type="hidden" name="filterTenant" value={filterTenant} />
              <div className="sm:col-span-2">
                <label className={uiLabel}>Organización</label>
                <select
                  name="tenantId"
                  required
                  defaultValue={createTarget?.id ?? ""}
                  className={`mt-1 ${uiInput}`}
                >
                  <option value="" disabled>
                    Seleccionar…
                  </option>
                  {tenants.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.slug})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={uiLabel}>Correo</label>
                <input name="email" type="email" required className={`mt-1 ${uiInput}`} />
              </div>
              <div>
                <label className={uiLabel}>Contraseña inicial</label>
                <input
                  name="password"
                  type="password"
                  required
                  minLength={8}
                  autoComplete="new-password"
                  className={`mt-1 ${uiInput}`}
                />
              </div>
              <div>
                <label className={uiLabel}>Nombre</label>
                <input name="name" className={`mt-1 ${uiInput}`} />
              </div>
              <div>
                <label className={uiLabel}>Teléfono</label>
                <input name="phone" type="tel" className={`mt-1 ${uiInput}`} />
              </div>
              <div>
                <label className={uiLabel}>Cargo</label>
                <input name="jobTitle" placeholder="Ej. PMO Lead" className={`mt-1 ${uiInput}`} />
              </div>
              <div>
                <label className={uiLabel}>Departamento</label>
                <input name="department" placeholder="Ej. TI" className={`mt-1 ${uiInput}`} />
              </div>
              <div className="sm:col-span-2">
                <label className={uiLabel}>Rol en la organización</label>
                <select name="role" defaultValue="member" className={`mt-1 ${uiInput} max-w-xs`}>
                  {(Object.keys(ROLE_LABELS) as RoleKey[]).map((key) => (
                    <option key={key} value={key}>
                      {ROLE_LABELS[key]}
                    </option>
                  ))}
                </select>
              </div>
              <AdminManagerProjectScopeFields
                tenantId={createTarget?.id ?? ""}
                projectsByTenant={projectsByTenant}
                roleSelectName="role"
                tenantSelectName="tenantId"
              />
              <div className="sm:col-span-2">
                <button type="submit" className={uiButtonPrimary.replace("w-full ", "w-auto ")}>
                  Crear usuario
                </button>
              </div>
            </form>
          )}
        </section>
      </div>

      <section className={`${adminCard} p-4`}>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className={adminSectionTitle}>Directorio de usuarios</h2>
            <p className={adminSectionSub}>
              Perfil, organizaciones, roles, acceso y contraseña.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <form method="get" action="/admin/users" className="flex flex-wrap items-center gap-2">
              <select
                name="tenantId"
                defaultValue={filterTenant}
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
              >
                <option value="">Todas las organizaciones</option>
                {tenants.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
              <input
                name="q"
                type="search"
                placeholder="Buscar…"
                defaultValue={rawQ}
                className="min-w-[160px] rounded-lg border border-slate-200 px-3 py-2 text-sm"
              />
              <button type="submit" className={uiButtonPrimary.replace("w-full ", "w-auto ")}>
                Filtrar
              </button>
              {(rawQ || filterTenant) && (
                <Link href="/admin/users" className="text-sm font-medium text-slate-700 underline">
                  Limpiar
                </Link>
              )}
            </form>
            <a href={exportHref} className={uiButtonSecondary.replace("py-2.5", "py-2 text-sm")}>
              Exportar CSV
            </a>
          </div>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className={`${adminTable} min-w-[1100px]`}>
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className={adminTh}>Correo</th>
                <th className={adminTh}>Perfil</th>
                <th className={adminTh}>Organizaciones</th>
                <th className={adminTh}>Acceso</th>
                <th className={adminTh}>Último acceso</th>
                <th className={adminTh}>Contraseña</th>
                <th className={adminTh}>Guardar</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => {
                const formId = `user-form-${u.id}`;
                return (
                  <tr key={u.id} className="border-b border-slate-100 align-top hover:bg-slate-50">
                    <td className={`${adminTd} min-w-[10rem]`}>
                      <p className="font-medium text-slate-900">{u.email}</p>
                      {u.isSuperAdmin ? (
                        <span className="mt-1 inline-block text-[10px] font-semibold uppercase tracking-wide text-amber-700">
                          Superadmin
                        </span>
                      ) : null}
                      <p className="mt-1 text-[11px] text-slate-500">
                        Alta {formatShortDate(u.createdAt)}
                      </p>
                    </td>
                    <td className={adminTd}>
                      <div className="grid min-w-[10rem] gap-1.5">
                        <input
                          form={formId}
                          name="name"
                          defaultValue={u.name ?? ""}
                          placeholder="Nombre"
                          className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
                        />
                        <input
                          form={formId}
                          name="phone"
                          type="tel"
                          defaultValue={u.phone ?? ""}
                          placeholder="Teléfono"
                          className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
                        />
                        <input
                          form={formId}
                          name="jobTitle"
                          defaultValue={u.jobTitle ?? ""}
                          placeholder="Cargo"
                          className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
                        />
                        <input
                          form={formId}
                          name="department"
                          defaultValue={u.department ?? ""}
                          placeholder="Departamento"
                          className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
                        />
                      </div>
                    </td>
                    <td className={adminTd}>
                      <UserMembershipManager
                        userId={u.id}
                        filterQ={rawQ}
                        filterTenant={filterTenant}
                        tenants={tenantOptions}
                        projectsByTenant={projectsByTenant}
                        memberships={u.memberships.map((m) => ({
                          tenantId: m.tenant.id,
                          tenantName: m.tenant.name,
                          tenantSlug: m.tenant.slug,
                          roleKey: m.role.key,
                          managerAllProjects: m.managerAllProjects,
                          projectIds: m.projectAccess.map((row) => row.project.id),
                        }))}
                      />
                    </td>
                    <td className={adminTd}>
                      <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                        <input
                          form={formId}
                          type="checkbox"
                          name="isActive"
                          defaultChecked={u.isActive}
                          className="rounded border-slate-300"
                        />
                        Activo
                      </label>
                    </td>
                    <td className={`${adminTd} tabular-nums text-sm text-slate-600`}>
                      {formatShortDate(u.lastSignInAt)}
                    </td>
                    <td className={adminTd}>
                      <UserPasswordReset
                        userId={u.id}
                        email={u.email}
                        disabled={!u.isActive}
                      />
                    </td>
                    <td className={adminTd}>
                      <form id={formId} action={updateUserAction}>
                        <input type="hidden" name="userId" value={u.id} />
                        <input type="hidden" name="filterQ" value={rawQ} />
                        <input type="hidden" name="filterTenant" value={filterTenant} />
                        <button
                          type="submit"
                          className={uiButtonPrimary.replace("w-full ", "w-auto px-3 py-1.5 text-xs ")}
                        >
                          Guardar
                        </button>
                      </form>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {users.length === 0 && (
            <p className="py-8 text-center text-sm text-slate-500">
              Sin usuarios en esta vista.
            </p>
          )}
        </div>
      </section>

      <section className={`${adminCard} overflow-hidden`}>
        <div className="border-b border-slate-200 px-4 py-3">
          <h2 className={adminSectionTitle}>Auditoría reciente</h2>
          <p className={adminSectionSub}>
            Altas, cambios de perfil, roles, accesos y resets de contraseña.
          </p>
        </div>
        <div className="overflow-x-auto">
          {audits.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-slate-500">Sin eventos aún.</p>
          ) : (
            <table className={adminTable}>
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className={adminTh}>Fecha</th>
                  <th className={adminTh}>Usuario</th>
                  <th className={adminTh}>Acción</th>
                  <th className={adminTh}>Detalle</th>
                  <th className={adminTh}>Por</th>
                </tr>
              </thead>
              <tbody>
                {audits.map((row) => (
                  <tr key={row.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className={`${adminTd} tabular-nums text-slate-600`}>
                      {formatShortDate(row.createdAt)}
                    </td>
                    <td className={adminTd}>
                      <span className="font-medium text-slate-900">{row.user.email}</span>
                    </td>
                    <td className={adminTd}>{auditActionLabel(row.action)}</td>
                    <td className={`${adminTd} max-w-xs text-slate-600`}>
                      {row.details ?? "—"}
                    </td>
                    <td className={adminTd}>
                      {row.actor?.email ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        {recentInvites.length > 0 ? (
          <details className="border-t border-slate-200 px-4 py-3">
            <summary className="cursor-pointer text-sm font-medium text-slate-700">
              Invitaciones históricas por correo ({recentInvites.length})
            </summary>
            <div className="mt-3 overflow-x-auto">
              <table className={adminTable}>
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className={adminTh}>Correo</th>
                    <th className={adminTh}>Cliente</th>
                    <th className={adminTh}>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {recentInvites.map((row) => (
                    <tr key={row.id} className="border-b border-slate-100">
                      <td className={adminTd}>{row.email}</td>
                      <td className={adminTd}>{row.tenant.name}</td>
                      <td className={adminTd}>{row.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        ) : null}
      </section>
    </div>
  );
}
