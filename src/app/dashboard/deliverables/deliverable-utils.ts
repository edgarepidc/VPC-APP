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

export function buildDeliverableActionItems(
  rows: DeliverableTrackerRow[],
  rowById: Map<string, DeliverableTrackerRow>,
): DeliverableActionItem[] {
  const items: DeliverableActionItem[] = [];

  for (const row of rows) {
    const st = normalizeDeliverableStatus(row.status);
    const df = daysFromDue(row.dueDate, row.status);

    if (df !== null && df < 0) {
      items.push({
        id: `${row.id}-overdue`,
        kind: "overdue",
        label: `Vencido · ${row.title}`,
        row,
      });
      continue;
    }

    if (row.dependsOnId) {
      const dep = rowById.get(row.dependsOnId);
      if (dep && !isDeliverableDoneStatus(dep.status)) {
        items.push({
          id: `${row.id}-blocked`,
          kind: "blocked",
          label: `Bloqueado · ${row.title}`,
          row,
        });
      }
    }

    if (df !== null && df >= 0 && df <= 5) {
      items.push({
        id: `${row.id}-due`,
        kind: "due_soon",
        label: `Vence pronto · ${row.title}`,
        row,
      });
    }

    if (st === "review") {
      items.push({
        id: `${row.id}-review`,
        kind: "review",
        label: `En revisión · ${row.title}`,
        row,
      });
    }

    const pendingAcuses = row.acuses.filter((a) => !a.ok).length;
    if (pendingAcuses > 0 && !isDeliverableDoneStatus(st)) {
      items.push({
        id: `${row.id}-acuse`,
        kind: "acuse_pending",
        label: `Acuses pendientes · ${row.title}`,
        row,
      });
    }
  }

  const rank: Record<DeliverableActionKind, number> = {
    overdue: 0,
    blocked: 1,
    due_soon: 2,
    review: 3,
    acuse_pending: 4,
  };

  return items.sort((a, b) => rank[a.kind] - rank[b.kind]).slice(0, 12);
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
