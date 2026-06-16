import type { ReactNode } from "react";

/** Valores en color sólido sobre tarjeta blanca (sin degradados). */
export const KPI_VALUE_TONES = {
  slate: "text-slate-900",
  emerald: "text-green-600",
  sky: "text-blue-600",
  rose: "text-red-600",
  amber: "text-orange-500",
  accent: "text-slate-800",
  blue: "text-blue-600",
  red: "text-red-600",
  purple: "text-violet-600",
} as const;

/** Barra lateral del chip — mismo color que el valor numérico. */
export const KPI_ACCENT_BG = {
  slate: "bg-slate-900",
  emerald: "bg-green-600",
  sky: "bg-blue-600",
  rose: "bg-red-600",
  amber: "bg-orange-500",
  accent: "bg-slate-800",
  blue: "bg-blue-600",
  red: "bg-red-600",
  purple: "bg-violet-600",
} as const;

export type KpiTileTone = keyof typeof KPI_VALUE_TONES;

export const KPI_CARD_BASE =
  "relative overflow-visible rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 pl-4 shadow-sm ring-1 ring-slate-200/80";

export const KPI_CARD_ACCENT =
  "pointer-events-none absolute inset-y-0 left-0 w-1 rounded-l-lg";

export const dashKpiTilesGrid =
  "grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5";

export function kpiValueClass(tone: KpiTileTone, extra = "") {
  return `text-2xl font-semibold tabular-nums leading-none ${KPI_VALUE_TONES[tone]} ${extra}`.trim();
}

export function kpiLinkClass(tone: KpiTileTone) {
  return `${kpiValueClass(tone)} hover:underline`;
}

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
  const valueColor = KPI_VALUE_TONES[tone];
  const resolvedValueClass = valueClassName || valueColor;

  return (
    <div className={`${KPI_CARD_BASE} ${className}`}>
      <span className={`${KPI_CARD_ACCENT} ${KPI_ACCENT_BG[tone]}`} aria-hidden />
      {typeof label === "string" ? (
        <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
          {label}
        </div>
      ) : (
        <div className="mb-1 text-[11px] font-medium text-slate-500">{label}</div>
      )}
      <div className={`text-2xl font-semibold tabular-nums leading-none ${resolvedValueClass}`}>
        {value}
      </div>
      {sub ? <div className="mt-1 text-[12px] leading-snug text-slate-500">{sub}</div> : null}
    </div>
  );
}

/** @deprecated use KPI_VALUE_TONES — kept for imports that referenced KPI_TILE_TONES */
export const KPI_TILE_TONES = KPI_VALUE_TONES;
