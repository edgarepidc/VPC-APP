import {
  isDeliverableDoneStatus,
  normalizeDeliverableStatus,
} from "@/modules/deliverables/constants";

export const MIN_WEIGHT = 1;
export const MAX_WEIGHT = 100;
export const TARGET_SUM = 100;

export type WeightRow = { id: string; weight: number; weightManual?: boolean };

export function clampWeight(w: number): number {
  if (!Number.isFinite(w)) return MIN_WEIGHT;
  return Math.max(MIN_WEIGHT, Math.min(MAX_WEIGHT, Math.round(w)));
}

/** Reparte TARGET_SUM de forma equitativa entre ids. */
export function equalSplitWeights(ids: string[]): Map<string, number> {
  const n = ids.length;
  const map = new Map<string, number>();
  if (n === 0) return map;
  const base = Math.floor(TARGET_SUM / n);
  let rem = TARGET_SUM - base * n;
  for (const id of ids) {
    map.set(id, base + (rem > 0 ? 1 : 0));
    if (rem > 0) rem -= 1;
  }
  return map;
}

function fixSumTo100(
  rows: WeightRow[],
  lockedIds: Set<string>,
  preferAdjustId: string | null,
): WeightRow[] {
  const result = rows.map((r) => ({ ...r, weight: clampWeight(r.weight) }));
  let diff = TARGET_SUM - result.reduce((s, r) => s + r.weight, 0);
  if (diff === 0) return result;

  const adjustable = result.filter((r) => !lockedIds.has(r.id));
  const order = preferAdjustId
    ? [
        ...adjustable.filter((r) => r.id === preferAdjustId),
        ...adjustable.filter((r) => r.id !== preferAdjustId),
      ]
    : adjustable;

  let guard = 0;
  while (diff !== 0 && order.length > 0 && guard < 500) {
    const target = order[guard % order.length];
    const idx = result.findIndex((r) => r.id === target.id);
    if (idx < 0 || lockedIds.has(result[idx]!.id)) {
      guard += 1;
      continue;
    }
    const step = diff > 0 ? 1 : -1;
    const next = result[idx]!.weight + step;
    if (next >= MIN_WEIGHT && next <= MAX_WEIGHT) {
      result[idx] = { ...result[idx]!, weight: next };
      diff -= step;
    }
    guard += 1;
  }
  return result;
}

/** Escala pesos arbitrarios (p. ej. datos legacy) a porcentajes que suman 100. */
export function normalizeWeightsTo100(rows: WeightRow[]): WeightRow[] {
  if (rows.length === 0) return [];
  if (rows.length === 1) return [{ ...rows[0], weight: TARGET_SUM }];

  const total = rows.reduce((s, r) => s + Math.max(MIN_WEIGHT, r.weight), 0);
  if (total === TARGET_SUM) {
    return fixSumTo100(
      rows.map((r) => ({ ...r, weight: clampWeight(r.weight) })),
      new Set(),
      rows[0]!.id,
    );
  }

  const scaled = rows.map((r) => ({
    ...r,
    weight: Math.max(
      MIN_WEIGHT,
      Math.round((Math.max(MIN_WEIGHT, r.weight) / total) * TARGET_SUM),
    ),
  }));
  return fixSumTo100(scaled, new Set(), rows[0]!.id);
}

/**
 * Ajusta el peso de un entregable y redistribuye el delta solo entre entregables
 * no bloqueados (weightManual = false). El entregable editado queda bloqueado.
 */
export function redistributeWeightChange(
  rows: WeightRow[],
  changedId: string,
  newWeight: number,
): WeightRow[] {
  if (rows.length === 0) return [];
  if (rows.length === 1) return [{ ...rows[0]!, weight: TARGET_SUM, weightManual: true }];

  let targetWeight = clampWeight(newWeight);
  const lockedIds = new Set(
    rows.filter((r) => r.id !== changedId && r.weightManual).map((r) => r.id),
  );
  lockedIds.add(changedId);

  const lockedOthers = rows.filter((r) => r.id !== changedId && lockedIds.has(r.id));
  const adjustableOthers = rows.filter((r) => r.id !== changedId && !lockedIds.has(r.id));
  const lockedSum = lockedOthers.reduce((s, r) => s + r.weight, 0);
  const minAdjustableSum = adjustableOthers.length * MIN_WEIGHT;
  const maxAllowed = TARGET_SUM - lockedSum - minAdjustableSum;
  if (targetWeight > maxAllowed) targetWeight = Math.max(MIN_WEIGHT, maxAllowed);

  const budgetForAdjustable = TARGET_SUM - targetWeight - lockedSum;

  let result: WeightRow[] = rows.map((r) => {
    if (r.id === changedId) {
      return { ...r, weight: targetWeight, weightManual: true };
    }
    if (lockedIds.has(r.id)) return { ...r };
    return r;
  });

  if (adjustableOthers.length === 0) {
    const forced = Math.max(MIN_WEIGHT, TARGET_SUM - lockedSum);
    result = result.map((r) =>
      r.id === changedId ? { ...r, weight: forced, weightManual: true } : r,
    );
    return fixSumTo100(result, lockedIds, changedId);
  }

  const adjustableSum = adjustableOthers.reduce((s, r) => s + r.weight, 0);
  result = result.map((r) => {
    if (r.id === changedId || lockedIds.has(r.id)) return r;
    const proportion =
      adjustableSum > 0 ? r.weight / adjustableSum : 1 / adjustableOthers.length;
    return {
      ...r,
      weight: Math.max(MIN_WEIGHT, Math.round(proportion * budgetForAdjustable)),
      weightManual: false,
    };
  });

  return fixSumTo100(result, lockedIds, changedId);
}

/** Tras eliminar un entregable, normaliza el resto a 100 % (respeta manuales si es posible). */
export function rebalanceAfterRemoval(rows: WeightRow[]): WeightRow[] {
  if (rows.length === 0) return [];
  if (rows.length === 1) return [{ ...rows[0], weight: TARGET_SUM }];

  const manual = rows.filter((r) => r.weightManual);
  const manualSum = manual.reduce((s, r) => s + r.weight, 0);
  if (manualSum >= TARGET_SUM) {
    return normalizeWeightsTo100(rows.map((r) => ({ ...r, weightManual: false })));
  }

  const auto = rows.filter((r) => !r.weightManual);
  if (auto.length === 0) {
    return normalizeWeightsTo100(rows.map((r) => ({ ...r, weightManual: false })));
  }

  const budget = TARGET_SUM - manualSum;
  const autoSum = auto.reduce((s, r) => s + r.weight, 0);
  let result = rows.map((r) => {
    if (r.weightManual) return r;
    const proportion = autoSum > 0 ? r.weight / autoSum : 1 / auto.length;
    return { ...r, weight: Math.max(MIN_WEIGHT, Math.round(proportion * budget)) };
  });
  const locked = new Set(manual.map((r) => r.id));
  return fixSumTo100(result, locked, auto[0]?.id ?? null);
}

export function computeProjectProgress(rows: Array<{ weight: number; status: string }>) {
  const normalized = normalizeWeightsTo100(rows.map((r, i) => ({ id: String(i), weight: r.weight })));
  let doneWeight = 0;
  let inProgWeight = 0;
  rows.forEach((row, i) => {
    const w = normalized[i]?.weight ?? MIN_WEIGHT;
    if (isDeliverableDoneStatus(row.status)) doneWeight += w;
    else if (normalizeDeliverableStatus(row.status) === "review") inProgWeight += w;
  });
  const pct = Math.round(doneWeight);
  const pctInProg = Math.round(inProgWeight);
  return {
    pct,
    pctInProg,
    doneWeight,
    totalWeight: TARGET_SUM,
  };
}

export function projectWeightBudget(rows: WeightRow[], excludeId?: string) {
  const used = rows
    .filter((r) => r.id !== excludeId)
    .reduce((s, r) => s + r.weight, 0);
  return {
    assigned: used,
    available: Math.max(0, TARGET_SUM - used),
  };
}
