"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getSessionUser } from "@/lib/auth/session";
import { ensurePublicImageBucket } from "@/lib/supabase/ensure-image-bucket";
import { db } from "@/lib/db";
import { createAdminClient } from "@/utils/supabase/admin";

const BUCKET = "user-avatars";
const MAX_BYTES = 2 * 1024 * 1024;
const ALLOWED = new Set(["image/png", "image/jpeg", "image/webp"]);

function extFromMime(mime: string): string {
  if (mime === "image/png") return "png";
  if (mime === "image/jpeg") return "jpg";
  if (mime === "image/webp") return "webp";
  return "bin";
}

async function putUserAvatarFromBuffer(
  userId: string,
  buf: Buffer,
  mime: string,
): Promise<{ ok: true } | { ok: false; code: string; detail?: string }> {
  if (!ALLOWED.has(mime)) return { ok: false, code: "tipo_avatar" };
  if (buf.length > MAX_BYTES) return { ok: false, code: "tamano_avatar" };

  const path = `${userId}/avatar.${extFromMime(mime)}`;

  try {
    const admin = createAdminClient();
    const bucket = await ensurePublicImageBucket(admin, BUCKET, {
      fileSizeLimit: MAX_BYTES,
    });
    if (!bucket.ok) {
      console.error("[putUserAvatarFromBuffer] bucket:", bucket.message);
      return { ok: false, code: "storage_avatar", detail: bucket.message };
    }

    const { error: upErr } = await admin.storage.from(BUCKET).upload(path, buf, {
      contentType: mime,
      upsert: true,
    });
    if (upErr) {
      console.error("[putUserAvatarFromBuffer]", upErr);
      return { ok: false, code: "storage_avatar", detail: upErr.message };
    }
    const { data: pub } = admin.storage.from(BUCKET).getPublicUrl(path);
    await db.user.update({
      where: { id: userId },
      data: { avatarUrl: pub.publicUrl },
    });
    return { ok: true };
  } catch (e) {
    console.error("[putUserAvatarFromBuffer]", e);
    return {
      ok: false,
      code: "storage_avatar",
      detail: e instanceof Error ? e.message : String(e),
    };
  }
}

const ERROR_MESSAGES: Record<string, string> = {
  tipo_avatar: "Formato no válido. Usa PNG, JPG o WebP.",
  tamano_avatar: "La imagen supera 2 MB.",
  storage_avatar:
    "No se pudo guardar la foto. Si persiste, pide al administrador ejecutar prisma/user_avatars_bucket.sql en Supabase.",
  archivo_avatar: "Selecciona una imagen.",
};

export async function uploadUserAvatarAction(formData: FormData) {
  const session = await getSessionUser();
  if (!session) redirect("/login");

  const file = formData.get("avatar");
  if (!(file instanceof File) || file.size === 0) {
    redirect("/dashboard/settings?error=archivo_avatar");
  }

  const buf = Buffer.from(await file.arrayBuffer());
  const put = await putUserAvatarFromBuffer(session.userId, buf, file.type);
  if (!put.ok) {
    const base = ERROR_MESSAGES[put.code] ?? put.code;
    const msg = put.detail ? `${base} (${put.detail})` : base;
    redirect(`/dashboard/settings?error=${encodeURIComponent(msg)}`);
  }

  revalidatePath("/dashboard", "layout");
  redirect("/dashboard/settings?ok=Listo,+foto+de+perfil+guardada");
}

export async function clearUserAvatarAction() {
  const session = await getSessionUser();
  if (!session) redirect("/login");

  const user = await db.user.findUnique({
    where: { id: session.userId },
    select: { avatarUrl: true },
  });
  const prev = user?.avatarUrl;
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

  await db.user.update({
    where: { id: session.userId },
    data: { avatarUrl: null },
  });

  revalidatePath("/dashboard", "layout");
  redirect("/dashboard/settings?ok=Foto+de+perfil+eliminada");
}
