import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  adminCard,
  adminSectionSub,
  uiButtonPrimary,
  uiInput,
  uiLabel,
} from "@/lib/ui-classes";
import { getSessionUser, setActiveTenantAsPlatformOwner } from "@/lib/auth/session";
import { db } from "@/lib/db";
import {
  PLAN_LIMITS,
  createTenantFromPlatform,
  TENANT_PLAN_KEYS,
} from "@/modules/platform";

import { putTenantLogoFromBuffer } from "../tenant-logo-actions";

const PLAN_LABEL: Record<(typeof TENANT_PLAN_KEYS)[number], string> = {
  starter: "Starter",
  pro: "Pro",
  enterprise: "Enterprise",
};

type CreateTenantPanelProps = {
  newTenantId?: string;
  logoWarn?: string | null;
};

export async function CreateTenantPanel({
  newTenantId = "",
  logoWarn = null,
}: CreateTenantPanelProps) {
  const newTenantRow =
    newTenantId.length > 0
      ? await db.tenant.findUnique({
          where: { id: newTenantId },
          select: { id: true, name: true, slug: true },
        })
      : null;

  async function createTenantAction(formData: FormData) {
    "use server";
    const s = await getSessionUser();
    if (!s?.isSuperAdmin) redirect("/admin?error=Sin+permiso");

    const name = String(formData.get("name") ?? "");
    const slug = String(formData.get("slug") ?? "");
    const plan = String(formData.get("plan") ?? "starter");
    const result = await createTenantFromPlatform({ name, slug, plan });
    if (!result.ok) {
      redirect(`/admin?error=${encodeURIComponent(result.message)}`);
    }

    const logo = formData.get("logo");
    if (logo instanceof File && logo.size > 0) {
      const buf = Buffer.from(await logo.arrayBuffer());
      const put = await putTenantLogoFromBuffer(result.tenantId, buf, logo.type);
      if (!put.ok) {
        revalidatePath("/admin");
        redirect(
          `/admin?newTenant=${encodeURIComponent(result.tenantId)}&logoWarn=${encodeURIComponent(put.code)}`,
        );
      }
      revalidatePath("/admin");
      revalidatePath("/dashboard", "layout");
    }

    redirect(`/admin?newTenant=${encodeURIComponent(result.tenantId)}`);
  }

  async function enterNewWorkspaceAction(formData: FormData) {
    "use server";
    const s = await getSessionUser();
    if (!s?.isSuperAdmin) redirect("/admin?error=Sin+permiso");
    const tenantId = String(formData.get("tenantId") ?? "");
    const ok = await setActiveTenantAsPlatformOwner(tenantId);
    if (!ok) redirect("/admin?error=Organizacion+no+encontrada");
    redirect("/dashboard/projects");
  }

  const logoWarnMessage = (() => {
    if (!logoWarn) return null;
    const map: Record<string, string> = {
      tamano_logo: "la imagen supera 2 MB.",
      tipo_logo: "formato no permitido (PNG, JPEG o WebP).",
      storage_logo: "no se pudo guardar en almacenamiento.",
    };
    return map[logoWarn] ?? logoWarn;
  })();

  return (
    <details className={`${adminCard} group`} open={!!newTenantRow}>
      <summary className="cursor-pointer list-none px-4 py-3 text-sm font-semibold text-slate-900 marker:content-none [&::-webkit-details-marker]:hidden">
        Nueva organización
        <span className="ml-2 font-normal text-slate-500 group-open:hidden">
          — crear cliente
        </span>
      </summary>

      <div className="border-t border-slate-200 px-4 py-4">
        {newTenantRow ? (
          <div className="mb-4 rounded-lg border border-slate-200 bg-slate-50 px-3 py-3 text-sm">
            <p className="font-medium text-slate-900">
              Creada: {newTenantRow.name}{" "}
              <span className="text-slate-500">({newTenantRow.slug})</span>
            </p>
            {logoWarnMessage ? (
              <p className="mt-2 text-amber-800">
                Logo no subido: {logoWarnMessage} Podés intentarlo en la tabla.
              </p>
            ) : null}
            <div className="mt-3 flex flex-wrap gap-2">
              <form action={enterNewWorkspaceAction}>
                <input type="hidden" name="tenantId" value={newTenantRow.id} />
                <button type="submit" className={uiButtonPrimary.replace("w-full ", "")}>
                  Entrar al workspace
                </button>
              </form>
              <Link
                href="/admin"
                className="inline-flex items-center rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50"
              >
                Cerrar aviso
              </Link>
            </div>
          </div>
        ) : null}

        <form
          action={createTenantAction}
          encType="multipart/form-data"
          className="grid gap-3 sm:grid-cols-2"
        >
          <div className="sm:col-span-2">
            <label className={uiLabel}>Logo (opcional)</label>
            <input
              type="file"
              name="logo"
              accept="image/png,image/jpeg,image/webp"
              className="mt-1 block w-full text-sm text-slate-700 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-800 file:px-3 file:py-2 file:text-sm file:font-medium file:text-white"
            />
          </div>
          <div>
            <label className={uiLabel}>Nombre</label>
            <input name="name" required className={`mt-1 ${uiInput}`} placeholder="Mobility ADO" />
          </div>
          <div>
            <label className={uiLabel}>Slug</label>
            <input
              name="slug"
              required
              pattern="[a-z0-9]+(-[a-z0-9]+)*"
              className={`mt-1 ${uiInput}`}
              placeholder="mobility-ado"
            />
          </div>
          <div>
            <label className={uiLabel}>Plan</label>
            <select
              name="plan"
              defaultValue="starter"
              className={`mt-1 ${uiInput} max-w-xs`}
            >
              {TENANT_PLAN_KEYS.map((key) => (
                <option key={key} value={key}>
                  {PLAN_LABEL[key]} — {PLAN_LIMITS[key].maxProjects} proy. /{" "}
                  {PLAN_LIMITS[key].maxMemberSeats} puestos
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-end sm:col-span-2">
            <button type="submit" className={uiButtonPrimary.replace("w-full ", "w-auto ")}>
              Crear organización
            </button>
          </div>
        </form>
        <p className={`mt-3 ${adminSectionSub}`}>
          Los usuarios entran por invitación desde la sección Accesos o el enlace Invitar en cada fila.
        </p>
      </div>
    </details>
  );
}
