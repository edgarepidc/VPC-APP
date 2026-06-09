import Link from "next/link";
import { redirect } from "next/navigation";

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
import { getAppUrl } from "@/lib/env";
import { db } from "@/lib/db";
import { ROLE_LABELS } from "@/lib/role-labels";
import type { RoleKey } from "@/lib/types";
import {
  inviteAuthUserToTenant,
  listRecentInvitationsForPlatform,
  type InviteAuthResult,
} from "@/modules/invitations/service";
import { PlanLimitError, listAllTenants } from "@/modules/platform";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<{ error?: string; ok?: string; tenantId?: string }>;
};

function formatShortDate(d: Date) {
  return new Intl.DateTimeFormat("es-MX", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(d);
}

export default async function AdminInvitePage({ searchParams }: PageProps) {
  const params = await searchParams;
  const session = await getSessionUser();
  if (!session?.isSuperAdmin) redirect("/dashboard/projects");

  const [tenants, recentInvites, pendingTotal, acceptedTotal] = await Promise.all([
    listAllTenants(),
    listRecentInvitationsForPlatform({ take: 30 }),
    db.invitation.count({ where: { status: "pending" } }),
    db.invitation.count({ where: { status: "accepted" } }),
  ]);

  const appUrl = getAppUrl();
  const rawParamTenant = params.tenantId?.trim() ?? "";
  const inviteTarget =
    (rawParamTenant ? tenants.find((t) => t.id === rawParamTenant) : undefined) ??
    (tenants.length === 1 ? tenants[0] : undefined);

  async function platformInviteAction(formData: FormData) {
    "use server";
    const s = await getSessionUser();
    if (!s?.isSuperAdmin) {
      redirect("/admin/invite?error=No+tienes+permiso+de+plataforma.");
    }
    const tenantId = String(formData.get("tenantId") ?? "").trim();
    const email = String(formData.get("email") ?? "").trim();
    const roleKey = String(formData.get("role")) as RoleKey;
    const validRoles: RoleKey[] = ["owner", "admin", "manager", "member"];
    if (!tenantId || !email || !validRoles.includes(roleKey)) {
      const q = tenantId
        ? `?tenantId=${encodeURIComponent(tenantId)}&error=Datos+invalidos.`
        : "?error=Datos+invalidos.";
      redirect(`/admin/invite${q}`);
    }

    let result: InviteAuthResult;
    try {
      result = await inviteAuthUserToTenant({
        tenantId,
        email,
        roleKey,
        invitedBy: s.userId,
        redirectTo: `${getAppUrl().value}/login`,
      });
    } catch (e) {
      if (e instanceof PlanLimitError) {
        redirect(
          `/admin/invite?tenantId=${encodeURIComponent(tenantId)}&error=${encodeURIComponent(e.message)}`,
        );
      }
      redirect(
        `/admin/invite?tenantId=${encodeURIComponent(tenantId)}&error=${encodeURIComponent((e as Error).message)}`,
      );
    }
    if (result.status === "emailed") {
      redirect(
        `/admin/invite?tenantId=${encodeURIComponent(tenantId)}&ok=Invitacion+enviada.`,
      );
    }
    redirect(
      `/admin/invite?tenantId=${encodeURIComponent(tenantId)}&ok=${encodeURIComponent(result.message)}`,
    );
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

      {appUrl.isSupabaseProjectHost && (
        <p className={adminAlertError}>
          <code className="rounded bg-rose-100 px-1">NEXT_PUBLIC_APP_URL</code> apunta a
          Supabase. Debe ser la URL de la app (p. ej. app.vpc.services).
        </p>
      )}

      <div className="flex flex-wrap gap-6 rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm">
        <div>
          <p className="text-xs text-slate-500">Pendientes</p>
          <p className="text-lg font-semibold tabular-nums text-slate-900">{pendingTotal}</p>
        </div>
        <div>
          <p className="text-xs text-slate-500">Aceptadas</p>
          <p className="text-lg font-semibold tabular-nums text-slate-900">{acceptedTotal}</p>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-5">
        <section className={`${adminCard} p-4 lg:col-span-2`}>
          <h2 className={adminSectionTitle}>Nueva invitación</h2>
          <p className={adminSectionSub}>
            El usuario recibe correo y entra por{" "}
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
            <form action={platformInviteAction} className="mt-4 space-y-3">
              <div>
                <label className={uiLabel}>Organización</label>
                <select
                  name="tenantId"
                  required
                  defaultValue={inviteTarget?.id ?? ""}
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
                <label className={uiLabel}>Rol</label>
                <select name="role" defaultValue="member" className={`mt-1 ${uiInput}`}>
                  {(Object.keys(ROLE_LABELS) as RoleKey[]).map((key) => (
                    <option key={key} value={key}>
                      {ROLE_LABELS[key]}
                    </option>
                  ))}
                </select>
              </div>
              <button type="submit" className={uiButtonPrimary}>
                Enviar invitación
              </button>
            </form>
          )}
        </section>

        <section className={`${adminCard} overflow-hidden lg:col-span-3`}>
          <div className="border-b border-slate-200 px-4 py-3">
            <h2 className={adminSectionTitle}>Invitaciones recientes</h2>
            <p className={adminSectionSub}>Últimas 30 en todos los clientes.</p>
          </div>
          <div className="overflow-x-auto">
            {recentInvites.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-slate-500">
                Sin invitaciones registradas.
              </p>
            ) : (
              <table className={adminTable}>
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50">
                    <th className={adminTh}>Correo</th>
                    <th className={adminTh}>Cliente</th>
                    <th className={adminTh}>Rol</th>
                    <th className={adminTh}>Estado</th>
                    <th className={adminTh}>Fecha</th>
                  </tr>
                </thead>
                <tbody>
                  {recentInvites.map((row) => {
                    const roleLabel =
                      ROLE_LABELS[row.roleKey as RoleKey] ?? row.roleKey;
                    const isAccepted = row.status === "accepted";
                    return (
                      <tr key={row.id} className="border-b border-slate-100 hover:bg-slate-50">
                        <td className={`${adminTd} font-medium text-slate-900`}>
                          {row.email}
                        </td>
                        <td className={adminTd}>
                          {row.tenant.name}
                          <span className="text-slate-400"> · {row.tenant.slug}</span>
                        </td>
                        <td className={adminTd}>{roleLabel}</td>
                        <td className={adminTd}>
                          <span
                            className={
                              isAccepted
                                ? "rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700"
                                : "rounded-full border border-slate-200 px-2 py-0.5 text-xs font-medium text-slate-600"
                            }
                          >
                            {isAccepted ? "Aceptada" : "Pendiente"}
                          </span>
                        </td>
                        <td className={`${adminTd} tabular-nums text-slate-600`}>
                          {formatShortDate(row.createdAt)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
