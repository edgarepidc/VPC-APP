import { notFound, redirect } from "next/navigation";

import { getSessionUser } from "@/lib/auth/session";
import { getSessionProjectIdsFilter } from "@/lib/project-scope";
import { requireTenantId } from "@/lib/tenancy";
import {
  ESCALATION_INDICATOR_KEYS,
  getEscalationTierBadge,
  parseEscalationActions,
  parseEscalationIndicators,
} from "@/lib/escalation-utils";
import {
  getIndicatorLabel,
  getIndicatorLevelLabel,
} from "@/lib/escalation-indicators";
import { getEscalationCheckById } from "@/modules/escalations/service";

import { PrintReportButton } from "../print-report-button";

type ReportPageProps = {
  params: Promise<{ id: string }>;
};

export default async function EscalationReportPage({ params }: ReportPageProps) {
  const { id } = await params;
  const session = await getSessionUser();
  if (!session) redirect("/login");
  const tenantId = await requireTenantId();
  const projectIdsFilter = await getSessionProjectIdsFilter(session, tenantId);

  const check = await getEscalationCheckById(tenantId, id, {
    restrictToProjectIds: projectIdsFilter,
  });
  if (!check) notFound();

  const badge = getEscalationTierBadge(check.tier);
  const indicators = parseEscalationIndicators(check.indicators);
  const actions = parseEscalationActions(check.actions);
  const dateLabel = check.createdAt.toLocaleString("es-MX", {
    dateStyle: "long",
    timeStyle: "short",
  });

  return (
    <div className="min-h-screen bg-white px-8 py-10 text-slate-900 print:p-0">
      <style>{`
        @media print {
          @page { margin: 18mm; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      `}</style>

      <div className="mx-auto max-w-3xl">
        <div className="mb-6 flex flex-wrap items-start justify-between gap-4 print:mb-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Reporte de escalamiento · VPC
            </p>
            <h1 className="mt-1 text-2xl font-semibold">{check.project.name}</h1>
            {check.topic ? <p className="text-slate-600">{check.topic}</p> : null}
          </div>
          <PrintReportButton />
        </div>

        <div className="rounded-lg border border-slate-200 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-medium">{check.title}</p>
            <span className={badge.className}>{badge.label}</span>
          </div>
          <p className="mt-1 text-sm text-slate-600">
            {check.levelLabel} · {dateLabel}
          </p>
        </div>

        <section className="mt-6">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">
            Indicadores evaluados
          </h2>
          <table className="mt-2 w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs text-slate-500">
                <th className="py-2">Dimensión</th>
                <th className="py-2">Nivel</th>
              </tr>
            </thead>
            <tbody>
              {ESCALATION_INDICATOR_KEYS.map((key) => (
                <tr key={key} className="border-b border-slate-100">
                  <td className="py-2">{getIndicatorLabel(key)}</td>
                  <td className="py-2">{getIndicatorLevelLabel(indicators[key] ?? "low")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="mt-6">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">
            Acciones recomendadas
          </h2>
          <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-slate-800">
            {actions.map((action) => (
              <li key={action}>{action}</li>
            ))}
          </ol>
        </section>

        <p className="mt-10 text-xs text-slate-400 print:mt-8">
          Generado desde el Escalómetro de Proyectos · Herramienta de gobernanza PMO
        </p>
      </div>
    </div>
  );
}
