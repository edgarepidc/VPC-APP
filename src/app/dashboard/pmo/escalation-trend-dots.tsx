import type { EscalationTrendDirection } from "@/lib/escalation-utils";

const TIER_DOT: Record<string, string> = {
  green: "bg-emerald-500",
  orange: "bg-amber-400",
  red: "bg-rose-500",
};

const DIRECTION_LABEL: Record<Exclude<EscalationTrendDirection, null>, string> = {
  up: "Empeoró",
  down: "Mejoró",
  flat: "Estable",
};

type EscalationTrendDotsProps = {
  tiers: string[];
  direction: EscalationTrendDirection;
};

export function EscalationTrendDots({ tiers, direction }: EscalationTrendDotsProps) {
  if (tiers.length === 0) {
    return <span className="text-xs text-slate-400">—</span>;
  }

  return (
    <span className="inline-flex items-center gap-1.5" title="Últimas evaluaciones (antigua → reciente)">
      <span className="inline-flex items-center gap-0.5">
        {tiers.map((tier, index) => (
          <span
            key={`${tier}-${index}`}
            className={`h-2 w-2 rounded-full ${TIER_DOT[tier] ?? "bg-slate-300"}`}
            aria-hidden
          />
        ))}
      </span>
      {direction === "up" && (
        <span className="text-xs font-medium text-rose-600" aria-label="Tendencia: empeoró">
          ↑
        </span>
      )}
      {direction === "down" && (
        <span className="text-xs font-medium text-emerald-600" aria-label="Tendencia: mejoró">
          ↓
        </span>
      )}
      {direction === "flat" && tiers.length >= 2 && (
        <span className="text-xs text-slate-400" aria-label="Tendencia: estable">
          →
        </span>
      )}
      {direction && (
        <span className="sr-only">{DIRECTION_LABEL[direction]}</span>
      )}
    </span>
  );
}
