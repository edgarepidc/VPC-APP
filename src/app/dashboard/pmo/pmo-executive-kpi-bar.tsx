import Link from "next/link";

import { KpiTile } from "@/app/dashboard/_components/kpi-tile";
import {
  PMO_DELIVERABLES,
  PMO_ESCALATIONS,
  PMO_PROJECTS,
  PMO_RISKS,
} from "@/lib/dashboard-paths";

import { PMO_KPI_HINTS } from "./pmo-field-hints";
import { PmoKpiLabel } from "./pmo-kpi-label";

type PmoExecutiveKpiBarProps = {
  kpis: {
    projects: number;
    deliverables: number;
    overdueDeliverables: number;
    deliverableOnTimePct: number | null;
    risks: number;
    criticalRisks: number;
    escalationChecks: number;
    portfolioProgressPct: number;
  };
};

const pmoKpiGrid = "grid grid-cols-3 gap-1.5 min-[720px]:grid-cols-6 min-[720px]:gap-2";
const pmoKpiTileClass = "!px-2 !py-1.5 !pl-2.5 min-w-0";
const pmoKpiValueClass = "!text-xl";

const linkValueClass = (tone: "slate" | "rose" | "sky" | "amber" | "emerald") =>
  `text-xl font-semibold tabular-nums leading-none hover:underline ${
    tone === "slate"
      ? "text-slate-900"
      : tone === "rose"
        ? "text-red-600"
        : tone === "sky"
          ? "text-blue-600"
          : tone === "amber"
            ? "text-orange-500"
            : "text-green-600"
  }`;

export function PmoExecutiveKpiBar({ kpis }: PmoExecutiveKpiBarProps) {
  return (
    <section className={pmoKpiGrid}>
      <KpiTile
        tone="slate"
        className={pmoKpiTileClass}
        valueClassName={pmoKpiValueClass}
        label={
          <PmoKpiLabel hint={PMO_KPI_HINTS.projects} compact>
            Iniciativas
          </PmoKpiLabel>
        }
        value={
          <Link href={PMO_PROJECTS} className={linkValueClass("slate")}>
            {kpis.projects}
          </Link>
        }
      />
      <KpiTile
        tone={kpis.overdueDeliverables > 0 ? "rose" : "sky"}
        className={pmoKpiTileClass}
        valueClassName={pmoKpiValueClass}
        label={
          <PmoKpiLabel hint={PMO_KPI_HINTS.deliverables} compact>
            Entregables
          </PmoKpiLabel>
        }
        value={
          <Link
            href={PMO_DELIVERABLES}
            className={linkValueClass(kpis.overdueDeliverables > 0 ? "rose" : "sky")}
          >
            {kpis.deliverables}
          </Link>
        }
        sub={
          kpis.overdueDeliverables > 0 ? (
            <span className="text-[11px] text-rose-700">{kpis.overdueDeliverables} vencidos</span>
          ) : (
            <span className="text-[11px] text-slate-500">Al día</span>
          )
        }
      />
      <KpiTile
        tone="emerald"
        className={pmoKpiTileClass}
        valueClassName={pmoKpiValueClass}
        label={
          <PmoKpiLabel hint={PMO_KPI_HINTS.onTime} compact>
            A tiempo
          </PmoKpiLabel>
        }
        value={kpis.deliverableOnTimePct !== null ? `${kpis.deliverableOnTimePct}%` : "—"}
      />
      <KpiTile
        tone={kpis.criticalRisks > 0 ? "amber" : "slate"}
        className={pmoKpiTileClass}
        valueClassName={pmoKpiValueClass}
        label={
          <PmoKpiLabel hint={PMO_KPI_HINTS.risks} compact>
            Riesgos
          </PmoKpiLabel>
        }
        value={
          <Link
            href={PMO_RISKS}
            className={linkValueClass(kpis.criticalRisks > 0 ? "amber" : "slate")}
          >
            {kpis.risks}
          </Link>
        }
        sub={
          kpis.criticalRisks > 0 ? (
            <span className="text-[11px] text-amber-800">{kpis.criticalRisks} críticos</span>
          ) : (
            <span className="text-[11px] text-slate-500">Sin críticos</span>
          )
        }
      />
      <KpiTile
        tone="amber"
        className={pmoKpiTileClass}
        valueClassName={pmoKpiValueClass}
        label={
          <PmoKpiLabel hint={PMO_KPI_HINTS.escalations} compact>
            Escalamientos
          </PmoKpiLabel>
        }
        value={
          <Link href={PMO_ESCALATIONS} className={linkValueClass("amber")}>
            {kpis.escalationChecks}
          </Link>
        }
        sub={<span className="text-[11px] text-slate-500">30 días</span>}
      />
      <KpiTile
        tone="emerald"
        className={pmoKpiTileClass}
        valueClassName={pmoKpiValueClass}
        label={
          <PmoKpiLabel hint={PMO_KPI_HINTS.portfolioProgress} compact>
            Avance
          </PmoKpiLabel>
        }
        value={`${kpis.portfolioProgressPct}%`}
        sub={<span className="text-[11px] text-slate-500">portafolio</span>}
      />
    </section>
  );
}
