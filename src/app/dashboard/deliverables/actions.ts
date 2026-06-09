"use server";

import { revalidatePath } from "next/cache";

import { getSessionUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/rbac";
import {
  addDeliverableAcuse,
  applyDeliverableTemplate,
  createDeliverable,
  deleteDeliverable,
  removeDeliverableAcuse,
  toggleDeliverableAcuse,
  updateDeliverable,
  updateDeliverableStatus,
} from "@/modules/deliverables/service";

function parseLocalDate(s: string): Date | null {
  const t = s.trim();
  if (!t) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(t);
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  if (!y || !mo || !d) return null;
  return new Date(y, mo - 1, d);
}

async function requireWriteTenantId(): Promise<string> {
  const s = await getSessionUser();
  if (!s?.activeTenantId) throw new Error("No autorizado");
  if (!hasPermission(s.role, "tasks.write")) throw new Error("Sin permiso");
  return s.activeTenantId;
}

export type CreateDeliverableInput = {
  projectId: string;
  title: string;
  phase?: string;
  ownerName: string;
  clientName?: string;
  dueDate: string;
  status?: string;
  weight: number;
  description?: string;
  acceptanceCriteria?: string;
  notes?: string;
  supportUrl?: string;
  dependsOnId?: string | null;
};

export async function createDeliverableAction(input: CreateDeliverableInput) {
  const tenantId = await requireWriteTenantId();
  const due = parseLocalDate(input.dueDate);
  if (!due) throw new Error("La fecha compromiso es obligatoria.");

  const created = await createDeliverable({
    tenantId,
    projectId: input.projectId.trim(),
    title: input.title.trim(),
    cell: input.phase?.trim() || null,
    ownerName: input.ownerName.trim(),
    clientName: input.clientName?.trim() || null,
    dueDate: due,
    status: input.status,
    weight: input.weight,
    description: input.description?.trim() || null,
    acceptanceCriteria: input.acceptanceCriteria?.trim() || null,
    notes: input.notes?.trim() || null,
    supportUrl: input.supportUrl?.trim() || null,
    dependsOnId: input.dependsOnId?.trim() || null,
  });
  revalidatePath("/dashboard/deliverables");
  return { id: created.id };
}

export type UpdateDeliverableDetailInput = {
  id: string;
  projectId: string;
  title: string;
  phase?: string;
  ownerName: string;
  clientName?: string;
  dueDate: string;
  weight: number;
  description?: string;
  acceptanceCriteria?: string;
  notes?: string;
  supportUrl?: string;
  dependsOnId?: string | null;
};

export async function updateDeliverableDetailAction(input: UpdateDeliverableDetailInput) {
  const tenantId = await requireWriteTenantId();
  const due = parseLocalDate(input.dueDate);
  if (!due) throw new Error("La fecha compromiso es obligatoria.");

  await updateDeliverable({
    tenantId,
    id: input.id,
    projectId: input.projectId.trim(),
    title: input.title.trim(),
    cell: input.phase?.trim() || null,
    ownerName: input.ownerName.trim(),
    clientName: input.clientName?.trim() || null,
    dueDate: due,
    weight: input.weight,
    description: input.description?.trim() || null,
    acceptanceCriteria: input.acceptanceCriteria?.trim() || null,
    notes: input.notes?.trim() || null,
    supportUrl: input.supportUrl?.trim() || null,
    dependsOnId: input.dependsOnId?.trim() || null,
  });
  revalidatePath("/dashboard/deliverables");
}

export async function applyDeliverableTemplateAction(input: {
  projectId: string;
  templateId: string;
  startDate: string;
  ownerName?: string;
  clientName?: string;
}) {
  const tenantId = await requireWriteTenantId();
  const start = parseLocalDate(input.startDate);
  if (!start) throw new Error("La fecha de inicio es obligatoria.");

  const result = await applyDeliverableTemplate({
    tenantId,
    projectId: input.projectId.trim(),
    templateId: input.templateId.trim(),
    startDate: start,
    ownerName: input.ownerName?.trim() || null,
    clientName: input.clientName?.trim() || null,
  });
  revalidatePath("/dashboard/deliverables");
  return result;
}

export async function setDeliverableStatusAction(
  id: string,
  status: string,
  rejectReason?: string,
) {
  const tenantId = await requireWriteTenantId();
  await updateDeliverableStatus({ tenantId, id, status, rejectReason });
  revalidatePath("/dashboard/deliverables");
  revalidatePath("/dashboard/pmo");
  revalidatePath("/dashboard/pmo/deliverables");
}

export async function deleteDeliverableAction(id: string) {
  const tenantId = await requireWriteTenantId();
  await deleteDeliverable({ tenantId, id });
  revalidatePath("/dashboard/deliverables");
}

export async function toggleDeliverableAcuseAction(id: string, index: number) {
  const tenantId = await requireWriteTenantId();
  await toggleDeliverableAcuse({ tenantId, id, index });
  revalidatePath("/dashboard/deliverables");
}

export async function addDeliverableAcuseAction(
  id: string,
  name: string,
  role?: string,
) {
  const tenantId = await requireWriteTenantId();
  await addDeliverableAcuse({ tenantId, id, name, role });
  revalidatePath("/dashboard/deliverables");
}

export async function removeDeliverableAcuseAction(id: string, index: number) {
  const tenantId = await requireWriteTenantId();
  await removeDeliverableAcuse({ tenantId, id, index });
  revalidatePath("/dashboard/deliverables");
}
