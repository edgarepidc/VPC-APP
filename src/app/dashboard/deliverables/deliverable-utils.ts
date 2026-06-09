import {
  isDeliverableDoneStatus,
  normalizeDeliverableStatus,
} from "@/modules/deliverables/constants";

import type { DeliverableTrackerRow } from "./deliverables-tracker";

export type DeliverableActionKind =
  | "overdue"
  | "due_soon"
  | "review"
  | "acuse_pending"
  | "blocked";

export type DeliverableActionItem = {
  id: string;
  kind: DeliverableActionKind;
  label: string;
  row: DeliverableTrackerRow;
};

function parseYmd(s: string | null): Date | null {
  if (!s?.trim()) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  if (!m) return null;
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

function daysFromDue(due: string | null, status: string): number | null {
  if (isDeliverableDoneStatus(status)) return null;
  const d = parseYmd(due);
  if (!d) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((d.getTime() - today.getTime()) / 86400000);
}

export type ConsolidatedActionItem = {
  row: DeliverableTrackerRow;
  kinds: DeliverableActionKind[];
  priority: number;
};

const kindRank: Record<DeliverableActionKind, number> = {
  overdue: 0,
  blocked: 1,
  due_soon: 2,
  review: 3,
  acuse_pending: 4,
};

export function buildConsolidatedActionItems(
  rows: DeliverableTrackerRow[],
  rowById: Map<string, DeliverableTrackerRow>,
): ConsolidatedActionItem[] {
  const map = new Map<string, ConsolidatedActionItem>();

  for (const row of rows) {
    const st = normalizeDeliverableStatus(row.status);
    const df = daysFromDue(row.dueDate, row.status);
    const kinds: DeliverableActionKind[] = [];

    if (df !== null && df < 0) kinds.push("overdue");
    if (row.dependsOnId) {
      const dep = rowById.get(row.dependsOnId);
      if (dep && !isDeliverableDoneStatus(dep.status)) kinds.push("blocked");
    }
    if (df !== null && df >= 0 && df <= 5) kinds.push("due_soon");
    if (st === "review") kinds.push("review");
    if (row.acuses.some((a) => !a.ok) && !isDeliverableDoneStatus(st)) {
      kinds.push("acuse_pending");
    }

    if (kinds.length === 0) continue;
    const priority = Math.min(...kinds.map((k) => kindRank[k]));
    map.set(row.id, { row, kinds, priority });
  }

  return [...map.values()].sort((a, b) => a.priority - b.priority).slice(0, 12);
}

/** @deprecated use buildConsolidatedActionItems */
export function buildDeliverableActionItems(
  rows: DeliverableTrackerRow[],
  rowById: Map<string, DeliverableTrackerRow>,
): DeliverableActionItem[] {
  return buildConsolidatedActionItems(rows, rowById).flatMap((item) =>
    item.kinds.map((kind) => ({
      id: `${item.row.id}-${kind}`,
      kind,
      label: item.row.title,
      row: item.row,
    })),
  );
}

export function isDeliverableBlocked(
  row: DeliverableTrackerRow,
  rowById: Map<string, DeliverableTrackerRow>,
): boolean {
  if (!row.dependsOnId) return false;
  const dep = rowById.get(row.dependsOnId);
  return Boolean(dep && !isDeliverableDoneStatus(dep.status));
}

export function computeScopeCompliance(rows: DeliverableTrackerRow[]) {
  const closed = rows.filter(
    (r) => isDeliverableDoneStatus(r.status) && r.deliveredAt && r.dueDate,
  );
  let onTime = 0;
  for (const r of closed) {
    const due = parseYmd(r.dueDate);
    const del = new Date(r.deliveredAt!);
    if (!due) continue;
    const dueEnd = new Date(due);
    dueEnd.setHours(23, 59, 59, 999);
    if (del.getTime() <= dueEnd.getTime()) onTime += 1;
  }
  const onTimePct = closed.length > 0 ? Math.round((onTime / closed.length) * 100) : null;

  const withLead = rows.filter((r) => isDeliverableDoneStatus(r.status) && r.deliveredAt && r.createdAt);
  let avgLeadDays: number | null = null;
  if (withLead.length > 0) {
    const total = withLead.reduce((sum, r) => {
      const created = new Date(r.createdAt!);
      const delivered = new Date(r.deliveredAt!);
      created.setHours(0, 0, 0, 0);
      delivered.setHours(0, 0, 0, 0);
      return sum + Math.max(0, Math.round((delivered.getTime() - created.getTime()) / 86400000));
    }, 0);
    avgLeadDays = Math.round(total / withLead.length);
  }

  return { onTimePct, avgLeadDays, closedCount: closed.length };
}


export function formatDeliveredAt(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function formatDueYmd(ymd: string | null): string | null {
  if (!ymd) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(ymd);
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function projectWeightAssigned(rows: DeliverableTrackerRow[], projectId: string): number {
  return rows.filter((r) => r.projectId === projectId).reduce((sum, r) => sum + r.weight, 0);
}
