export const DELIVERABLE_STATUSES = [
  "pending",
  "review",
  "approved",
  "rejected",
  "delivered",
] as const;

export type DeliverableStatus = (typeof DELIVERABLE_STATUSES)[number];

export const DELIVERABLE_STATUS_LABEL: Record<DeliverableStatus, string> = {
  pending: "Pendiente",
  review: "En revisión",
  approved: "Aprobado",
  rejected: "Rechazado",
  delivered: "Entregado",
};

/** Avance ponderado: peso completado. */
export function isDeliverableDoneStatus(status: string): boolean {
  return status === "approved" || status === "delivered";
}

export function normalizeDeliverableStatus(raw: string): DeliverableStatus {
  const s = raw.trim().toLowerCase();
  if (DELIVERABLE_STATUSES.includes(s as DeliverableStatus)) return s as DeliverableStatus;
  if (s === "in_progress") return "review";
  return "pending";
}

export const STATUS_LOG_COLORS: Record<DeliverableStatus, string> = {
  pending: "#888780",
  review: "#378ADD",
  approved: "#639922",
  rejected: "#E24B4A",
  delivered: "#534AB7",
};
