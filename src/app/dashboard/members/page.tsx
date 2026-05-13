import { redirect } from "next/navigation";

import { getSessionUser } from "@/lib/auth/session";
import { getAppUrl } from "@/lib/env";
import { ROLE_LABELS } from "@/lib/role-labels";
import { canManageMembers } from "@/lib/rbac";
import type { RoleKey } from "@/lib/types";
import { requireTenantId } from "@/lib/tenancy";
import { inviteAuthUserToTenant } from "@/modules/invitations/service";
import { PlanLimitError, getTenantUsageSnapshot } from "@/modules/platform";
import {
  assignRoleByEmail,
  listMembersByTenant,
} from "@/modules/memberships/service";

type MembersPageProps = {
  searchParams: Promise<{ error?: string; ok?: string }>;
};

export default async function MembersPage({ searchParams }: MembersPageProps) {
  const params = await searchParams;
  const session = await getSessionUser();
  if (!session) redirect("/login");
  if (!session.activeTenantId) redirect("/select-tenant");

  const tenantId = await requireTenantId();
  const [members, usage] = await Promise.all([
    listMembersByTenant(tenantId),
    getTenantUsageSnapshot(tenantId),
  ]);
  const canManage = canManageMembers(session.role);
  const appUrl = getAppUrl();

  async function assignRoleAction(formData: FormData) {
    "use server";
    const currentSession = await getSessionUser();
    if (!currentSession?.activeTenantId || !canManageMembers(currentSession.role)) {
      redirect("/dashboard/members?error=No+tienes+permiso+para+gestionar+miembros");
    }

    const email = String(formData.get("email") ?? "");
    const roleKey = String(formData.get("role")) as RoleKey;
    const validRoles: RoleKey[] = ["owner", "admin", "manager", "member"];
    if (!email || !validRoles.includes(roleKey)) {
      redirect("/dashboard/members?error=Datos+de+entrada+invalidos");
    }

    try {
      await assignRoleByEmail({
        tenantId: currentSession.activeTenantId,
        email,
        roleKey,
      });
      redirect("/dashboard/members?ok=Miembro+actualizado+directamente");
    } catch (error) {
      if (error instanceof PlanLimitError) {
        redirect(
          `/dashboard/members?error=${encodeURIComponent(error.message)}`,
        );
      }
      if ((error as Error).message !== "Usuario no encontrado. Debe registrarse primero.") {
        redirect(
          `/dashboard/members?error=${encodeURIComponent((error as Error).message)}`,
        );
      }

      try {
        const result = await inviteAuthUserToTenant({
          tenantId: currentSession.activeTenantId,
          email,
          roleKey,
          invitedBy: currentSession.userId,
          redirectTo: `${appUrl.value}/login`,
        });
        if (result.status === "emailed") {
          redirect("/dashboard/members?ok=Invitacion+enviada+por+correo");
        }
        redirect(
          `/dashboard/members?ok=${encodeURIComponent(result.message)}`,
        );
      } catch (inviteFlowError) {
        if (inviteFlowError instanceof PlanLimitError) {
          redirect(
            `/dashboard/members?error=${encodeURIComponent(inviteFlowError.message)}`,
          );
        }
        redirect(
          `/dashboard/members?error=${encodeURIComponent(
            (inviteFlowError as Error).message,
          )}`,
        );
      }
    }
  }

  return (
    <main className="space-y-6">
      <section className="pmo-hero p-6">
        <h1 className="pmo-title">Miembros del tenant</h1>
        <p className="mt-1 text-sm text-slate-200">
          Gestiona acceso por email para la organizacion activa.
        </p>
        {usage && (
          <p className="mt-3 rounded-md border border-white/20 bg-white/10 px-3 py-2 text-xs text-slate-100">
            Plan <span className="font-semibold uppercase">{usage.plan}</span>:{" "}
            <span className="tabular-nums">
              {usage.seatsUsed}/{usage.limits.maxMemberSeats}
            </span>{" "}
            puestos (miembros + invitaciones pendientes). Proyectos:{" "}
            <span className="tabular-nums">
              {usage.projectCount}/{usage.limits.maxProjects}
            </span>
            .
          </p>
        )}
        {params.error && (
          <p className="mt-3 rounded-md border border-rose-200 bg-rose-50 p-2 text-sm text-rose-700">
            {params.error}
          </p>
        )}
        {params.ok && (
          <p className="mt-3 rounded-md border border-emerald-200 bg-emerald-50 p-2 text-sm text-emerald-700">
            {params.ok}
          </p>
        )}
      </section>

      <section className="pmo-card p-6">
        <h2 className="text-lg font-semibold text-zinc-900">Miembros actuales</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="pmo-table pmo-row-hover w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-zinc-200 text-left text-zinc-500">
                <th>Nombre</th>
                <th>Email</th>
                <th>Rol</th>
              </tr>
            </thead>
            <tbody>
              {members.map((member) => (
                <tr key={member.id}>
                  <td className="font-medium text-zinc-900">{member.user.name ?? "-"}</td>
                  <td>{member.user.email}</td>
                  <td>
                    <span className="pmo-badge pmo-badge--blue">
                      {ROLE_LABELS[member.role.key as RoleKey] ?? member.role.name}
                    </span>
                  </td>
                </tr>
              ))}
              {members.length === 0 && (
                <tr>
                  <td colSpan={3} className="py-8 text-center text-zinc-500">
                    Aun no hay miembros en este tenant.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="pmo-card p-6">
        <h2 className="text-lg font-semibold text-zinc-900">Invitar o actualizar rol</h2>
        <p className="mt-1 text-sm text-zinc-600">
          Si el usuario no existe, se envia invitacion por email y se asigna al aceptar.
        </p>
        {appUrl.needsAttention && (
          <p className="mt-3 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            Configura `NEXT_PUBLIC_APP_URL` con HTTPS y subdominio real antes de produccion.
          </p>
        )}
        {!canManage ? (
          <p className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            Solo Admin del tenant o Administrador pueden invitar y asignar PM /
            Consultante.
          </p>
        ) : (
          <form action={assignRoleAction} className="mt-4 grid gap-3 sm:grid-cols-3">
            <input
              required
              type="email"
              name="email"
              placeholder="usuario@empresa.com"
              className="pmo-input sm:col-span-2"
            />
            <select
              name="role"
              defaultValue="member"
              className="pmo-select"
            >
              {(Object.keys(ROLE_LABELS) as RoleKey[]).map((key) => (
                <option key={key} value={key}>
                  {ROLE_LABELS[key]}
                </option>
              ))}
            </select>
            <button
              type="submit"
              className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 sm:col-span-3"
            >
              Guardar acceso
            </button>
          </form>
        )}
      </section>
    </main>
  );
}
