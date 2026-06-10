import type { ReactNode } from "react";

export const KPI_TILE_TONES = {
  slate: "border-slate-200 bg-gradient-to-br from-slate-50 to-white",
  emerald: "border-emerald-200/80 bg-gradient-to-br from-emerald-50/90 to-white",
  sky: "border-sky-200/80 bg-gradient-to-br from-sky-50/90 to-white",
  rose: "border-rose-200/80 bg-gradient-to-br from-rose-50/90 to-white",
  amber: "border-amber-200/80 bg-gradient-to-br from-amber-50/90 to-white",
  accent:
    "border-slate-300 bg-gradient-to-br from-slate-100 to-white ring-1 ring-slate-200/80",
  blue: "border-blue-200/80 bg-gradient-to-br from-blue-50/90 to-white",
  red: "border-red-200/80 bg-gradient-to-br from-red-50/90 to-white",
} as const;

export type KpiTileTone = keyof typeof KPI_TILE_TONES;

export const dashKpiTilesGrid =
  "grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5";

type KpiTileProps = {
  label: ReactNode;
  value: ReactNode;
  sub?: ReactNode;
  tone: KpiTileTone;
  valueClassName?: string;
  className?: string;
};

export function KpiTile({
  label,
  value,
  sub,
  tone,
  valueClassName = "",
  className = "",
}: KpiTileProps) {
  return (
    <div className={`rounded-lg border px-3.5 py-2.5 ${KPI_TILE_TONES[tone]} ${className}`}>
      <div className="mb-1 text-xs font-medium text-slate-600">{label}</div>
      <div
        className={`text-lg font-semibold tabular-nums leading-none text-slate-900 ${valueClassName}`}
      >
        {value}
      </div>
      {sub ? <div className="mt-1 text-xs text-slate-500">{sub}</div> : null}
    </div>
  );
}
