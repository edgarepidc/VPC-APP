"use client";

import type { ReactNode } from "react";

import { KpiTile } from "@/app/dashboard/_components/kpi-tile";

import { ESCALOMETRO_KPI_HINTS } from "./escalometro-field-hints";
import { EscalometroKpiLabel } from "./escalometro-field-label";
import type { EscalationTierFilter } from "./escalation-filter-utils";

const escalometroKpiGrid =
  "grid grid-cols-2 gap-1.5 min-[640px]:grid-cols-4 min-[640px]:gap-2";

const escalometroKpiTileClass = "!px-2 !py-1.5 !pl-2.5 min-w-0";
const escalometroKpiValueClass = "!text-xl";

function ClickableKpi({
  active,
  onClick,
  children,
}: {
  active?: boolean;
  onClick?: () => void;
  children: ReactNode;
}) {
  if (!onClick) return <>{children}</>;
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full rounded-lg text-left transition ${
        active ? "ring-2 ring-slate-800 ring-offset-1" : "hover:ring-1 hover:ring-slate-300"
      }`}
    >
      {children}
    </button>
  );
}

type EscalationTierKpiGridProps = {
  kpis: { total: number; green: number; orange: number; red: number };
  tierFilter: EscalationTierFilter | "";
  onClearTier: () => void;
  onToggleTier: (tier: EscalationTierFilter) => void;
};

export function EscalationTierKpiGrid({
  kpis,
  tierFilter,
  onClearTier,
  onToggleTier,
}: EscalationTierKpiGridProps) {
  return (
    <div className={escalometroKpiGrid}>
      <ClickableKpi active={!tierFilter} onClick={onClearTier}>
        <KpiTile
          tone="slate"
          className={escalometroKpiTileClass}
          valueClassName={escalometroKpiValueClass}
          label={
            <EscalometroKpiLabel hint={ESCALOMETRO_KPI_HINTS.total} compact>
              Evaluaciones
            </EscalometroKpiLabel>
          }
          value={kpis.total}
        />
      </ClickableKpi>
      <ClickableKpi active={tierFilter === "green"} onClick={() => onToggleTier("green")}>
        <KpiTile
          tone="emerald"
          className={escalometroKpiTileClass}
          valueClassName={escalometroKpiValueClass}
          label={
            <EscalometroKpiLabel hint={ESCALOMETRO_KPI_HINTS.green} compact>
              Verde
            </EscalometroKpiLabel>
          }
          value={kpis.green}
        />
      </ClickableKpi>
      <ClickableKpi active={tierFilter === "orange"} onClick={() => onToggleTier("orange")}>
        <KpiTile
          tone="amber"
          className={escalometroKpiTileClass}
          valueClassName={escalometroKpiValueClass}
          label={
            <EscalometroKpiLabel hint={ESCALOMETRO_KPI_HINTS.orange} compact>
              Naranja
            </EscalometroKpiLabel>
          }
          value={kpis.orange}
        />
      </ClickableKpi>
      <ClickableKpi active={tierFilter === "red"} onClick={() => onToggleTier("red")}>
        <KpiTile
          tone="rose"
          className={escalometroKpiTileClass}
          valueClassName={escalometroKpiValueClass}
          label={
            <EscalometroKpiLabel hint={ESCALOMETRO_KPI_HINTS.red} compact>
              Rojo
            </EscalometroKpiLabel>
          }
          value={kpis.red}
        />
      </ClickableKpi>
    </div>
  );
}
