import Link from "next/link";
import { redirect } from "next/navigation";

import { getSessionUser } from "@/lib/auth/session";
import { getAppUrl } from "@/lib/env";
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
  searchParams: Promise<{ error?: string; ok?: string }>;
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

  const tenants = await listAllTenants();
  const recentInvites = await listRecentInvitationsForPlatform({ take: 50 });
  const appUrl = getAppUrl();

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
      redirect("/admin/invite?error=Datos+invalidos.");
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
        redirect(`/admin/invite?error=${encodeURIComponent(e.message)}`);
      }
      redirect(`/admin/invite?error=${encodeURIComponent((e as Error).message)}`);
    }
    if (result.status === "emailed") {
      redirect("/admin/invite?ok=Invitacion+enviada+por+correo.");
    }
    redirect(`/admin/invite?ok=${encodeURIComponent(result.message)}`);
  }

  const pendingCount = recentInvites.filter((i) => i.status === "pending").length;

  return (
    <div className="space-y-8">
      {params.error && (
        <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900 shadow-sm">
          {params.error}
        </p>
      )}
      {params.ok && (
        <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-950 shadow-sm">
          {params.ok}
        </p>
      )}

      <section className="overflow-hidden rounded-xl border border-[#e8e6e1] bg-gradient-to-br from-[#0f1f5c] to-[#1b2a6b] p-6 text-white shadow-md">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-white/60">
          Plataforma — consultora
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">
          Invitar a organizaciones
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-white/78">
          Envía acceso por correo a un tenant concreto. La invitación queda
          registrada y el usuario entra por{" "}
          <span className="font-medium text-white">/login</span> cuando acepta.
        </p>
        <dl className="mt-6 grid gap-6 sm:grid-cols-3">
          <div>
            <dt className="text-[11px] font-medium uppercase tracking-wide text-white/50">
              Redirección en correo
            </dt>
            <dd className="mt-1 break-all font-mono text-[13px] text-emerald-100/95">
              {appUrl.value}/login
            </dd>
          </div>
          <div>
            <dt className="text-[11px] font-medium uppercase tracking-wide text-white/50">
              Organizaciones
            </dt>
            <dd className="mt-1 text-2xl font-semibold tabular-nums">{tenants.length}</dd>
          </div>
          <div>
            <dt className="text-[11px] font-medium uppercase tracking-wide text-white/50">
              Invitaciones pendientes (vista)
            </dt>
            <dd className="mt-1 text-2xl font-semibold tabular-nums">{pendingCount}</dd>
          </div>
        </dl>
      </section>

      <div className="grid gap-8 lg:grid-cols-5">
        <div className="space-y-6 lg:col-span-2">
          {tenants.length === 0 ? (
            <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-base font-semibold text-slate-900">
                Aún no hay organizaciones
              </h2>
              <p className="mt-2 text-sm text-slate-600">
                Crea un tenant en{" "}
                <Link
                  className="font-medium text-[#0f1f5c] underline decoration-[#0f1f5c]/35 underline-offset-2 hover:decoration-[#0f1f5c]"
                  href="/admin/tenants"
                >
                  Organizaciones
                </Link>{" "}
                para poder invitar miembros.
              </p>
            </section>
          ) : (
            <section className="rounded-xl border border-slate-200/90 bg-white p-6 shadow-sm ring-1 ring-slate-900/[0.04]">
              <h2 className="text-base font-semibold text-slate-900">
                Nueva invitación
              </h2>
              <p className="mt-1 text-[13px] leading-relaxed text-slate-600">
                Si el correo ya tiene cuenta en Auth, la invitación queda pendiente
                y al iniciar sesión se unirá al tenant con el rol indicado.
              </p>
              <form
                action={platformInviteAction}
                className="mt-6 grid gap-4"
              >
                <label className="grid gap-1.5 text-sm">
                  <span className="font-medium text-slate-800">Organización</span>
                  <select
                    name="tenantId"
                    required
                    className="rounded-lg border border-slate-200 bg-slate-50/80 px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-[#1b3a6b]/55 focus:bg-white focus:ring-2 focus:ring-[#0f1f5c]/18"
                    defaultValue=""
                  >
                    <option value="" disabled>
                      Selecciona una organización…
                    </option>
                    {tenants.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name} ({t.slug})
                      </option>
                    ))}
                  </select>
                </label>
                <label className="grid gap-1.5 text-sm">
                  <span className="font-medium text-slate-800">Correo</span>
                  <input
                    name="email"
                    type="email"
                    required
                    placeholder="usuario@empresa.com"
                    className="rounded-lg border border-slate-200 bg-slate-50/80 px-3 py-2.5 text-sm outline-none transition placeholder:text-slate-400 focus:border-[#1b3a6b]/55 focus:bg-white focus:ring-2 focus:ring-[#0f1f5c]/18"
                  />
                </label>
                <label className="grid gap-1.5 text-sm">
                  <span className="font-medium text-slate-800">Rol en el tenant</span>
                  <select
                    name="role"
                    defaultValue="member"
                    className="rounded-lg border border-slate-200 bg-slate-50/80 px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-[#1b3a6b]/55 focus:bg-white focus:ring-2 focus:ring-[#0f1f5c]/18"
                  >
                    {(Object.keys(ROLE_LABELS) as RoleKey[]).map((key) => (
                      <option key={key} value={key}>
                        {ROLE_LABELS[key]}
                      </option>
                    ))}
                  </select>
                </label>
                <button
                  type="submit"
                  className="mt-1 rounded-lg bg-slate-900 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 active:scale-[0.99]"
                >
                  Enviar invitación
                </button>
              </form>
            </section>
          )}
        </div>

        <section className="rounded-xl border border-slate-200/90 bg-white p-0 shadow-sm ring-1 ring-slate-900/[0.04] lg:col-span-3">
          <div className="border-b border-slate-100 px-5 py-4">
            <h2 className="text-base font-semibold text-slate-900">
              Invitaciones recientes
            </h2>
            <p className="mt-0.5 text-[13px] text-slate-500">
              Últimas 50 en todos los clientes (pendientes y aceptadas).
            </p>
          </div>
          <div className="overflow-x-auto">
            {recentInvites.length === 0 ? (
              <p className="px-5 py-10 text-center text-sm text-slate-500">
                Aún no hay invitaciones registradas en la base de datos.
              </p>
            ) : (
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/80 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                    <th className="px-4 py-3">Correo</th>
                    <th className="px-4 py-3">Organización</th>
                    <th className="px-4 py-3">Rol</th>
                    <th className="px-4 py-3">Invitó</th>
                    <th className="px-4 py-3">Estado</th>
                    <th className="px-4 py-3">Enviada</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {recentInvites.map((row) => {
                    const roleLabel =
                      ROLE_LABELS[row.roleKey as RoleKey] ?? row.roleKey;
                    const isAccepted = row.status === "accepted";
                    return (
                      <tr
                        key={row.id}
                        className="transition hover:bg-slate-50/90"
                      >
                        <td className="px-4 py-3 font-medium text-slate-900">
                          {row.email}
                        </td>
                        <td className="px-4 py-3 text-slate-700">
                          <span className="font-medium">{row.tenant.name}</span>
                          <span className="text-slate-400"> · {row.tenant.slug}</span>
                        </td>
                        <td className="px-4 py-3 text-slate-600">{roleLabel}</td>
                        <td className="max-w-[140px] truncate px-4 py-3 text-slate-600" title={row.sender.email}>
                          {row.sender.name?.trim() || row.sender.email}
                        </td>
                        <td className="px-4 py-3">
                          {isAccepted ? (
                            <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-800 ring-1 ring-emerald-600/15">
                              Aceptada
                            </span>
                          ) : (
                            <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700 ring-1 ring-slate-400/25">
                              Pendiente
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-slate-500 tabular-nums">
                          <span className="block">{formatShortDate(row.createdAt)}</span>
                          {isAccepted && row.acceptedAt ? (
                            <span className="mt-0.5 block text-[11px] text-slate-400">
                              Aceptada: {formatShortDate(row.acceptedAt)}
                            </span>
                          ) : null}
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
