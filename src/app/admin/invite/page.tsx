import Link from "next/link";
import { redirect } from "next/navigation";

import { getSessionUser } from "@/lib/auth/session";
import { getAppUrl } from "@/lib/env";
import { ROLE_LABELS } from "@/lib/role-labels";
import type { RoleKey } from "@/lib/types";
import {
  inviteAuthUserToTenant,
  type InviteAuthResult,
} from "@/modules/invitations/service";
import { PlanLimitError, listAllTenants } from "@/modules/platform";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<{ error?: string; ok?: string }>;
};

export default async function AdminInvitePage({ searchParams }: PageProps) {
  const params = await searchParams;
  const session = await getSessionUser();
  if (!session?.isSuperAdmin) redirect("/dashboard/projects");

  const tenants = await listAllTenants();
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

  return (
    <div className="space-y-8">
      <p className="text-sm text-slate-600">
        Invita a un usuario a una organización (tenant) desde la consultora. Se
        guarda la invitación en base de datos y Supabase envía el correo de
        acceso cuando el proyecto tiene{" "}
        <code className="rounded bg-slate-100 px-1 text-xs">
          SUPABASE_SERVICE_ROLE_KEY
        </code>{" "}
        y la URL de redirección permitida coincide con{" "}
        <code className="rounded bg-slate-100 px-1 text-xs">
          {appUrl.value}/login
        </code>
        .
      </p>

      <p className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">
        Para un producto solo por invitación, en Supabase (Authentication →
        Providers → Email) desactiva el registro público si aún está habilitado.
        Esta pantalla ya no ofrece alta desde el login.
      </p>

      {params.error && (
        <p className="rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
          {params.error}
        </p>
      )}
      {params.ok && (
        <p className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
          {params.ok}
        </p>
      )}

      {tenants.length === 0 ? (
        <p className="rounded-md border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
          No hay organizaciones todavía. Crea un tenant en{" "}
          <Link
            className="font-medium text-amber-900 underline"
            href="/admin/tenants"
          >
            Organizaciones
          </Link>{" "}
          antes de invitar usuarios.
        </p>
      ) : (
        <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">
            Invitar a organización
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Elige el tenant, el correo y el rol. Si el correo ya existe en Auth,
            la invitación queda pendiente y al iniciar sesión se aplicará el
            acceso.
          </p>
          {appUrl.needsAttention && (
            <p className="mt-3 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
              Configura{" "}
              <code className="rounded bg-amber-100 px-1">NEXT_PUBLIC_APP_URL</code>{" "}
              con HTTPS y el dominio real para que los enlaces del correo
              apunten bien.
            </p>
          )}
          <form action={platformInviteAction} className="mt-5 grid gap-3 sm:grid-cols-2">
            <label className="sm:col-span-2 grid gap-1 text-sm">
              <span className="font-medium text-slate-700">Organización</span>
              <select
                name="tenantId"
                required
                className="rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900"
                defaultValue=""
              >
                <option value="" disabled>
                  Selecciona…
                </option>
                {tenants.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({t.slug})
                  </option>
                ))}
              </select>
            </label>
            <label className="sm:col-span-2 grid gap-1 text-sm">
              <span className="font-medium text-slate-700">Correo</span>
              <input
                name="email"
                type="email"
                required
                placeholder="usuario@empresa.com"
                className="rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
            </label>
            <label className="grid gap-1 text-sm sm:col-span-2">
              <span className="font-medium text-slate-700">Rol en el tenant</span>
              <select
                name="role"
                defaultValue="member"
                className="rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900"
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
              className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 sm:col-span-2"
            >
              Enviar invitación
            </button>
          </form>
        </section>
      )}
    </div>
  );
}
