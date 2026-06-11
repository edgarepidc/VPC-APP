import Link from "next/link";

import {
  DELIVERABLES_HUB,
  PMO_ESCALATIONS,
  RISKS_HUB,
} from "@/lib/dashboard-paths";

export type PmoPortfolioAlertSummary = {
  escalationRed: number;
  escalationOrange: number;
  overdueDeliverables: number;
  criticalRisks: number;
  totalAttention: number;
};

export function buildPmoPortfolioAlertSummary(input: {
  projectHealth: { latestEscalationTier: string | null }[];
  overdueDeliverablesCount: number;
  criticalRisksCount: number;
}): PmoPortfolioAlertSummary {
  let escalationRed = 0;
  let escalationOrange = 0;
  for (const row of input.projectHealth) {
    if (row.latestEscalationTier === "red") escalationRed += 1;
    else if (row.latestEscalationTier === "orange") escalationOrange += 1;
  }
  const totalAttention =
    escalationRed + escalationOrange + input.overdueDeliverablesCount + input.criticalRisksCount;

  return {
    escalationRed,
    escalationOrange,
    overdueDeliverables: input.overdueDeliverablesCount,
    criticalRisks: input.criticalRisksCount,
    totalAttention,
  };
}

type PmoPortfolioAlertsBannerProps = {
  summary: PmoPortfolioAlertSummary;
};

export function PmoPortfolioAlertsBanner({ summary }: PmoPortfolioAlertsBannerProps) {
  if (summary.totalAttention === 0) {
    return (
      <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50/80 px-4 py-3 text-sm text-emerald-900">
        Portafolio estable: sin escalamientos en naranja/rojo ni entregables vencidos en tu alcance.
      </div>
    );
  }

  const chips: { label: string; className: string; href?: string }[] = [];

  if (summary.escalationRed > 0) {
    chips.push({
      label: `${summary.escalationRed} en rojo`,
      className: "border-rose-300 bg-rose-50 text-rose-900",
      href: PMO_ESCALATIONS,
    });
  }
  if (summary.escalationOrange > 0) {
    chips.push({
      label: `${summary.escalationOrange} en naranja`,
      className: "border-amber-300 bg-amber-50 text-amber-950",
      href: PMO_ESCALATIONS,
    });
  }
  if (summary.overdueDeliverables > 0) {
    chips.push({
      label: `${summary.overdueDeliverables} entregable${summary.overdueDeliverables !== 1 ? "s" : ""} vencido${summary.overdueDeliverables !== 1 ? "s" : ""}`,
      className: "border-rose-200 bg-white text-rose-800",
      href: DELIVERABLES_HUB,
    });
  }
  if (summary.criticalRisks > 0) {
    chips.push({
      label: `${summary.criticalRisks} riesgo${summary.criticalRisks !== 1 ? "s" : ""} crítico${summary.criticalRisks !== 1 ? "s" : ""}`,
      className: "border-amber-200 bg-white text-amber-950",
      href: RISKS_HUB,
    });
  }

  return (
    <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50/80 px-4 py-3.5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-amber-950">Atención en el portafolio</p>
          <p className="mt-0.5 text-xs text-amber-900/80">
            {summary.totalAttention} señal{summary.totalAttention !== 1 ? "es" : ""} activa
            {summary.totalAttention !== 1 ? "s" : ""} en tu alcance.
          </p>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {chips.map((chip) =>
          chip.href ? (
            <Link
              key={chip.label}
              href={chip.href}
              className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium transition hover:shadow-sm ${chip.className}`}
            >
              {chip.label}
            </Link>
          ) : (
            <span
              key={chip.label}
              className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium ${chip.className}`}
            >
              {chip.label}
            </span>
          ),
        )}
      </div>
    </div>
  );
}
