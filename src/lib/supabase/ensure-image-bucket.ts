import type { SupabaseClient } from "@supabase/supabase-js";

const IMAGE_MIME_TYPES = ["image/png", "image/jpeg", "image/webp"];
const DEFAULT_MAX_BYTES = 2 * 1024 * 1024;

/** Crea el bucket público si no existe (idempotente). */
export async function ensurePublicImageBucket(
  admin: SupabaseClient,
  bucketId: string,
  options?: { fileSizeLimit?: number },
): Promise<{ ok: true } | { ok: false; message: string }> {
  const fileSizeLimit = options?.fileSizeLimit ?? DEFAULT_MAX_BYTES;

  const { data: existing, error: getErr } = await admin.storage.getBucket(bucketId);
  if (existing && !getErr) {
    return { ok: true };
  }

  const { error: createErr } = await admin.storage.createBucket(bucketId, {
    public: true,
    fileSizeLimit,
    allowedMimeTypes: IMAGE_MIME_TYPES,
  });

  if (!createErr) return { ok: true };

  const msg = createErr.message ?? "No se pudo crear el bucket.";
  if (/already exists|duplicate/i.test(msg)) {
    return { ok: true };
  }

  return { ok: false, message: msg };
}
