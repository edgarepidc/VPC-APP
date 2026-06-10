import Link from "next/link";
import { redirect } from "next/navigation";

import { DashboardPageHeader } from "@/app/dashboard/_components/page-header";
import { DASHBOARD_SETTINGS, PMO_PROJECTS } from "@/lib/dashboard-paths";
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
import { listProjectsByTenant } from "@/modules/projects/service";
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
  parseManagerProjectScopeFromForm,
} from "@/modules/memberships/project-access";
import {
  assignRoleByEmail,
  listMembersByTenant,
  updateMemberProjectAccess,
} from "@/modules/memberships/service";

import { ManagerProjectScopeFields } from "./manager-project-scope-fields";
import { TeamMemberList } from "./team-member-list";

type MembersPageProps = {
  searchParams: Promise<{ error?: string; ok?: string }>;
};

export default async function MembersPage({ searchParams }: MembersPageProps) {
  const params = await searchParams;
  const session = await getSessionUser();
  if (!session) redirect("/login");
  if (!session.activeTenantId) redirect("/select-tenant");

  const tenantId = await requireTenantId();
  const [members, usage, allOrgProjects] = await Promise.all([
    listMembersByTenant(tenantId),
    getTenantUsageSnapshot(tenantId),
    listProjectsByTenant(tenantId, { initiativesOnly: true }),
  ]);
  const canManage = canManageMembers(session.role);
  const appUrl = getAppUrl();

  async function assignRoleAction(formData: FormData) {
    "use server";
    const currentSession = await getSessionUser();
    if (!currentSession?.activeTenantId || !canManageMembers(currentSession.role)) {
      redirect("/dashboard/pmo/team?error=No+tienes+permiso+para+gestionar+miembros");
    }

    const email = String(formData.get("email") ?? "");
    const roleKey = String(formData.get("role")) as RoleKey;
    const validRoles: RoleKey[] = ["admin", "manager", "member"];
    const managerScope = parseManagerProjectScopeFromForm(formData);

    if (!email || !validRoles.includes(roleKey)) {
      redirect("/dashboard/pmo/team?error=Datos+de+entrada+invalidos");
    }

    try {
      await assignRoleByEmail({
        tenantId: currentSession.activeTenantId,
        email,
        roleKey,
        managerScope,
      });
    } catch (error) {
      if (error instanceof PlanLimitError) {
        redirect(
          `/dashboard/pmo/team?error=${encodeURIComponent(error.message)}`,
        );
      }
      if ((error as Error).message !== "Usuario no encontrado. Debe registrarse primero.") {
        redirect(
          `/dashboard/pmo/team?error=${encodeURIComponent((error as Error).message)}`,
        );
      }

      let result: InviteAuthResult;
      try {
        result = await inviteAuthUserToTenant({
          tenantId: currentSession.activeTenantId,
          email,
          roleKey,
          invitedBy: currentSession.userId,
          managerScope,
          redirectTo: `${getAppUrl().value}/login`,
        });
      } catch (inviteFlowError) {
        if (inviteFlowError instanceof PlanLimitError) {
          redirect(
            `/dashboard/pmo/team?error=${encodeURIComponent(inviteFlowError.message)}`,
          );
        }
        redirect(
          `/dashboard/pmo/team?error=${encodeURIComponent(
            (inviteFlowError as Error).message,
          )}`,
        );
      }
      if (result.status === "emailed") {
        redirect("/dashboard/pmo/team?ok=Invitacion+enviada+por+correo");
      }
      redirect(
        `/dashboard/pmo/team?ok=${encodeURIComponent(result.message)}`,
      );
    }

    redirect("/dashboard/pmo/team?ok=Miembro+actualizado+directamente");
  }

  async function updateManagerScopeAction(formData: FormData) {
    "use server";
    const currentSession = await getSessionUser();
    if (!currentSession?.activeTenantId || !canManageMembers(currentSession.role)) {
      redirect("/dashboard/pmo/team?error=No+tienes+permiso+para+gestionar+miembros");
    }

    const membershipId = String(formData.get("membershipId") ?? "").trim();
    const roleKey = String(formData.get("role")) as RoleKey;
    const managerScope = parseManagerProjectScopeFromForm(formData);

    if (!membershipId || roleKey !== "manager") {
      redirect("/dashboard/pmo/team?error=Datos+invalidos");
    }

    try {
      await updateMemberProjectAccess({
        tenantId: currentSession.activeTenantId,
        membershipId,
        roleKey,
        managerScope,
      });
      redirect("/dashboard/pmo/team?ok=Proyectos+del+PM+actualizados");
    } catch (e) {
      redirect(
        `/dashboard/pmo/team?error=${encodeURIComponent((e as Error).message)}`,
      );
    }
  }

  return (
    <main className={dashPage}>
      <DashboardPageHeader
        title="Equipo"
        description="Personas con acceso a este workspace."
      >
        <div className="mt-2 flex flex-wrap gap-3 text-sm">
          <Link href={PMO_PROJECTS} className="font-medium text-slate-700 underline">
            Ver proyectos
          </Link>
          <Link href={DASHBOARD_SETTINGS} className="font-medium text-slate-700 underline">
            Mi perfil
          </Link>
        </div>
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

      <section className={`${dashCard} p-4 sm:p-5`}>
        <h2 className="text-base font-semibold text-slate-900">Equipo</h2>
        <p className="mt-1 text-sm text-slate-600">
          {members.length} miembro{members.length !== 1 ? "s" : ""} en este workspace.
        </p>
        <TeamMemberList
          members={members}
          canManage={canManage}
          allOrgProjects={allOrgProjects.map((p) => ({ id: p.id, name: p.name }))}
          updateManagerScopeAction={updateManagerScopeAction}
        />
      </section>

      {canManage ? (
        <section className={`${dashCard} p-4`}>
          <h2 className="text-base font-semibold text-slate-900">Invitar o cambiar rol</h2>
          <p className="mt-1 text-sm text-slate-600">
            Si el correo no existe, se envía invitación por email. Para PM, asigna los proyectos
            visibles.
          </p>
          {appUrl.isSupabaseProjectHost && (
            <p className={`mt-3 ${dashAlertError}`}>
              Configura <code className="text-xs">NEXT_PUBLIC_APP_URL</code> con la URL pública de la app.
            </p>
          )}
          <form action={assignRoleAction} className="mt-4 grid max-w-lg gap-3">
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
            <ManagerProjectScopeFields
              projects={allOrgProjects.map((p) => ({ id: p.id, name: p.name }))}
            />
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
