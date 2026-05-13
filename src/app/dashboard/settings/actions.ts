"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getSessionUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { canManageMembers } from "@/lib/rbac";
import { requireTenantId } from "@/lib/tenancy";
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

export async function uploadTenantLogoAction(formData: FormData) {
  const session = await getSessionUser();
  if (!session?.activeTenantId) redirect("/login");
  if (!canManageMembers(session.role)) {
    redirect("/dashboard/settings?error=sin_permiso");
  }

  const tenantId = await requireTenantId();

  const file = formData.get("logo");
  if (!(file instanceof File) || file.size === 0) {
    redirect("/dashboard/settings?error=archivo");
  }
  if (file.size > MAX_BYTES) {
    redirect("/dashboard/settings?error=tamano");
  }
  if (!ALLOWED.has(file.type)) {
    redirect("/dashboard/settings?error=tipo");
  }

  const path = `${tenantId}/logo.${extFromMime(file.type)}`;
  const buf = Buffer.from(await file.arrayBuffer());

  try {
    const admin = createAdminClient();
    const { error: upErr } = await admin.storage.from(BUCKET).upload(path, buf, {
      contentType: file.type,
      upsert: true,
    });
    if (upErr) {
      console.error("[uploadTenantLogo]", upErr);
      redirect("/dashboard/settings?error=storage");
    }
    const { data: pub } = admin.storage.from(BUCKET).getPublicUrl(path);
    const publicUrl = pub.publicUrl;

    await db.tenant.update({
      where: { id: tenantId },
      data: { logoUrl: publicUrl },
    });
  } catch (e) {
    console.error("[uploadTenantLogo]", e);
    redirect("/dashboard/settings?error=storage");
  }

  revalidatePath("/dashboard", "layout");
  revalidatePath("/dashboard/settings");
  redirect("/dashboard/settings?ok=1");
}

export async function clearTenantLogoAction() {
  const session = await getSessionUser();
  if (!session?.activeTenantId) redirect("/login");
  if (!canManageMembers(session.role)) {
    redirect("/dashboard/settings?error=sin_permiso");
  }

  const tenantId = await requireTenantId();

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
      /* no bloquear borrado en DB */
    }
  }

  await db.tenant.update({
    where: { id: tenantId },
    data: { logoUrl: null },
  });

  revalidatePath("/dashboard", "layout");
  revalidatePath("/dashboard/settings");
  redirect("/dashboard/settings?ok=1");
}
