import type { Prisma } from "@prisma/client";

import { db } from "@/lib/db";

import { DELIVERABLE_STATUS_LABEL, normalizeDeliverableStatus } from "./constants";
import {
  appendLog,
  parseAcuses,
  parseActivityLog,
  toJsonAcuses,
  toJsonActivityLog,
  type DeliverableAcuse,
  type DeliverableLogEntry,
} from "./json";

export async function listDeliverablesByTenant(
  tenantId: string,
  options?: { restrictToProjectIds?: string[] },
) {
  const restrict = options?.restrictToProjectIds;
  return db.deliverable.findMany({
    where: {
      tenantId,
      ...(restrict !== undefined ? { projectId: { in: restrict } } : {}),
    },
    include: {
      project: {
        select: { id: true, name: true },
      },
    },
    orderBy: [{ dueDate: "asc" }, { createdAt: "desc" }],
  });
}

export async function getDeliverableById(tenantId: string, id: string) {
  return db.deliverable.findFirst({
    where: { id, tenantId },
    include: { project: { select: { id: true, name: true } } },
  });
}

export async function createDeliverable(input: {
  tenantId: string;
  projectId: string;
  title: string;
  cell?: string | null;
  ownerName?: string | null;
  clientName?: string | null;
  status?: string;
  dueDate?: Date | null;
  weight?: number;
  description?: string | null;
  acceptanceCriteria?: string | null;
  notes?: string | null;
}) {
  const project = await db.project.findFirst({
    where: { id: input.projectId, tenantId: input.tenantId },
    select: { id: true },
  });
  if (!project) {
    throw new Error("Proyecto no válido para esta organización.");
  }

  const title = input.title.trim();
  if (!title) {
    throw new Error("El nombre del entregable es obligatorio.");
  }

  const st = normalizeDeliverableStatus(input.status ?? "pending");
  const weight =
    input.weight != null && !Number.isNaN(input.weight)
      ? Math.max(1, Math.min(999, Math.round(input.weight)))
      : 5;

  const initialLog: DeliverableLogEntry[] = [
    {
      at: new Date().toISOString(),
      text: "Entregable registrado",
      color: "#888780",
    },
  ];

  return db.deliverable.create({
    data: {
      tenantId: input.tenantId,
      projectId: input.projectId,
      title,
      cell: input.cell?.trim() || null,
      ownerName: input.ownerName?.trim() || null,
      clientName: input.clientName?.trim() || null,
      status: st,
      dueDate: input.dueDate ?? null,
      weight,
      description: input.description?.trim() || null,
      acceptanceCriteria: input.acceptanceCriteria?.trim() || null,
      notes: input.notes?.trim() || null,
      acuses: [] as unknown as Prisma.InputJsonValue,
      activityLog: toJsonActivityLog(initialLog) as Prisma.InputJsonValue,
    },
  });
}

export async function updateDeliverable(input: {
  tenantId: string;
  id: string;
  projectId?: string;
  title?: string;
  cell?: string | null;
  ownerName?: string | null;
  clientName?: string | null;
  status?: string;
  dueDate?: Date | null;
  weight?: number;
  description?: string | null;
  acceptanceCriteria?: string | null;
  notes?: string | null;
  acuses?: DeliverableAcuse[];
  activityLog?: DeliverableLogEntry[];
}) {
  const existing = await db.deliverable.findFirst({
    where: { id: input.id, tenantId: input.tenantId },
    select: { id: true },
  });
  if (!existing) {
    throw new Error("Entregable no encontrado.");
  }

  if (input.projectId !== undefined) {
    const p = await db.project.findFirst({
      where: { id: input.projectId, tenantId: input.tenantId },
      select: { id: true },
    });
    if (!p) throw new Error("Proyecto no válido para esta organización.");
  }

  const data: Prisma.DeliverableUpdateInput = {};

  if (input.title !== undefined) {
    const t = input.title.trim();
    if (!t) throw new Error("El título no puede estar vacío.");
    data.title = t;
  }
  if (input.projectId !== undefined) {
    data.project = { connect: { id: input.projectId } };
  }
  if (input.cell !== undefined) data.cell = input.cell?.trim() || null;
  if (input.ownerName !== undefined) data.ownerName = input.ownerName?.trim() || null;
  if (input.clientName !== undefined) data.clientName = input.clientName?.trim() || null;
  if (input.status !== undefined) {
    data.status = normalizeDeliverableStatus(input.status);
  }
  if (input.dueDate !== undefined) data.dueDate = input.dueDate;
  if (input.weight !== undefined) {
    data.weight = Math.max(1, Math.min(999, Math.round(input.weight)));
  }
  if (input.description !== undefined) data.description = input.description?.trim() || null;
  if (input.acceptanceCriteria !== undefined) {
    data.acceptanceCriteria = input.acceptanceCriteria?.trim() || null;
  }
  if (input.notes !== undefined) data.notes = input.notes?.trim() || null;
  if (input.acuses !== undefined) {
    data.acuses = toJsonAcuses(input.acuses) as Prisma.InputJsonValue;
  }
  if (input.activityLog !== undefined) {
    data.activityLog = toJsonActivityLog(input.activityLog) as Prisma.InputJsonValue;
  }

  await db.deliverable.update({
    where: { id: input.id },
    data,
  });
}

export async function updateDeliverableStatus(input: {
  id: string;
  tenantId: string;
  status: string;
}) {
  const row = await db.deliverable.findFirst({
    where: { id: input.id, tenantId: input.tenantId },
  });
  if (!row) {
    throw new Error("Entregable no encontrado para este tenant.");
  }

  const next = normalizeDeliverableStatus(input.status);
  const prev = normalizeDeliverableStatus(row.status);
  if (prev === next) return;

  let acuses = parseAcuses(row.acuses);
  const log = parseActivityLog(row.activityLog);

  if (next === "delivered") {
    const today = new Date().toISOString().slice(0, 10);
    acuses = acuses.map((a) =>
      a.ok ? a : { ...a, ok: true, confirmedAt: a.confirmedAt ?? today },
    );
  }

  const label = DELIVERABLE_STATUS_LABEL[next];
  const nextLog = appendLog(log, `Estado cambiado a: ${label}`, next);

  await db.deliverable.update({
    where: { id: input.id },
    data: {
      status: next,
      acuses: toJsonAcuses(acuses) as Prisma.InputJsonValue,
      activityLog: toJsonActivityLog(nextLog) as Prisma.InputJsonValue,
    },
  });
}

export async function deleteDeliverable(input: { tenantId: string; id: string }) {
  const r = await db.deliverable.deleteMany({
    where: { id: input.id, tenantId: input.tenantId },
  });
  if (r.count === 0) {
    throw new Error("Entregable no encontrado.");
  }
}

export async function toggleDeliverableAcuse(input: {
  tenantId: string;
  id: string;
  index: number;
}) {
  const row = await db.deliverable.findFirst({
    where: { id: input.id, tenantId: input.tenantId },
  });
  if (!row) throw new Error("Entregable no encontrado.");

  const acuses = parseAcuses(row.acuses);
  const i = input.index;
  if (i < 0 || i >= acuses.length) throw new Error("Acuse inválido.");

  const cur = acuses[i];
  const ok = !cur.ok;
  const today = new Date().toISOString().slice(0, 10);
  acuses[i] = {
    ...cur,
    ok,
    confirmedAt: ok ? (cur.confirmedAt ?? today) : null,
  };

  const log = parseActivityLog(row.activityLog);
  const nextLog: DeliverableLogEntry[] = [
    ...log,
    {
      at: new Date().toISOString(),
      text: ok ? `Acuse confirmado: ${cur.name}` : `Acuse revertido: ${cur.name}`,
      color: ok ? "#1D9E75" : "#BA7517",
    },
  ];

  await db.deliverable.update({
    where: { id: input.id },
    data: {
      acuses: toJsonAcuses(acuses) as Prisma.InputJsonValue,
      activityLog: toJsonActivityLog(nextLog) as Prisma.InputJsonValue,
    },
  });
}

export async function addDeliverableAcuse(input: {
  tenantId: string;
  id: string;
  name: string;
  role?: string;
}) {
  const name = input.name.trim();
  if (!name) throw new Error("Nombre del acuse obligatorio.");

  const row = await db.deliverable.findFirst({
    where: { id: input.id, tenantId: input.tenantId },
  });
  if (!row) throw new Error("Entregable no encontrado.");

  const acuses = parseAcuses(row.acuses);
  acuses.push({
    name,
    role: (input.role ?? "Revisor").trim() || "Revisor",
    ok: false,
    confirmedAt: null,
  });

  const log = parseActivityLog(row.activityLog);
  const nextLog = appendLog(log, `Acuse agregado: ${name}`, "review");

  await db.deliverable.update({
    where: { id: input.id },
    data: {
      acuses: toJsonAcuses(acuses) as Prisma.InputJsonValue,
      activityLog: toJsonActivityLog(nextLog) as Prisma.InputJsonValue,
    },
  });
}

export async function removeDeliverableAcuse(input: {
  tenantId: string;
  id: string;
  index: number;
}) {
  const row = await db.deliverable.findFirst({
    where: { id: input.id, tenantId: input.tenantId },
  });
  if (!row) throw new Error("Entregable no encontrado.");

  const acuses = parseAcuses(row.acuses);
  if (input.index < 0 || input.index >= acuses.length) throw new Error("Acuse inválido.");
  acuses.splice(input.index, 1);

  await db.deliverable.update({
    where: { id: input.id },
    data: {
      acuses: toJsonAcuses(acuses) as Prisma.InputJsonValue,
    },
  });
}
