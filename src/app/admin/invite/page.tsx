import Link from "next/link";
import { redirect } from "next/navigation";

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

import {
  IconMail,
  InvitationStatusDonut,
  KpiCard,
  VpcAdminGradientShell,
  VpcAdminInsetShell,
} from "../_components/vpc-visuals";

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

  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);

  const [tenants, recentInvites, pendingTotal, acceptedTotal, acceptedWeek] =
    await Promise.all([
      listAllTenants(),
      listRecentInvitationsForPlatform({ take: 50 }),
      db.invitation.count({ where: { status: "pending" } }),
      db.invitation.count({ where: { status: "accepted" } }),
      db.invitation.count({
        where: {
          status: "accepted",
          acceptedAt: { gte: weekAgo },
        },
      }),
    ]);

  const appUrl = getAppUrl();

  const inviteSum = pendingTotal + acceptedTotal;
  const acceptancePct =
    inviteSum === 0 ? 0 : Math.round((acceptedTotal / inviteSum) * 100);

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
        `/admin/invite?tenantId=${encodeURIComponent(tenantId)}&ok=Invitacion+enviada+por+correo.`,
      );
    }
    redirect(
      `/admin/invite?tenantId=${encodeURIComponent(tenantId)}&ok=${encodeURIComponent(result.message)}`,
    );
  }

  return (
    <div className="space-y-8">
      {params.error && (
        <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900 shadow-sm">
          {params.error}
        </p>
      )}
      {params.ok && (
        <p className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-[#2a2412] shadow-sm ring-1 ring-slate-200">
          {params.ok}
        </p>
      )}

      {appUrl.isSupabaseProjectHost && (
        <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900 shadow-sm">
          <strong className="font-semibold">Configuración incorrecta:</strong>{" "}
          <code className="rounded bg-rose-100/80 px-1">NEXT_PUBLIC_APP_URL</code> apunta a{" "}
          <code className="rounded bg-rose-100/80 px-1">*.supabase.co</code>. Debe ser la URL
          pública de esta aplicación (p. ej. tu dominio en Vercel); si no, Supabase Auth devuelve
          errores como «requested path is invalid» al invitar.
        </p>
      )}

      <VpcAdminGradientShell className="p-6">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-white/60">
          Value Project Consulting
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">
          Invitar a organizaciones
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-white/78">
          Envía acceso por correo a un tenant concreto. La invitación queda
          registrada y el usuario entra por{" "}
          <span className="font-medium text-white">/login</span> cuando acepta.
          Con más de un cliente en cartera, abre el formulario desde{" "}
          <span className="font-medium text-white">Cartera → Invitar</span> en la fila del
          cliente.
        </p>
        <dl className="mt-6 grid gap-6 sm:grid-cols-3">
          <div>
            <dt className="text-[11px] font-medium uppercase tracking-wide text-white/50">
              Redirección en correo
            </dt>
            <dd className="mt-1 break-all font-mono text-[13px] text-[#f0e0c4]">
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
              Pendientes (global)
            </dt>
            <dd className="mt-1 text-2xl font-semibold tabular-nums">{pendingTotal}</dd>
          </div>
        </dl>
      </VpcAdminGradientShell>

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <InvitationStatusDonut pending={pendingTotal} accepted={acceptedTotal} />
        </div>
        <div className="flex flex-col gap-4 lg:col-span-2">
          <KpiCard
            label="Aceptadas (7 días)"
            value={acceptedWeek}
            hint="Invitaciones completadas recientemente."
            icon={<IconMail />}
            accent="tan"
          />
          <KpiCard
            label="Tasa de cierre"
            value={`${acceptancePct}%`}
            hint="Aceptadas sobre el total histórico en base de datos."
            icon={<IconMail />}
            accent="steel"
          />
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-5">
        <div className="space-y-6 lg:col-span-2">
          {tenants.length === 0 ? (
            <VpcAdminInsetShell innerClassName="p-6">
              <h2 className="text-base font-semibold text-slate-900">
                Aún no hay organizaciones
              </h2>
              <p className="mt-2 text-sm text-slate-600">
                Crea un tenant en{" "}
                <Link
                  className="font-semibold text-slate-900 underline decoration-slate-400 underline-offset-2 hover:decoration-slate-600"
                  href="/admin/tenants"
                >
                  Organizaciones
                </Link>{" "}
                para poder invitar miembros.
              </p>
            </VpcAdminInsetShell>
          ) : !inviteTarget ? (
            <VpcAdminInsetShell innerClassName="p-6">
              <h2 className="text-base font-semibold text-slate-900">
                Elegir organización
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                Para enviar una invitación, abre primero la{" "}
                <Link
                  href="/admin"
                  className="font-semibold text-slate-900 underline decoration-slate-400 underline-offset-2 hover:decoration-slate-600"
                >
                  Cartera de clientes
                </Link>{" "}
                y pulsa <strong className="text-slate-900">Invitar</strong> en la fila del cliente.
                También puedes usar{" "}
                <Link
                  href="/admin/tenants"
                  className="font-semibold text-slate-900 underline decoration-slate-400 underline-offset-2 hover:decoration-slate-600"
                >
                  Organizaciones
                </Link>
                .
              </p>
              <p className="mt-3 text-[13px] leading-relaxed text-slate-600">
                Tienes <strong className="text-slate-900">{tenants.length}</strong> organizaciones:
                en la cartera, cada fila incluye el enlace <strong>Invitar</strong> para abrir este
                formulario ya con ese cliente.
              </p>
            </VpcAdminInsetShell>
          ) : (
            <VpcAdminInsetShell innerClassName="p-6">
              <h2 className="text-base font-semibold text-slate-900">
                Nueva invitación
              </h2>
              <p className="mt-1 text-[13px] leading-relaxed text-slate-600">
                Si el correo ya tiene cuenta en Auth, la invitación queda pendiente
                y al iniciar sesión se unirá al tenant con el rol indicado.
              </p>
              <p className="mt-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-[13px] text-slate-700">
                <span className="font-medium text-slate-600">Cliente:</span>{" "}
                <span className="font-semibold text-slate-900">{inviteTarget.name}</span>{" "}
                <span className="text-slate-400">({inviteTarget.slug})</span>
              </p>
              <form
                action={platformInviteAction}
                className="mt-6 grid gap-4"
              >
                <input type="hidden" name="tenantId" value={inviteTarget.id} />
                <label className="grid gap-1.5 text-sm">
                  <span className="font-medium text-slate-900">Correo</span>
                  <input
                    name="email"
                    type="email"
                    required
                    placeholder="usuario@empresa.com"
                    className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
                  />
                </label>
                <label className="grid gap-1.5 text-sm">
                  <span className="font-medium text-slate-900">Rol en el tenant</span>
                  <select
                    name="role"
                    defaultValue="member"
                    className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
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
                  className="mt-1 rounded-lg bg-slate-800 px-4 py-3 text-sm font-semibold text-white shadow-sm ring-1 ring-slate-200 transition hover:bg-slate-700 active:scale-[0.99]"
                >
                  Enviar invitación
                </button>
              </form>
            </VpcAdminInsetShell>
          )}
        </div>

        <section className="flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm ring-1 ring-slate-200 lg:col-span-3">
          <div className="border-b border-slate-200 bg-white px-5 py-4">
            <h2 className="text-base font-semibold text-slate-900">
              Invitaciones recientes
            </h2>
            <p className="mt-0.5 text-[13px] text-slate-600">
              Últimas 50 en todos los clientes (pendientes y aceptadas).
            </p>
          </div>
          <div className="min-h-0 flex-1 overflow-x-auto bg-white">
            {recentInvites.length === 0 ? (
              <p className="px-5 py-10 text-center text-sm text-slate-500">
                Aún no hay invitaciones registradas en la base de datos.
              </p>
            ) : (
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/90 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                    <th className="px-4 py-3">Correo</th>
                    <th className="px-4 py-3">Organización</th>
                    <th className="px-4 py-3">Rol</th>
                    <th className="px-4 py-3">Invitó</th>
                    <th className="px-4 py-3">Estado</th>
                    <th className="px-4 py-3">Enviada</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f0ebe0]">
                  {recentInvites.map((row) => {
                    const roleLabel =
                      ROLE_LABELS[row.roleKey as RoleKey] ?? row.roleKey;
                    const isAccepted = row.status === "accepted";
                    return (
                      <tr
                        key={row.id}
                        className="transition hover:bg-slate-50"
                      >
                        <td className="px-4 py-3 font-medium text-slate-900">
                          {row.email}
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          <span className="font-medium text-slate-900">{row.tenant.name}</span>
                          <span className="text-slate-400"> · {row.tenant.slug}</span>
                        </td>
                        <td className="px-4 py-3 text-slate-600">{roleLabel}</td>
                        <td className="max-w-[140px] truncate px-4 py-3 text-slate-600" title={row.sender.email}>
                          {row.sender.name?.trim() || row.sender.email}
                        </td>
                        <td className="px-4 py-3">
                          {isAccepted ? (
                            <span className="inline-flex items-center rounded-full border border-slate-300 bg-slate-50 px-2.5 py-0.5 text-xs font-medium text-slate-700 ring-1 ring-slate-200">
                              Aceptada
                            </span>
                          ) : (
                            <span className="inline-flex items-center rounded-full border border-slate-200 bg-white px-2.5 py-0.5 text-xs font-medium text-slate-600 ring-1 ring-slate-200">
                              Pendiente
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-slate-600 tabular-nums">
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
