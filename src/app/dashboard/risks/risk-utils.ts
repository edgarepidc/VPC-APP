/** Niveles y score alineados con la herramienta RiskCommand (risk-manager.html). */

export function p2l(p: number) {
  return Math.max(1, Math.min(5, Math.ceil(p / 20)));
}

export function i2l(impactUsd: number) {
  if (impactUsd <= 10_000) return 1;
  if (impactUsd <= 50_000) return 2;
  if (impactUsd <= 200_000) return 3;
  if (impactUsd <= 1_000_000) return 4;
  return 5;
}

export function grossScore(probability: number, impactUsd: number) {
  return p2l(probability) * i2l(impactUsd);
}

export function residualScore(residualProb: number, impactUsd: number) {
  return p2l(residualProb) * i2l(impactUsd);
}

export function vmeGross(probability: number, impactUsd: number) {
  return (probability / 100) * impactUsd;
}

export function vmeResidual(residualProb: number, impactUsd: number) {
  return (residualProb / 100) * impactUsd;
}

export function fmtMoneyUSD(n: number) {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

export function scoreBadgeClass(score: number) {
  if (score <= 4) return "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200";
  if (score <= 9) return "bg-amber-50 text-amber-800 ring-1 ring-amber-200";
  if (score <= 15) return "bg-orange-50 text-orange-700 ring-1 ring-orange-200";
  return "bg-red-50 text-red-700 ring-1 ring-red-200";
}

export function scoreBarColor(score: number) {
  if (score <= 4) return "bg-emerald-500";
  if (score <= 9) return "bg-amber-500";
  if (score <= 15) return "bg-orange-500";
  return "bg-red-500";
}

const HM_BG = [
  "#dcfce7",
  "#bbf7d0",
  "#86efac",
  "#fef9c3",
  "#fde68a",
  "#fed7aa",
  "#fdba74",
  "#fecaca",
  "#fca5a5",
  "#f87171",
];
const HM_FG = [
  "#166534",
  "#166534",
  "#14532d",
  "#713f12",
  "#78350f",
  "#7c2d12",
  "#7c2d12",
  "#7f1d1d",
  "#7f1d1d",
  "#7f1d1d",
];

export function heatmapTone(score: number) {
  const idx = Math.min(Math.max(Math.ceil(score / 2.5) - 1, 0), 9);
  return { bg: HM_BG[idx], fg: HM_FG[idx] };
}

export const RISK_CATEGORIES = [
  "Técnico",
  "Proveedor",
  "Recursos Humanos",
  "Seguridad",
  "Regulatorio",
  "Financiero",
  "Operacional",
] as const;
