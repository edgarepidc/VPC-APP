import { db } from "@/lib/db";

import {
  DEFAULT_LABEL_SEED,
  normalizeTaskLabelColorKey,
  type TaskLabelColorKey,
} from "./labels";

export async function listTaskLabelsForTenant(tenantId: string) {
  return db.taskLabel.findMany({
    where: { tenantId },
    orderBy: [{ name: "asc" }],
    select: { id: true, name: true, colorKey: true },
  });
}

export async function listOrSeedTaskLabelsForTenant(tenantId: string) {
  const existing = await listTaskLabelsForTenant(tenantId);
  if (existing.length > 0) return existing;

  await db.taskLabel.createMany({
    data: DEFAULT_LABEL_SEED.map((row) => ({
      tenantId,
      name: row.name,
      colorKey: row.colorKey,
    })),
    skipDuplicates: true,
  });

  return listTaskLabelsForTenant(tenantId);
}

export async function createTaskLabel(input: {
  tenantId: string;
  name: string;
  colorKey?: string;
}) {
  const name = input.name.trim();
  if (!name) throw new Error("El nombre de la etiqueta es obligatorio.");
  if (name.length > 40) throw new Error("La etiqueta no puede superar 40 caracteres.");

  const colorKey = normalizeTaskLabelColorKey(input.colorKey ?? "sky");

  const dup = await db.taskLabel.findFirst({
    where: { tenantId: input.tenantId, name: { equals: name, mode: "insensitive" } },
    select: { id: true },
  });
  if (dup) throw new Error("Ya existe una etiqueta con ese nombre.");

  return db.taskLabel.create({
    data: {
      tenantId: input.tenantId,
      name,
      colorKey,
    },
    select: { id: true, name: true, colorKey: true },
  });
}

export function nextLabelColorKey(index: number): TaskLabelColorKey {
  const keys = DEFAULT_LABEL_SEED.map((r) => r.colorKey);
  return keys[index % keys.length] ?? "sky";
}
