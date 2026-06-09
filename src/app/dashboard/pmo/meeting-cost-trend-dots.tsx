import type { MeetingCostTrendDirection } from "@/lib/meeting-roi-utils";
import { COST_LEVEL_DOT } from "@/lib/meeting-roi-utils";

const DIRECTION_LABEL: Record<Exclude<MeetingCostTrendDirection, null>, string> = {
  up: "Costo subió",
  down: "Costo bajó",
  flat: "Estable",
};

type MeetingCostTrendDotsProps = {
  levels: string[];
  direction: MeetingCostTrendDirection;
};

export function MeetingCostTrendDots({ levels, direction }: MeetingCostTrendDotsProps) {
  if (levels.length === 0) {
    return <span className="text-xs text-slate-400">—</span>;
  }

  return (
    <span className="inline-flex items-center gap-1.5" title="Últimas sesiones (antigua → reciente)">
      <span className="inline-flex items-center gap-0.5">
        {levels.map((level, index) => (
          <span
            key={`${level}-${index}`}
            className={`h-2 w-2 rounded-full ${COST_LEVEL_DOT[level] ?? "bg-slate-300"}`}
            aria-hidden
          />
        ))}
      </span>
      {direction === "up" && (
        <span className="text-xs font-medium text-rose-600" aria-label="Tendencia: costo subió">
          ↑
        </span>
      )}
      {direction === "down" && (
        <span className="text-xs font-medium text-emerald-600" aria-label="Tendencia: costo bajó">
          ↓
        </span>
      )}
      {direction === "flat" && levels.length >= 2 && (
        <span className="text-xs text-slate-400" aria-label="Tendencia: estable">
          →
        </span>
      )}
      {direction && <span className="sr-only">{DIRECTION_LABEL[direction]}</span>}
    </span>
  );
}
