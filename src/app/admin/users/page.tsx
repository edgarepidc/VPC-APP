import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  IconMail,
  IconPeople,
  InvitationStatusDonut,
  KpiCard,
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
  uiInput,
  uiLabel,
} from "@/lib/ui-classes";
import { getSessionUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { ROLE_LABELS } from "@/lib/role-labels";
import type { RoleKey } from "@/lib/types";
import { listRecentInvitationsForPlatform } from "@/modules/invitations/service";
import { PlanLimitError, listAllTenants } from "@/modules/platform";
import {
  createPlatformUserDirect,
  listPlatformUsers,
  updatePlatformUserProfile,
} from "@/modules/platform-users/service";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<{
    error?: string;
    ok?: string;
    tenantId?: string;
    q?: string;
  }>;
};

function formatShortDate(d: Date) {
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
  const [
    tenants,
    users,
    recentInvites,
    pendingTotal,
    acceptedTotal,
    totalUsers,
    activeUsers,
  ] = await Promise.all([
    listAllTenants(),
    listPlatformUsers({ q: rawQ || undefined }),
    listRecentInvitationsForPlatform({ take: 15 }),
    db.invitation.count({ where: { status: "pending" } }),
    db.invitation.count({ where: { status: "accepted" } }),
    db.user.count(),
    db.user.count({ where: { isActive: true } }),
  ]);

  const rawParamTenant = params.tenantId?.trim() ?? "";
  const createTarget =
    (rawParamTenant ? tenants.find((t) => t.id === rawParamTenant) : undefined) ??
    (tenants.length === 1 ? tenants[0] : undefined);

  async function createUserAction(formData: FormData) {
    "use server";
    const s = await getSessionUser();
    if (!s?.isSuperAdmin) redirect("/admin/users?error=Sin+permiso");

    const tenantId = String(formData.get("tenantId") ?? "").trim();
    const email = String(formData.get("email") ?? "").trim();
    const password = String(formData.get("password") ?? "");
    const name = String(formData.get("name") ?? "").trim();
    const phone = String(formData.get("phone") ?? "").trim();
    const roleKey = String(formData.get("role")) as RoleKey;
    const validRoles: RoleKey[] = ["owner", "admin", "manager", "member"];

    if (!tenantId || !email || !password || !validRoles.includes(roleKey)) {
      const q = tenantId
        ? `?tenantId=${encodeURIComponent(tenantId)}&error=Datos+invalidos`
        : "?error=Datos+invalidos";
      redirect(`/admin/users${q}`);
    }

    try {
      const result = await createPlatformUserDirect({
        tenantId,
        email,
        password,
        name: name || undefined,
        phone: phone || undefined,
        roleKey,
      });
      revalidatePath("/admin/users");
      revalidatePath("/admin");
      if (result.status === "created") {
        redirect(
          `/admin/users?tenantId=${encodeURIComponent(tenantId)}&ok=Usuario+creado+y+asignado`,
        );
      }
      redirect(
        `/admin/users?tenantId=${encodeURIComponent(tenantId)}&ok=${encodeURIComponent(result.message)}`,
      );
    } catch (e) {
      const msg = e instanceof PlanLimitError ? e.message : (e as Error).message;
      redirect(
        `/admin/users?tenantId=${encodeURIComponent(tenantId)}&error=${encodeURIComponent(msg)}`,
      );
    }
  }

  async function updateUserAction(formData: FormData) {
    "use server";
    const s = await getSessionUser();
    if (!s?.isSuperAdmin) redirect("/admin/users?error=Sin+permiso");

    const userId = String(formData.get("userId") ?? "").trim();
    const name = String(formData.get("name") ?? "").trim();
    const phone = String(formData.get("phone") ?? "").trim();
    const isActive = formData.get("isActive") === "on";

    if (!userId) redirect("/admin/users?error=Usuario+invalido");

    try {
      await updatePlatformUserProfile({ userId, name, phone, isActive });
      revalidatePath("/admin/users");
      redirect("/admin/users?ok=Perfil+actualizado");
    } catch (e) {
      redirect(`/admin/users?error=${encodeURIComponent((e as Error).message)}`);
    }
  }

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
          hint={rawQ ? `Filtrado por «${rawQ}»` : "Directorio completo"}
          icon={<IconMail />}
        />
        <div className="lg:col-span-1">
          <InvitationStatusDonut pending={pendingTotal} accepted={acceptedTotal} />
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-5">
        <section className={`${adminCard} p-4 lg:col-span-2`}>
          <h2 className={adminSectionTitle}>Nuevo usuario</h2>
          <p className={adminSectionSub}>
            Crea la cuenta con correo y contraseña confirmados (sin correo de invitación).
            El usuario entra directo en{" "}
            <span className="font-mono text-xs">/login</span>.
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
            <form action={createUserAction} className="mt-4 space-y-3">
              <div>
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
                <input
                  name="email"
                  type="email"
                  required
                  placeholder="usuario@empresa.com"
                  className={`mt-1 ${uiInput}`}
                />
              </div>
              <div>
                <label className={uiLabel}>Contraseña inicial</label>
                <input
                  name="password"
                  type="password"
                  required
                  minLength={8}
                  autoComplete="new-password"
                  placeholder="Mínimo 8 caracteres"
                  className={`mt-1 ${uiInput}`}
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className={uiLabel}>Nombre</label>
                  <input
                    name="name"
                    placeholder="Nombre completo"
                    className={`mt-1 ${uiInput}`}
                  />
                </div>
                <div>
                  <label className={uiLabel}>Teléfono</label>
                  <input
                    name="phone"
                    type="tel"
                    placeholder="+52 …"
                    className={`mt-1 ${uiInput}`}
                  />
                </div>
              </div>
              <div>
                <label className={uiLabel}>Rol en la organización</label>
                <select name="role" defaultValue="member" className={`mt-1 ${uiInput}`}>
                  {(Object.keys(ROLE_LABELS) as RoleKey[]).map((key) => (
                    <option key={key} value={key}>
                      {ROLE_LABELS[key]}
                    </option>
                  ))}
                </select>
              </div>
              <button type="submit" className={uiButtonPrimary.replace("w-full ", "w-auto ")}>
                Crear usuario
              </button>
            </form>
          )}
        </section>

        <section className={`${adminCard} overflow-hidden lg:col-span-3`}>
          <div className="border-b border-slate-200 px-4 py-3">
            <h2 className={adminSectionTitle}>Invitaciones históricas</h2>
            <p className={adminSectionSub}>
              Registro de invitaciones por correo (flujo anterior). Últimas 15.
            </p>
          </div>
          <div className="overflow-x-auto">
            {recentInvites.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-slate-500">
                Sin invitaciones registradas.
              </p>
            ) : (
              <table className={adminTable}>
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50">
                    <th className={adminTh}>Correo</th>
                    <th className={adminTh}>Cliente</th>
                    <th className={adminTh}>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {recentInvites.map((row) => (
                    <tr key={row.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className={`${adminTd} font-medium text-slate-900`}>{row.email}</td>
                      <td className={adminTd}>
                        {row.tenant.name}
                        <span className="text-slate-400"> · {row.tenant.slug}</span>
                      </td>
                      <td className={adminTd}>
                        <span
                          className={
                            row.status === "accepted"
                              ? "rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700"
                              : "rounded-full border border-slate-200 px-2 py-0.5 text-xs font-medium text-slate-600"
                          }
                        >
                          {row.status === "accepted" ? "Aceptada" : "Pendiente"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>
      </div>

      <section className={`${adminCard} p-4`}>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className={adminSectionTitle}>Directorio de usuarios</h2>
            <p className={adminSectionSub}>
              Todas las cuentas y sus organizaciones. Edita nombre, teléfono y estado.
            </p>
          </div>
          <form method="get" action="/admin/users" className="flex flex-wrap items-center gap-2">
            <input
              name="q"
              type="search"
              placeholder="Buscar correo, nombre o teléfono…"
              defaultValue={rawQ}
              className="min-w-[200px] rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
            <button type="submit" className={uiButtonPrimary.replace("w-full ", "w-auto ")}>
              Buscar
            </button>
            {rawQ && (
              <Link href="/admin/users" className="text-sm font-medium text-slate-700 underline">
                Limpiar
              </Link>
            )}
          </form>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className={`${adminTable} min-w-[960px]`}>
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className={adminTh}>Correo</th>
                <th className={adminTh}>Nombre</th>
                <th className={adminTh}>Teléfono</th>
                <th className={adminTh}>Organizaciones</th>
                <th className={adminTh}>Estado</th>
                <th className={adminTh}>Alta</th>
                <th className={adminTh}>Guardar</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => {
                const formId = `user-form-${u.id}`;
                return (
                  <tr key={u.id} className="border-b border-slate-100 align-top hover:bg-slate-50">
                    <td className={`${adminTd} font-medium text-slate-900`}>
                      {u.email}
                      {u.isSuperAdmin ? (
                        <span className="mt-1 block text-[10px] font-semibold uppercase tracking-wide text-amber-700">
                          Superadmin
                        </span>
                      ) : null}
                    </td>
                    <td className={adminTd}>
                      <input
                        form={formId}
                        name="name"
                        defaultValue={u.name ?? ""}
                        placeholder="Sin nombre"
                        className="w-full min-w-[8rem] rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
                      />
                    </td>
                    <td className={adminTd}>
                      <input
                        form={formId}
                        name="phone"
                        type="tel"
                        defaultValue={u.phone ?? ""}
                        placeholder="—"
                        className="w-full min-w-[7rem] rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
                      />
                    </td>
                    <td className={adminTd}>
                      {u.memberships.length === 0 ? (
                        <span className="text-slate-400">Sin org.</span>
                      ) : (
                        <ul className="space-y-1 text-xs">
                          {u.memberships.map((m) => (
                            <li key={`${u.id}-${m.tenant.id}`}>
                              <span className="font-medium text-slate-800">{m.tenant.name}</span>
                              <span className="text-slate-500">
                                {" "}
                                · {ROLE_LABELS[m.role.key as RoleKey] ?? m.role.key}
                              </span>
                            </li>
                          ))}
                        </ul>
                      )}
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
                    <td className={`${adminTd} tabular-nums text-slate-500`}>
                      {formatShortDate(u.createdAt)}
                    </td>
                    <td className={adminTd}>
                      <form id={formId} action={updateUserAction}>
                        <input type="hidden" name="userId" value={u.id} />
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
              {rawQ ? "Sin resultados para esa búsqueda." : "Aún no hay usuarios."}
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
