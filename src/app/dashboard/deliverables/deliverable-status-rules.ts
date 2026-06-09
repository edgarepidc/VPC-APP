import {
  DELIVERABLE_STATUS_LABEL,
  isDeliverableDoneStatus,
  normalizeDeliverableStatus,
  type DeliverableStatus,
} from "@/modules/deliverables/constants";

import type { DeliverableTrackerRow } from "./deliverables-tracker";

const ALLOWED: Record<DeliverableStatus, DeliverableStatus[]> = {
  pending: ["review", "rejected"],
  review: ["pending", "approved", "rejected"],
  approved: ["review", "delivered"],
  rejected: ["pending", "review"],
  delivered: ["approved"],
};

export function canTransitionStatus(from: string, to: DeliverableStatus): boolean {
  const f = normalizeDeliverableStatus(from);
  return ALLOWED[f].includes(to);
}

export function statusBlockReason(
  row: DeliverableTrackerRow,
  target: DeliverableStatus,
  rowById: Map<string, DeliverableTrackerRow>,
): string | null {
  const current = normalizeDeliverableStatus(row.status);
  if (current === target) return null;
  if (!canTransitionStatus(current, target)) {
    return `No se puede pasar de ${DELIVERABLE_STATUS_LABEL[current]} a ${DELIVERABLE_STATUS_LABEL[target]}.`;
  }
  if (
    (target === "approved" || target === "delivered") &&
    row.dependsOnId
  ) {
    const dep = rowById.get(row.dependsOnId);
    if (dep && !isDeliverableDoneStatus(dep.status)) {
      return `Completa primero «${dep.title}».`;
    }
  }
  return null;
}

export function approveNeedsAcuseConfirm(row: DeliverableTrackerRow): boolean {
  if (row.acuses.length === 0) return false;
  return row.acuses.some((a) => !a.ok);
}
