import type { Prisma } from "@prisma/client";

import { db } from "@/lib/db";
import {
  clampWeight,
  normalizeWeightsTo100,
  rebalanceAfterRemoval,
  redistributeWeightChange,
  TARGET_SUM,
  type WeightRow,
} from "@/lib/deliverable-weight-utils";

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

async function applyWeightPlan(
  tenantId: string,
  plan: Array<{ id: string; weight: number; weightManual: boolean }>,
) {
  if (plan.length === 0) return;
  await db.$transaction(
    plan.map((row) =>
      db.deliverable.updateMany({
        where: { id: row.id, tenantId },
        data: { weight: clampWeight(row.weight), weightManual: row.weightManual },
      }),
    ),
  );
}

async function listProjectWeightRows(tenantId: string, projectId: string): Promise<WeightRow[]> {
  const rows = await db.deliverable.findMany({
    where: { tenantId, projectId },
    select: { id: true, weight: true, weightManual: true },
    orderBy: { createdAt: "asc" },
  });
  return rows.map((r) => ({
    id: r.id,
    weight: r.weight,
    weightManual: r.weightManual,
  }));
}

/** Convierte pesos legacy (puntos) a % que suman 100 por proyecto. */
export async function normalizeLegacyWeightsForTenant(tenantId: string) {
  const rows = await db.deliverable.findMany({
    where: { tenantId },
    select: { id: true, projectId: true, weight: true, weightManual: true },
  });
  const byProject = new Map<string, WeightRow[]>();
  for (const row of rows) {
    const list = byProject.get(row.projectId) ?? [];
    list.push({
      id: row.id,
      weight: row.weight,
      weightManual: row.weightManual,
    });
    byProject.set(row.projectId, list);
  }

  const updates: Array<{ id: string; weight: number; weightManual: boolean }> = [];
  for (const [, projectRows] of byProject) {
    const sum = projectRows.reduce((s, r) => s + r.weight, 0);
    if (sum === TARGET_SUM) continue;
    const normalized = normalizeWeightsTo100(
      projectRows.map((r) => ({ ...r, weightManual: false })),
    );
    for (const row of normalized) {
      updates.push({
        id: row.id,
        weight: row.weight,
        weightManual: row.weightManual ?? false,
      });
    }
  }
  await applyWeightPlan(tenantId, updates);
}

export async function listDeliverablesByTenant(
  tenantId: string,
  options?: { restrictToProjectIds?: string[] },
) {
  const restrict = options?.restrictToProjectIds;
  const rows = await db.deliverable.findMany({
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

  const needsNormalize = (() => {
    const sums = new Map<string, number>();
    for (const row of rows) {
      sums.set(row.projectId, (sums.get(row.projectId) ?? 0) + row.weight);
    }
    for (const sum of sums.values()) {
      if (sum !== TARGET_SUM) return true;
    }
    return false;
  })();

  if (needsNormalize) {
    await normalizeLegacyWeightsForTenant(tenantId);
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

  return rows;
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
  const existing = await listProjectWeightRows(input.tenantId, input.projectId);
  const initialWeight =
    existing.length === 0
      ? TARGET_SUM
      : clampWeight(
          input.weight != null && !Number.isNaN(input.weight)
            ? input.weight
            : Math.max(1, Math.floor(TARGET_SUM / (existing.length + 1))),
        );

  const initialLog: DeliverableLogEntry[] = [
    {
      at: new Date().toISOString(),
      text: "Entregable registrado",
      color: "#888780",
    },
  ];

  const created = await db.deliverable.create({
    data: {
      tenantId: input.tenantId,
      projectId: input.projectId,
      title,
      cell: input.cell?.trim() || null,
      ownerName: input.ownerName?.trim() || null,
      clientName: input.clientName?.trim() || null,
      status: st,
      dueDate: input.dueDate ?? null,
      weight: initialWeight,
      weightManual: existing.length > 0,
      description: input.description?.trim() || null,
      acceptanceCriteria: input.acceptanceCriteria?.trim() || null,
      notes: input.notes?.trim() || null,
      acuses: [] as unknown as Prisma.InputJsonValue,
      activityLog: toJsonActivityLog(initialLog) as Prisma.InputJsonValue,
    },
  });

  if (existing.length > 0) {
    const plan = redistributeWeightChange(
      [...existing, { id: created.id, weight: initialWeight, weightManual: true }],
      created.id,
      initialWeight,
    );
    await applyWeightPlan(
      input.tenantId,
      plan.map((r) => ({
        id: r.id,
        weight: r.weight,
        weightManual: r.weightManual ?? false,
      })),
    );
  }

  return created;
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
    select: { id: true, projectId: true, weight: true, weightManual: true },
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
    data.weight = clampWeight(input.weight);
    data.weightManual = true;
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

  const nextProjectId =
    input.projectId !== undefined ? input.projectId : existing.projectId;

  if (input.weight !== undefined) {
    const projectRows = await listProjectWeightRows(input.tenantId, nextProjectId);
    const plan = redistributeWeightChange(projectRows, input.id, clampWeight(input.weight));
    await applyWeightPlan(
      input.tenantId,
      plan.map((r) => ({
        id: r.id,
        weight: r.weight,
        weightManual: r.weightManual ?? false,
      })),
    );
  } else if (input.projectId !== undefined && input.projectId !== existing.projectId) {
    const oldRows = await listProjectWeightRows(input.tenantId, existing.projectId);
    const remaining = oldRows.filter((r) => r.id !== input.id);
    if (remaining.length > 0) {
      const oldPlan = rebalanceAfterRemoval(remaining);
      await applyWeightPlan(
        input.tenantId,
        oldPlan.map((r) => ({
          id: r.id,
          weight: r.weight,
          weightManual: r.weightManual ?? false,
        })),
      );
    }
    const newRows = await listProjectWeightRows(input.tenantId, input.projectId);
    const plan = redistributeWeightChange(
      [...newRows, { id: input.id, weight: existing.weight, weightManual: true }],
      input.id,
      existing.weight,
    );
    await applyWeightPlan(
      input.tenantId,
      plan.map((r) => ({
        id: r.id,
        weight: r.weight,
        weightManual: r.weightManual ?? false,
      })),
    );
  }
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
  const row = await db.deliverable.findFirst({
    where: { id: input.id, tenantId: input.tenantId },
    select: { id: true, projectId: true },
  });
  if (!row) throw new Error("Entregable no encontrado.");

  await db.deliverable.deleteMany({
    where: { id: input.id, tenantId: input.tenantId },
  });

  const remaining = await listProjectWeightRows(input.tenantId, row.projectId);
  if (remaining.length === 0) return;

  const plan = rebalanceAfterRemoval(remaining);
  await applyWeightPlan(
    input.tenantId,
    plan.map((r) => ({
      id: r.id,
      weight: r.weight,
      weightManual: r.weightManual ?? false,
    })),
  );
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
