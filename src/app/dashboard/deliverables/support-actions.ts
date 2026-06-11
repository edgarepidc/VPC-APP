"use server";

import { revalidatePath } from "next/cache";

import { getSessionUser } from "@/lib/auth/session";
import { canWriteWorkspaceData } from "@/lib/workspace-access";
import { ensureDeliverableDocumentBucket } from "@/lib/supabase/ensure-document-bucket";
import {
  addDeliverableSupportFile,
  getDeliverableById,
  removeDeliverableSupportFile,
} from "@/modules/deliverables/service";
import { createAdminClient } from "@/utils/supabase/admin";

const BUCKET = "deliverable-documents";
const MAX_BYTES = 10 * 1024 * 1024;

async function requireWriteTenantId(): Promise<string> {
  const s = await getSessionUser();
  if (!s?.activeTenantId) throw new Error("No autorizado");
  if (!canWriteWorkspaceData(s)) throw new Error("Sin permiso");
  return s.activeTenantId;
}

export async function uploadDeliverablePdfAction(formData: FormData) {
  const tenantId = await requireWriteTenantId();
  const deliverableId = String(formData.get("deliverableId") ?? "").trim();
  const file = formData.get("file");

  if (!deliverableId) return { ok: false as const, error: "Entregable inválido." };
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false as const, error: "Selecciona un PDF." };
  }
  if (file.type !== "application/pdf") {
    return { ok: false as const, error: "Solo se permiten archivos PDF." };
  }
  if (file.size > MAX_BYTES) {
    return { ok: false as const, error: "El PDF supera 10 MB." };
  }

  const row = await getDeliverableById(tenantId, deliverableId);
  if (!row) return { ok: false as const, error: "Entregable no encontrado." };

  const safeName = file.name.replace(/[^\w.\-() ]+/g, "_").slice(0, 120) || "soporte.pdf";
  const path = `${tenantId}/${deliverableId}/${Date.now()}-${safeName}`;

  try {
    const admin = createAdminClient();
    const bucket = await ensureDeliverableDocumentBucket(admin, BUCKET, {
      fileSizeLimit: MAX_BYTES,
    });
    if (!bucket.ok) {
      return { ok: false as const, error: bucket.message };
    }

    const buf = Buffer.from(await file.arrayBuffer());
    const { error: upErr } = await admin.storage.from(BUCKET).upload(path, buf, {
      contentType: "application/pdf",
      upsert: true,
    });
    if (upErr) {
      return { ok: false as const, error: upErr.message };
    }

    const { data: pub } = admin.storage.from(BUCKET).getPublicUrl(path);
    await addDeliverableSupportFile({
      tenantId,
      id: deliverableId,
      url: pub.publicUrl,
      name: safeName,
    });
  } catch (e) {
    return { ok: false as const, error: (e as Error).message };
  }

  revalidatePath("/dashboard/deliverables");
  return { ok: true as const };
}

export async function clearDeliverablePdfAction(deliverableId: string, url?: string) {
  const tenantId = await requireWriteTenantId();
  const row = await getDeliverableById(tenantId, deliverableId);
  if (!row) return { ok: false as const, error: "Entregable no encontrado." };

  const targetUrl = url?.trim() || row.supportFileUrl;
  if (!targetUrl) return { ok: true as const };

  await removeDeliverableSupportFile({
    tenantId,
    id: deliverableId,
    url: targetUrl,
  });

  revalidatePath("/dashboard/deliverables");
  return { ok: true as const };
}
