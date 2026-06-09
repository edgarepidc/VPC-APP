"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { clearActiveTenantIfMatches, getSessionUser } from "@/lib/auth/session";
import { deleteTenantFromPlatform } from "@/modules/platform";

export async function deleteTenantPlatformAction(formData: FormData) {
  const session = await getSessionUser();
  if (!session?.isSuperAdmin) {
    redirect("/admin?error=Sin+permiso");
  }

  const tenantId = String(formData.get("tenantId") ?? "").trim();
  const confirmSlug = String(formData.get("confirmSlug") ?? "").trim();
  const next = String(formData.get("next") ?? "tenants");

  if (!tenantId) {
    redirect("/admin?error=Datos+invalidos");
  }

  const result = await deleteTenantFromPlatform({ tenantId, confirmSlug });
  if (!result.ok) {
    const base = "/admin";
    redirect(`${base}?error=${encodeURIComponent(result.message)}`);
  }

  await clearActiveTenantIfMatches(tenantId);
  revalidatePath("/admin");
  revalidatePath("/admin/tenants");

  const okMsg = encodeURIComponent("Organización eliminada.");
  if (next === "cartera") {
    redirect(`/admin?ok=${okMsg}`);
  }
  redirect(`/admin?ok=${okMsg}`);
}
