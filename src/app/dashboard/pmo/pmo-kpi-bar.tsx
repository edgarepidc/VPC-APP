import Link from "next/link";

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

export function PmoKpiBar({ kpis, formatMxn }: PmoKpiBarProps) {
  return (
    <section className="grid grid-cols-2 gap-3 rounded-lg border border-slate-200 bg-white px-3 py-3 text-sm sm:flex sm:flex-wrap sm:gap-6 sm:px-4">
      <div>
        <PmoKpiLabel hint={PMO_KPI_HINTS.projects}>Proyectos</PmoKpiLabel>
        <Link href={PMO_PROJECTS} className={`${dashKpiValue} hover:underline`}>
          {kpis.projects}
        </Link>
      </div>
      <div>
        <PmoKpiLabel hint={PMO_KPI_HINTS.deliverables}>Entregables</PmoKpiLabel>
        <Link href={PMO_DELIVERABLES} className={`${dashKpiValue} hover:underline`}>
          {kpis.deliverables}
        </Link>
        {kpis.overdueDeliverables > 0 ? (
          <Link href={PMO_DELIVERABLES} className="text-xs text-rose-700 hover:underline">
            {kpis.overdueDeliverables} vencidos
          </Link>
        ) : (
          <p className="text-xs text-slate-500">0 vencidos</p>
        )}
      </div>
      <div>
        <PmoKpiLabel hint={PMO_KPI_HINTS.onTime}>A tiempo</PmoKpiLabel>
        <p className={dashKpiValue}>
          {kpis.deliverableOnTimePct !== null ? `${kpis.deliverableOnTimePct}%` : "—"}
        </p>
        <p className="text-xs text-slate-500">cierres con fecha</p>
      </div>
      <div>
        <PmoKpiLabel hint={PMO_KPI_HINTS.leadTime}>Lead time</PmoKpiLabel>
        <p className={dashKpiValue}>
          {kpis.deliverableAvgLeadDays !== null ? `${kpis.deliverableAvgLeadDays}d` : "—"}
        </p>
        <p className="text-xs text-slate-500">registro → entrega</p>
      </div>
      <div>
        <PmoKpiLabel hint={PMO_KPI_HINTS.risks}>Riesgos</PmoKpiLabel>
        <Link href={PMO_RISKS} className={`${dashKpiValue} hover:underline`}>
          {kpis.risks}
        </Link>
        {kpis.criticalRisks > 0 ? (
          <Link href={PMO_RISKS} className="text-xs text-amber-700 hover:underline">
            {kpis.criticalRisks} críticos
          </Link>
        ) : (
          <p className="text-xs text-slate-500">0 críticos</p>
        )}
      </div>
      <div>
        <PmoKpiLabel hint={PMO_KPI_HINTS.residualVme}>Exposición residual</PmoKpiLabel>
        <p className={dashKpiValue}>{formatMxn(kpis.totalResidualVme)}</p>
        <p className="text-xs text-slate-500">VME en pesos</p>
      </div>
      <div>
        <PmoKpiLabel hint={PMO_KPI_HINTS.escalations}>Escalamientos</PmoKpiLabel>
        <Link href={PMO_ESCALATIONS} className={`${dashKpiValue} hover:underline`}>
          {kpis.escalationChecks}
        </Link>
        <p className="text-xs text-slate-500">últimos 30 días</p>
      </div>
      <div>
        <PmoKpiLabel hint={PMO_KPI_HINTS.meetings}>Reuniones</PmoKpiLabel>
        <Link href={PMO_MEETINGS} className={`${dashKpiValue} hover:underline`}>
          {kpis.meetingSessions}
        </Link>
        <p className="text-xs text-slate-500">
          {formatMxn(kpis.totalMeetingCostMxn)} · 30 días
        </p>
      </div>
      <div>
        <PmoKpiLabel hint={PMO_KPI_HINTS.stakeholders}>Interesados</PmoKpiLabel>
        <Link href={PMO_STAKEHOLDERS} className={`${dashKpiValue} hover:underline`}>
          {kpis.stakeholders}
        </Link>
      </div>
      <div>
        <PmoKpiLabel hint={PMO_KPI_HINTS.team}>Equipo</PmoKpiLabel>
        <Link href={PMO_TEAM} className={`${dashKpiValue} hover:underline`}>
          Gestionar
        </Link>
      </div>
    </section>
  );
}
