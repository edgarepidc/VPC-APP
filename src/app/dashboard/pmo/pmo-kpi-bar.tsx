import Link from "next/link";

import { KpiTile, dashKpiTilesGrid } from "@/app/dashboard/_components/kpi-tile";
import {
  PMO_DELIVERABLES,
  PMO_ESCALATIONS,
  PMO_MEETINGS,
  PMO_PROJECTS,
  PMO_RISKS,
  PMO_STAKEHOLDERS,
  PMO_TEAM,
} from "@/lib/dashboard-paths";
import { dashKpiValue } from "@/lib/ui-classes";

import { PMO_KPI_HINTS } from "./pmo-field-hints";
import { PmoKpiLabel } from "./pmo-kpi-label";

type PmoKpiBarProps = {
  kpis: {
    projects: number;
    deliverables: number;
    overdueDeliverables: number;
    deliverableOnTimePct: number | null;
    deliverableAvgLeadDays: number | null;
    risks: number;
    criticalRisks: number;
    totalResidualVme: number;
    escalationChecks: number;
    meetingSessions: number;
    totalMeetingCostMxn: number;
    stakeholders: number;
  };
  formatMxn: (value: number) => string;
};

const linkValueClass = `${dashKpiValue} hover:underline`;

export function PmoKpiBar({ kpis, formatMxn }: PmoKpiBarProps) {
  return (
    <section className={dashKpiTilesGrid}>
      <KpiTile
        tone="slate"
        label={<PmoKpiLabel hint={PMO_KPI_HINTS.projects}>Proyectos</PmoKpiLabel>}
        value={
          <Link href={PMO_PROJECTS} className={linkValueClass}>
            {kpis.projects}
          </Link>
        }
        sub="activos en cartera"
      />
      <KpiTile
        tone={kpis.overdueDeliverables > 0 ? "rose" : "sky"}
        label={<PmoKpiLabel hint={PMO_KPI_HINTS.deliverables}>Entregables</PmoKpiLabel>}
        value={
          <Link href={PMO_DELIVERABLES} className={linkValueClass}>
            {kpis.deliverables}
          </Link>
        }
        sub={
          kpis.overdueDeliverables > 0 ? (
            <Link href={PMO_DELIVERABLES} className="text-rose-700 hover:underline">
              {kpis.overdueDeliverables} vencidos
            </Link>
          ) : (
            "0 vencidos"
          )
        }
      />
      <KpiTile
        tone="emerald"
        label={<PmoKpiLabel hint={PMO_KPI_HINTS.onTime}>A tiempo</PmoKpiLabel>}
        value={kpis.deliverableOnTimePct !== null ? `${kpis.deliverableOnTimePct}%` : "—"}
        valueClassName="text-emerald-700"
        sub="cierres con fecha"
      />
      <KpiTile
        tone="slate"
        label={<PmoKpiLabel hint={PMO_KPI_HINTS.leadTime}>Lead time</PmoKpiLabel>}
        value={kpis.deliverableAvgLeadDays !== null ? `${kpis.deliverableAvgLeadDays}d` : "—"}
        sub="registro → entrega"
      />
      <KpiTile
        tone={kpis.criticalRisks > 0 ? "amber" : "slate"}
        label={<PmoKpiLabel hint={PMO_KPI_HINTS.risks}>Riesgos</PmoKpiLabel>}
        value={
          <Link href={PMO_RISKS} className={linkValueClass}>
            {kpis.risks}
          </Link>
        }
        sub={
          kpis.criticalRisks > 0 ? (
            <Link href={PMO_RISKS} className="text-amber-800 hover:underline">
              {kpis.criticalRisks} críticos
            </Link>
          ) : (
            "0 críticos"
          )
        }
      />
      <KpiTile
        tone="red"
        label={<PmoKpiLabel hint={PMO_KPI_HINTS.residualVme}>Exposición residual</PmoKpiLabel>}
        value={formatMxn(kpis.totalResidualVme)}
        valueClassName="text-red-700"
        sub="VME en pesos"
      />
      <KpiTile
        tone="amber"
        label={<PmoKpiLabel hint={PMO_KPI_HINTS.escalations}>Escalamientos</PmoKpiLabel>}
        value={
          <Link href={PMO_ESCALATIONS} className={linkValueClass}>
            {kpis.escalationChecks}
          </Link>
        }
        sub="últimos 30 días"
      />
      <KpiTile
        tone="sky"
        label={<PmoKpiLabel hint={PMO_KPI_HINTS.meetings}>Reuniones</PmoKpiLabel>}
        value={
          <Link href={PMO_MEETINGS} className={linkValueClass}>
            {kpis.meetingSessions}
          </Link>
        }
        sub={`${formatMxn(kpis.totalMeetingCostMxn)} · 30 días`}
      />
      <KpiTile
        tone="emerald"
        label={<PmoKpiLabel hint={PMO_KPI_HINTS.stakeholders}>Interesados</PmoKpiLabel>}
        value={
          <Link href={PMO_STAKEHOLDERS} className={linkValueClass}>
            {kpis.stakeholders}
          </Link>
        }
        sub="registrados"
      />
      <KpiTile
        tone="accent"
        label={<PmoKpiLabel hint={PMO_KPI_HINTS.team}>Equipo</PmoKpiLabel>}
        value={
          <Link href={PMO_TEAM} className={`${linkValueClass} text-base`}>
            Gestionar
          </Link>
        }
        sub="accesos y roles"
      />
    </section>
  );
}
