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

/** Marco de tarjeta acorde al semáforo del Escalómetro. */
export function getEscalationTierCardClass(tier: EscalationTier | string) {
  switch (tier) {
    case "green":
      return "border-2 border-emerald-400 bg-white hover:border-emerald-500";
    case "orange":
      return "border-2 border-amber-400 bg-white hover:border-amber-500";
    case "red":
      return "border-2 border-rose-500 bg-white hover:border-rose-600";
    default:
      return "border border-slate-200 bg-white hover:border-slate-300";
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

export function formatEscalationDateTime(date: Date) {
  return date.toLocaleString("es-MX", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function tierNumeric(tier: string) {
  if (tier === "red") return 2;
  if (tier === "orange") return 1;
  return 0;
}

export type EscalationTrendDirection = "up" | "down" | "flat" | null;

export function computeEscalationTrend(tiersChronological: string[]): {
  tiers: string[];
  direction: EscalationTrendDirection;
} {
  const tiers = tiersChronological.slice(-5);
  if (tiers.length < 2) {
    return { tiers, direction: null };
  }
  const latest = tierNumeric(tiers[tiers.length - 1]!);
  const previous = tierNumeric(tiers[tiers.length - 2]!);
  if (latest > previous) return { tiers, direction: "up" };
  if (latest < previous) return { tiers, direction: "down" };
  return { tiers, direction: "flat" };
}

export function buildEscalationTrendsByProject(
  checks: Array<{ projectId: string; tier: string; createdAt: Date }>,
): Map<string, { tiers: string[]; direction: EscalationTrendDirection }> {
  const grouped = new Map<string, Array<{ tier: string; createdAt: Date }>>();
  for (const check of checks) {
    const list = grouped.get(check.projectId) ?? [];
    list.push({ tier: check.tier, createdAt: check.createdAt });
    grouped.set(check.projectId, list);
  }

  const result = new Map<string, { tiers: string[]; direction: EscalationTrendDirection }>();
  for (const [projectId, list] of grouped) {
    const chronological = [...list].sort(
      (a, b) => a.createdAt.getTime() - b.createdAt.getTime(),
    );
    result.set(
      projectId,
      computeEscalationTrend(chronological.map((item) => item.tier)),
    );
  }
  return result;
}
