import type { EscalationIndicators, EscalationTier } from "@/modules/escalations/service";

export const ESCALATION_INDICATOR_KEYS = [
  "budget",
  "schedule",
  "team",
  "scope",
  "stakeholders",
  "impact",
] as const;

export const ESCALATION_INDICATOR_SHORT: Record<string, string> = {
  budget: "P$",
  schedule: "CR",
  team: "EQ",
  scope: "AL",
  stakeholders: "ST",
  impact: "IM",
};

export function getEscalationTierBadge(tier: EscalationTier | string) {
  switch (tier) {
    case "green":
      return { label: "Verde", className: "pmo-badge pmo-badge--green" };
    case "orange":
      return { label: "Naranja", className: "pmo-badge pmo-badge--yellow" };
    case "red":
      return { label: "Rojo", className: "pmo-badge pmo-badge--red" };
    default:
      return { label: tier, className: "pmo-badge" };
  }
}

export function getIndicatorLevelClass(level: string) {
  if (level === "high") return "bg-rose-500";
  if (level === "medium") return "bg-amber-400";
  return "bg-emerald-500";
}

export function parseEscalationIndicators(value: unknown): EscalationIndicators {
  if (!value || typeof value !== "object") return {};
  return value as EscalationIndicators;
}

export function parseEscalationActions(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

export function tierSortWeight(tier: string) {
  if (tier === "red") return 0;
  if (tier === "orange") return 1;
  return 2;
}

export function formatRelativeDate(date: Date) {
  const diffMs = Date.now() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays <= 0) return "Hoy";
  if (diffDays === 1) return "Ayer";
  if (diffDays < 7) return `Hace ${diffDays} días`;
  return date.toLocaleDateString("es-MX", { day: "numeric", month: "short" });
}
