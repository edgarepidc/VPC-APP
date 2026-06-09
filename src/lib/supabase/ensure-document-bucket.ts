import type { SupabaseClient } from "@supabase/supabase-js";

const PDF_MIME = "application/pdf";
const DEFAULT_MAX_BYTES = 10 * 1024 * 1024;

/** Crea bucket público para PDFs de entregables (idempotente). */
export async function ensureDeliverableDocumentBucket(
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
    allowedMimeTypes: [PDF_MIME],
  });

  if (!createErr) return { ok: true };

  const msg = createErr.message ?? "No se pudo crear el bucket.";
  if (/already exists|duplicate/i.test(msg)) {
    return { ok: true };
  }

  return { ok: false, message: msg };
}
