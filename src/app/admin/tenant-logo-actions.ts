"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getSessionUser } from "@/lib/auth/session";
import { ensurePublicImageBucket } from "@/lib/supabase/ensure-image-bucket";
import { db } from "@/lib/db";
import { createAdminClient } from "@/utils/supabase/admin";

const BUCKET = "tenant-logos";
const MAX_BYTES = 2 * 1024 * 1024;
const ALLOWED = new Set(["image/png", "image/jpeg", "image/webp"]);

function extFromMime(mime: string): string {
  if (mime === "image/png") return "png";
  if (mime === "image/jpeg") return "jpg";
  if (mime === "image/webp") return "webp";
  return "bin";
}

/** Sube bytes a Storage y actualiza `Tenant.logoUrl`. El caller valida permisos. */
export async function putTenantLogoFromBuffer(
  tenantId: string,
  buf: Buffer,
  mime: string,
): Promise<{ ok: true } | { ok: false; code: string }> {
  if (!ALLOWED.has(mime)) return { ok: false, code: "tipo_logo" };
  if (buf.length > MAX_BYTES) return { ok: false, code: "tamano_logo" };

  const path = `${tenantId}/logo.${extFromMime(mime)}`;

  try {
    const admin = createAdminClient();
    const bucket = await ensurePublicImageBucket(admin, BUCKET, {
      fileSizeLimit: MAX_BYTES,
    });
    if (!bucket.ok) {
      console.error("[putTenantLogoFromBuffer] bucket:", bucket.message);
      return { ok: false, code: "storage_logo" };
    }

    const { error: upErr } = await admin.storage.from(BUCKET).upload(path, buf, {
      contentType: mime,
      upsert: true,
    });
    if (upErr) {
      console.error("[putTenantLogoFromBuffer]", upErr);
      return { ok: false, code: "storage_logo" };
    }
    const { data: pub } = admin.storage.from(BUCKET).getPublicUrl(path);
    await db.tenant.update({
      where: { id: tenantId },
      data: { logoUrl: pub.publicUrl },
    });
    return { ok: true };
  } catch (e) {
    console.error("[putTenantLogoFromBuffer]", e);
    return { ok: false, code: "storage_logo" };
  }
}

export async function platformUploadTenantLogoAction(formData: FormData) {
  const session = await getSessionUser();
  if (!session?.isSuperAdmin) {
    redirect("/admin?error=sin_permiso_logo");
  }

  const tenantId = String(formData.get("tenantId") ?? "").trim();
  if (!tenantId) redirect("/admin?error=tenant_logo");

  const exists = await db.tenant.findUnique({
    where: { id: tenantId },
    select: { id: true },
  });
  if (!exists) redirect("/admin?error=tenant_no_encontrado");

  const file = formData.get("logo");
  if (!(file instanceof File) || file.size === 0) {
    redirect("/admin?error=archivo_logo");
  }

  const buf = Buffer.from(await file.arrayBuffer());
  const put = await putTenantLogoFromBuffer(tenantId, buf, file.type);
  if (!put.ok) {
    redirect(`/admin?error=${put.code}`);
  }

  revalidatePath("/admin");
  revalidatePath("/admin/tenants");
  revalidatePath("/dashboard", "layout");
  redirect("/admin?ok=logo_subido");
}

export async function platformClearTenantLogoAction(formData: FormData) {
  const session = await getSessionUser();
  if (!session?.isSuperAdmin) {
    redirect("/admin?error=sin_permiso_logo");
  }

  const tenantId = String(formData.get("tenantId") ?? "").trim();
  if (!tenantId) redirect("/admin?error=tenant_logo");

  const tenant = await db.tenant.findUnique({
    where: { id: tenantId },
    select: { logoUrl: true },
  });
  const prev = tenant?.logoUrl;
  if (prev?.includes(BUCKET)) {
    try {
      const admin = createAdminClient();
      const u = new URL(prev);
      const prefix = `/storage/v1/object/public/${BUCKET}/`;
      const p = u.pathname.indexOf(prefix);
      if (p !== -1) {
        const objectPath = decodeURIComponent(u.pathname.slice(p + prefix.length));
        await admin.storage.from(BUCKET).remove([objectPath]);
      }
    } catch {
      /* ignore */
    }
  }

  await db.tenant.update({
    where: { id: tenantId },
    data: { logoUrl: null },
  });

  revalidatePath("/admin");
  revalidatePath("/admin/tenants");
  revalidatePath("/dashboard", "layout");
  redirect("/admin?ok=logo_quitado");
}
