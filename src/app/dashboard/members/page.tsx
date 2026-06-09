import { redirect } from "next/navigation";

import { DashboardPageHeader } from "@/app/dashboard/_components/page-header";
import {
  dashAlertError,
  dashAlertOk,
  dashAlertWarn,
  dashCard,
  dashPage,
  uiButtonPrimary,
  uiInput,
  uiLabel,
} from "@/lib/ui-classes";
import { getSessionUser } from "@/lib/auth/session";
import { getAppUrl } from "@/lib/env";
import { ROLE_LABELS } from "@/lib/role-labels";
import { canManageMembers } from "@/lib/rbac";
import type { RoleKey } from "@/lib/types";
import { requireTenantId } from "@/lib/tenancy";
import {
  inviteAuthUserToTenant,
  type InviteAuthResult,
} from "@/modules/invitations/service";
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

      let result: InviteAuthResult;
      try {
        result = await inviteAuthUserToTenant({
          tenantId: currentSession.activeTenantId,
          email,
          roleKey,
          invitedBy: currentSession.userId,
          redirectTo: `${appUrl.value}/login`,
        });
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
      if (result.status === "emailed") {
        redirect("/dashboard/members?ok=Invitacion+enviada+por+correo");
      }
      redirect(
        `/dashboard/members?ok=${encodeURIComponent(result.message)}`,
      );
    }

    redirect("/dashboard/members?ok=Miembro+actualizado+directamente");
  }

  return (
    <main className={dashPage}>
      <DashboardPageHeader
        title="Miembros"
        description="Equipo con acceso a este workspace."
      >
        {usage ? (
          <p className="mt-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
            Plan <span className="font-semibold uppercase">{usage.plan}</span>:{" "}
            {usage.seatsUsed}/{usage.limits.maxMemberSeats} puestos ·{" "}
            {usage.projectCount}/{usage.limits.maxProjects} proyectos
          </p>
        ) : null}
        {params.error && <p className={`mt-2 ${dashAlertError}`}>{params.error}</p>}
        {params.ok && <p className={`mt-2 ${dashAlertOk}`}>{params.ok}</p>}
      </DashboardPageHeader>

      <section className={`${dashCard} p-4`}>
        <h2 className="text-base font-semibold text-slate-900">Listado</h2>
        <div className="mt-3 overflow-x-auto">
          <table className="pmo-table pmo-row-hover w-full min-w-[520px] text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs font-medium uppercase text-slate-500">
                <th className="py-2">Nombre</th>
                <th className="py-2">Email</th>
                <th className="py-2">Rol</th>
              </tr>
            </thead>
            <tbody>
              {members.map((member) => (
                <tr key={member.id} className="border-b border-slate-100">
                  <td className="py-2 font-medium text-slate-900">
                    {member.user.name ?? "—"}
                  </td>
                  <td className="py-2 text-slate-700">{member.user.email}</td>
                  <td className="py-2">
                    <span className="pmo-badge pmo-badge--blue">
                      {ROLE_LABELS[member.role.key as RoleKey] ?? member.role.name}
                    </span>
                  </td>
                </tr>
              ))}
              {members.length === 0 && (
                <tr>
                  <td colSpan={3} className="py-6 text-center text-slate-500">
                    Sin miembros en este workspace.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {canManage ? (
        <section className={`${dashCard} p-4`}>
          <h2 className="text-base font-semibold text-slate-900">Invitar o cambiar rol</h2>
          <p className="mt-1 text-sm text-slate-600">
            Si el correo no existe, se envía invitación por email.
          </p>
          {appUrl.isSupabaseProjectHost && (
            <p className={`mt-3 ${dashAlertError}`}>
              Configura <code className="text-xs">NEXT_PUBLIC_APP_URL</code> con la URL pública de la app.
            </p>
          )}
          <form action={assignRoleAction} className="mt-4 grid max-w-md gap-3">
            <div>
              <label className={uiLabel}>Correo</label>
              <input name="email" type="email" required className={`mt-1 ${uiInput}`} />
            </div>
            <div>
              <label className={uiLabel}>Rol</label>
              <select name="role" defaultValue="member" className={`mt-1 ${uiInput}`}>
                {(Object.keys(ROLE_LABELS) as RoleKey[]).map((key) => (
                  <option key={key} value={key}>
                    {ROLE_LABELS[key]}
                  </option>
                ))}
              </select>
            </div>
            <button type="submit" className={uiButtonPrimary.replace("w-full ", "w-auto ")}>
              Guardar / invitar
            </button>
          </form>
        </section>
      ) : (
        <p className={dashAlertWarn}>
          Tu rol solo permite ver miembros. Necesitas rol de administrador para invitar.
        </p>
      )}
    </main>
  );
}
