"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";

import type { RiskFormPrefill } from "@/lib/escalation-risk-prefill";
import { DELIVERABLE_DETAIL_IN_PROJECT, DELIVERABLES_PROJECT } from "@/lib/dashboard-paths";

import {
  dashAlertWarn,
  dashCard,
  dashKpiGrid,
  dashKpiLabel,
  dashKpiValue,
  dashSectionTitle,
  uiInput,
  uiLabel,
} from "@/lib/ui-classes";

import { CreateRiskModal } from "./create-risk-modal";
import {
  fmtMoneyMxn,
  grossScore,
  heatmapTone,
  i2l,
  p2l,
  residualScore,
  scoreBadgeClass,
  scoreBarColor,
  vmeGross,
  vmeResidual,
} from "./risk-utils";
import { buildRiskActionItems } from "./risk-action-utils";
import { RISK_KPI_HINTS } from "./risk-field-hints";
import { RiskKpiLabel } from "./risk-field-label";
import { RisksActionQueue } from "./risks-action-queue";

export type RiskClientRow = {
  id: string;
  title: string;
  category: string;
  ownerName: string;
  probability: number;
  residualProb: number;
  impactAmount: number;
  mitigation: string | null;
  contingency: string | null;
  trigger: string | null;
  dueDate: string | null;
  project: { id: string; name: string };
  deliverable: { id: string; title: string } | null;
};

type RiskManagerViewProps = {
  risks: RiskClientRow[];
  projects: { id: string; name: string }[];
  deliverables: { id: string; title: string; projectId: string }[];
  canEdit: boolean;
  prefill?: RiskFormPrefill | null;
  initial?: { id?: string; project?: string; q?: string };
  createAction: (formData: FormData) => void | Promise<void>;
  deleteAction: (formData: FormData) => void | Promise<void>;
};

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function HeatmapBlock({
  label,
  before,
  risks,
}: {
  label: string;
  before: boolean;
  risks: RiskClientRow[];
}) {
  const rows = useMemo(() => {
    const out: { pl: number; il: number; count: number; score: number }[][] = [];
    for (let pi = 0; pi < 5; pi++) {
      const pl = 5 - pi;
      const row: { pl: number; il: number; count: number; score: number }[] = [];
      for (let il = 1; il <= 5; il++) {
        const count = risks.filter((r) => {
          const rp = before ? p2l(r.probability) : p2l(r.residualProb);
          return rp === pl && i2l(r.impactAmount) === il;
        }).length;
        row.push({ pl, il, count, score: pl * il });
      }
      out.push(row);
    }
    return out;
  }, [risks, before]);

  return (
    <div className="mx-auto w-full max-w-[380px]">
      <p className={`mb-2.5 ${uiLabel}`}>{label}</p>
      <div className="flex gap-1.5">
        <div
          className="flex items-center pb-5 text-[10px] font-medium text-slate-400"
          style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}
        >
          Prob.
        </div>
        <div>
          <div className="flex gap-1">
            <div className="grid shrink-0 grid-rows-5 gap-1 py-0 pr-1.5 text-[10px] leading-none text-slate-400">
              {[5, 4, 3, 2, 1].map((n) => (
                <div key={n} className="flex h-12 w-4 items-center justify-end">
                  {n}
                </div>
              ))}
            </div>
            <div>
              <div className="grid grid-cols-5 gap-1">
                {rows.flatMap((row) =>
                  row.map(({ pl, il, count, score }) => {
                    const { bg, fg } = heatmapTone(score);
                    return (
                      <div
                        key={`${pl}-${il}-${before}`}
                        title={`Score ${score} · Prob.${pl} × Imp.${il}${count ? ` · ${count} riesgo(s)` : ""}`}
                        className="flex h-12 w-12 items-center justify-center rounded-md transition-transform hover:z-[1] hover:scale-110"
                        style={{ backgroundColor: bg, color: fg }}
                      >
                        {count > 0 ? (
                          <span
                            className="flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold"
                            style={{ backgroundColor: `${fg}28`, color: fg }}
                          >
                            {count}
                          </span>
                        ) : null}
                      </div>
                    );
                  }),
                )}
              </div>
              <div className="mt-1 grid grid-cols-5 gap-1 text-center text-[10px] text-slate-400">
                {[1, 2, 3, 4, 5].map((n) => (
                  <span key={n} className="w-12">
                    {n}
                  </span>
                ))}
              </div>
              <p className={`mt-1 text-center ${uiLabel}`}>Impacto</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function RiskManagerView({
  risks,
  projects,
  deliverables,
  canEdit,
  prefill = null,
  initial,
  createAction,
  deleteAction,
}: RiskManagerViewProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const rowRefs = useRef<Map<string, HTMLElement>>(new Map());
  const [detailId, setDetailId] = useState<string | null>(initial?.id ?? null);
  const [focusId, setFocusId] = useState<string | null>(initial?.id ?? null);
  const [projectFilter, setProjectFilter] = useState(initial?.project ?? "");
  const [q, setQ] = useState(initial?.q ?? "");
  const [createOpen, setCreateOpen] = useState(false);
  const [memoOpen, setMemoOpen] = useState(false);

  function syncUrl(patch: Record<string, string | null>) {
    const p = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(patch)) {
      if (value) p.set(key, value);
      else p.delete(key);
    }
    const qs = p.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  function openDetail(id: string) {
    setDetailId(id);
    setFocusId(id);
    syncUrl({ id });
    requestAnimationFrame(() => {
      rowRefs.current.get(id)?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    });
  }

  function closeDetail() {
    setDetailId(null);
    setFocusId(null);
    syncUrl({ id: null });
  }

  useEffect(() => {
    if (!prefill || !canEdit) return;
    setCreateOpen(true);
  }, [prefill, canEdit]);

  useEffect(() => {
    if (initial?.id && risks.some((r) => r.id === initial.id)) {
      openDetail(initial.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- deep link once
  }, [initial?.id, risks]);

  useEffect(() => {
    syncUrl({
      project: projectFilter || null,
      q: q.trim() || null,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- sync filters only
  }, [projectFilter, q]);

  const scopedRisks = useMemo(() => {
    const ql = q.trim().toLowerCase();
    return risks.filter((r) => {
      const projectOk = !projectFilter || r.project.id === projectFilter;
      const hay =
        !ql ||
        r.title.toLowerCase().includes(ql) ||
        r.project.name.toLowerCase().includes(ql) ||
        r.ownerName.toLowerCase().includes(ql) ||
        r.category.toLowerCase().includes(ql);
      return projectOk && hay;
    });
  }, [risks, projectFilter, q]);

  const actionItems = useMemo(() => buildRiskActionItems(scopedRisks), [scopedRisks]);

  const today = useMemo(() => startOfToday(), []);

  const activeRisks = useMemo(
    () => risks.filter((r) => !r.dueDate || new Date(r.dueDate) >= today),
    [risks, today],
  );

  const kpis = useMemo(() => {
    const grossV = activeRisks.reduce((s, r) => s + vmeGross(r.probability, r.impactAmount), 0);
    const resV = activeRisks.reduce((s, r) => s + vmeResidual(r.residualProb, r.impactAmount), 0);
    const critical = activeRisks.filter((r) => residualScore(r.residualProb, r.impactAmount) > 10).length;
    const eff = grossV > 0 ? Math.round((1 - resV / grossV) * 100) : null;
    return { grossV, resV, critical, eff, activeCount: activeRisks.length };
  }, [activeRisks]);

  const detail = scopedRisks.find((x) => x.id === detailId) ?? risks.find((x) => x.id === detailId) ?? null;

  const memoText = useMemo(() => {
    const now = new Date();
    const ds = now.toLocaleDateString("es-MX", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    const expired = risks.filter((r) => r.dueDate && new Date(r.dueDate) < today);
    const critical = activeRisks.filter((r) => residualScore(r.residualProb, r.impactAmount) > 10);
    const tV = activeRisks.reduce((s, r) => s + vmeGross(r.probability, r.impactAmount), 0);
    const tR = activeRisks.reduce((s, r) => s + vmeResidual(r.residualProb, r.impactAmount), 0);
    const eff = tV > 0 ? Math.round((1 - tR / tV) * 100) : 0;
    const L = "─".repeat(68);
    const D = "═".repeat(68);
    const body = `${D}
                  RISK MEMO — EXPOSICIÓN FINANCIERA
                      PARA COMITÉ DE DIRECCIÓN
${D}
Fecha          : ${ds}
Clasificación  : CONFIDENCIAL — USO INTERNO
${L}

RESUMEN EJECUTIVO
${L}
Riesgos en registro     : ${risks.length}
Riesgos activos         : ${activeRisks.length}
Riesgos vencidos        : ${expired.length}

EXPOSICIÓN FINANCIERA (VME · MXN)
${L}
  VME bruto (sin mitigación)    : ${fmtMoneyMxn(tV)}
  VME residual (con mitigación) : ${fmtMoneyMxn(tR)}
  Ahorro por mitigación         : ${fmtMoneyMxn(tV - tR)}
  Eficiencia de mitigación      : ${eff}%

${
  critical.length
    ? `ALERTA: ${critical.length} riesgo(s) con score residual > 10 requieren Plan de Contingencia validado.`
    : "Estado: todos los riesgos activos dentro del umbral de tolerancia (score residual ≤ 10) o con plan definido."
}

${L}
DETALLE POR RIESGO (ACTIVOS)
${L}
${activeRisks
  .map((r) => {
    const gs = grossScore(r.probability, r.impactAmount);
    const rs = residualScore(r.residualProb, r.impactAmount);
    const vg = vmeGross(r.probability, r.impactAmount);
    const vr = vmeResidual(r.residualProb, r.impactAmount);
    return `
# ${r.title}
  Proyecto       : ${r.project.name}
  Categoría      : ${r.category} · Dueño: ${r.ownerName}
  Entregable     : ${r.deliverable?.title ?? "—"}
  Prob. / Impacto: ${r.probability}% · ${fmtMoneyMxn(r.impactAmount)}
  Score bruto    : ${gs}/25 · VME bruto: ${fmtMoneyMxn(vg)}
  Prob. residual : ${r.residualProb}% · Score residual: ${rs}/25 · VME residual: ${fmtMoneyMxn(vr)}
  Mitigación     : ${r.mitigation ?? "—"}
  Disparador B   : ${r.trigger ?? "—"}
  Contingencia   : ${r.contingency ?? "—"}
  Caducidad      : ${r.dueDate ? new Date(r.dueDate).toLocaleDateString("es-MX") : "—"}
`;
  })
  .join("\n" + L + "\n")}

${D}
Generado desde EMBUS — Risk Manager
${D}`;
    return body.trim();
  }, [risks, activeRisks, today]);

  return (
    <div className="space-y-4 text-slate-900">
      <div className={dashKpiGrid}>
        <div className={`${dashCard} p-4`}>
          <RiskKpiLabel hint={RISK_KPI_HINTS.grossVme}>Exposición total VME</RiskKpiLabel>
          <p className={`${dashKpiValue} text-red-600`}>{fmtMoneyMxn(kpis.grossV)}</p>
          <p className={`mt-2 ${dashKpiLabel}`}>
            <span className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-red-500 align-middle" />
            {kpis.activeCount} riesgos activos
          </p>
        </div>
        <div className={`${dashCard} p-4`}>
          <RiskKpiLabel hint={RISK_KPI_HINTS.residualVme}>VME residual</RiskKpiLabel>
          <p className={`${dashKpiValue} text-blue-600`}>{fmtMoneyMxn(kpis.resV)}</p>
          <p className={`mt-2 ${dashKpiLabel}`}>
            <span className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-blue-500 align-middle" />
            tras mitigación
          </p>
        </div>
        <div className={`${dashCard} p-4`}>
          <RiskKpiLabel hint={RISK_KPI_HINTS.critical}>Riesgos críticos</RiskKpiLabel>
          <p className={`${dashKpiValue} text-amber-600`}>{kpis.critical}</p>
          <p className={`mt-2 ${dashKpiLabel}`}>
            <span className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-amber-500 align-middle" />
            score residual &gt; 10
          </p>
        </div>
        <div className={`${dashCard} p-4`}>
          <RiskKpiLabel hint={RISK_KPI_HINTS.mitigationEff}>Efectividad mitigación</RiskKpiLabel>
          <p className={`${dashKpiValue} text-emerald-600`}>
            {kpis.eff !== null ? `${kpis.eff}%` : "—"}
          </p>
          <p className={`mt-2 ${dashKpiLabel}`}>
            <span className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-emerald-500 align-middle" />
            reducción de exposición
          </p>
        </div>
      </div>

      <section className={`${dashCard} p-4`}>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className={dashSectionTitle}>Mapa de calor</h2>
          <button
            type="button"
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
            onClick={() => setMemoOpen(true)}
          >
            Exportar Risk Memo
          </button>
        </div>
        <div className="grid gap-8 sm:grid-cols-2">
          <HeatmapBlock label="Antes de mitigación" before={true} risks={risks} />
          <HeatmapBlock label="Después de mitigación" before={false} risks={risks} />
        </div>
      </section>

      <section className={`${dashCard} p-4`}>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className={dashSectionTitle}>Registro de riesgos</h2>
          <div className="flex flex-wrap gap-2">
            {canEdit ? (
              <button
                type="button"
                onClick={() => setCreateOpen(true)}
                className="rounded-lg bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-800"
              >
                + Nuevo riesgo
              </button>
            ) : (
              <p className={`${dashAlertWarn} py-1`}>Tu rol es solo lectura para este módulo.</p>
            )}
          </div>
        </div>

        <RisksActionQueue
          items={actionItems}
          activeId={focusId}
          onSelect={openDetail}
        />

        <div className="mb-4 flex flex-wrap items-center gap-2">
          <label className={uiLabel}>Proyecto</label>
          <select
            value={projectFilter}
            onChange={(e) => setProjectFilter(e.target.value)}
            className={`h-9 ${uiInput} w-auto min-w-[140px] py-1.5`}
          >
            <option value="">Todos</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar riesgo…"
            className={`h-9 w-[200px] max-w-full py-1.5 ${uiInput}`}
          />
        </div>

        <div className="space-y-2 lg:hidden">
          {scopedRisks.map((risk) => {
            const rs = residualScore(risk.residualProb, risk.impactAmount);
            return (
              <button
                key={risk.id}
                ref={(el) => {
                  if (el) rowRefs.current.set(risk.id, el);
                  else rowRefs.current.delete(risk.id);
                }}
                type="button"
                onClick={() => openDetail(risk.id)}
                className={`w-full rounded-lg border p-3 text-left ${
                  focusId === risk.id ? "border-slate-800 bg-slate-50" : "border-slate-200 bg-white"
                }`}
              >
                <p className="text-sm font-medium text-slate-900">{risk.title}</p>
                <p className="mt-1 text-xs text-slate-500">
                  {risk.project.name} · {risk.ownerName}
                </p>
                <span className={`mt-2 inline-block rounded-full px-2 py-0.5 text-[10px] font-medium ${scoreBadgeClass(rs)}`}>
                  Score {rs}
                </span>
              </button>
            );
          })}
          {scopedRisks.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-400">Sin riesgos en este alcance.</p>
          ) : null}
        </div>

        <div className="hidden overflow-x-auto lg:block">
          <table className="pmo-table pmo-row-hover w-full min-w-[960px] text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-slate-500">
                <th className="whitespace-nowrap px-3 py-2">Proyecto</th>
                <th className="whitespace-nowrap px-3 py-2">Descripción</th>
                <th className="whitespace-nowrap px-3 py-2">Categoría</th>
                <th className="whitespace-nowrap px-3 py-2">Dueño</th>
                <th className="whitespace-nowrap px-3 py-2">Prob.</th>
                <th className="whitespace-nowrap px-3 py-2">Impacto</th>
                <th className="whitespace-nowrap px-3 py-2">VME bruto</th>
                <th className="whitespace-nowrap px-3 py-2">Prob. resid.</th>
                <th className="whitespace-nowrap px-3 py-2">VME resid.</th>
                <th className="whitespace-nowrap px-3 py-2">Score resid.</th>
                <th className="whitespace-nowrap px-3 py-2">Caducidad</th>
                <th className="whitespace-nowrap px-3 py-2">Plan B</th>
                <th className="whitespace-nowrap px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {scopedRisks.map((risk) => {
                const rs = residualScore(risk.residualProb, risk.impactAmount);
                const vg = vmeGross(risk.probability, risk.impactAmount);
                const vr = vmeResidual(risk.residualProb, risk.impactAmount);
                const expired = risk.dueDate ? new Date(risk.dueDate) < today : false;
                const barW = Math.min(100, Math.round((rs / 25) * 100));
                const planB =
                  rs > 10 ? (
                    risk.contingency?.trim() ? (
                      <span className="inline-block rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700 ring-1 ring-emerald-200">
                        Definido
                      </span>
                    ) : (
                      <span className="inline-block rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-medium text-red-700 ring-1 ring-red-200">
                        Falta
                      </span>
                    )
                  ) : (
                    <span className="text-slate-400">—</span>
                  );
                return (
                  <tr
                    key={risk.id}
                    ref={(el) => {
                      if (el) rowRefs.current.set(risk.id, el);
                      else rowRefs.current.delete(risk.id);
                    }}
                    className={[
                      "cursor-pointer border-b border-slate-200 transition hover:bg-slate-50",
                      expired ? "opacity-[0.55]" : "",
                      focusId === risk.id ? "bg-slate-50" : "",
                    ].join(" ")}
                    onClick={() => openDetail(risk.id)}
                  >
                    <td className="px-3 py-3 align-middle text-slate-700">{risk.project.name}</td>
                    <td className="max-w-[200px] px-3 py-3 align-middle">
                      <div className="font-medium leading-snug text-slate-900">
                        {risk.title.length > 80 ? `${risk.title.slice(0, 80)}…` : risk.title}
                      </div>
                    </td>
                    <td className="px-3 py-3 align-middle">
                      <span className="inline-block rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] text-slate-600">
                        {risk.category}
                      </span>
                    </td>
                    <td className="px-3 py-3 align-middle text-slate-600">{risk.ownerName}</td>
                    <td className="px-3 py-3 align-middle tabular-nums text-xs">{risk.probability}%</td>
                    <td className="px-3 py-3 align-middle tabular-nums text-xs">{fmtMoneyMxn(risk.impactAmount)}</td>
                    <td className="px-3 py-3 align-middle tabular-nums text-xs text-red-600">{fmtMoneyMxn(vg)}</td>
                    <td className="px-3 py-3 align-middle tabular-nums text-xs">{risk.residualProb}%</td>
                    <td className="px-3 py-3 align-middle tabular-nums text-xs text-blue-600">{fmtMoneyMxn(vr)}</td>
                    <td className="px-3 py-3 align-middle">
                      <div className="flex items-center gap-2">
                        <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-medium ${scoreBadgeClass(rs)}`}>
                          {rs}
                        </span>
                        <div className="h-1 w-14 overflow-hidden rounded-full bg-slate-200">
                          <div className={`h-full rounded-full ${scoreBarColor(rs)}`} style={{ width: `${barW}%` }} />
                        </div>
                      </div>
                      {rs > 10 ? (
                        <p className="mt-0.5 text-[10px] text-red-600">Plan B req.</p>
                      ) : null}
                    </td>
                    <td className="px-3 py-3 align-middle tabular-nums text-xs">
                      {risk.dueDate ? (
                        expired ? (
                          <span className="text-amber-700">
                            {new Date(risk.dueDate).toLocaleDateString("es-MX")} ⚠
                          </span>
                        ) : (
                          new Date(risk.dueDate).toLocaleDateString("es-MX")
                        )
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-3 py-3 align-middle">{planB}</td>
                    <td className="whitespace-nowrap px-3 py-3 align-middle">
                      <button
                        type="button"
                        className="rounded-md border border-transparent px-2 py-1 text-slate-400 transition hover:border-slate-200 hover:bg-white hover:text-slate-800"
                        onClick={(e) => {
                          e.stopPropagation();
                          openDetail(risk.id);
                        }}
                        title="Detalle"
                      >
                        ↗
                      </button>
                      {canEdit ? (
                        <form action={deleteAction} className="inline">
                          <input type="hidden" name="riskId" value={risk.id} />
                          <button
                            type="submit"
                            className="rounded-md border border-transparent px-2 py-1 text-stone-400 transition hover:border-red-200 hover:bg-red-50 hover:text-red-700"
                            title="Eliminar"
                            onClick={(e) => {
                              if (!window.confirm("¿Eliminar este riesgo?")) e.preventDefault();
                            }}
                          >
                            ✕
                          </button>
                        </form>
                      ) : null}
                    </td>
                  </tr>
                );
              })}
              {scopedRisks.length === 0 && (
                <tr>
                  <td colSpan={13} className="py-12 text-center text-sm text-slate-400">
                    Sin riesgos en este alcance.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Detalle */}
      {detail && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/30 p-4 backdrop-blur-sm"
          role="presentation"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeDetail();
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            className="relative max-h-[min(90vh,720px)] w-full max-w-xl overflow-y-auto rounded-2xl border border-slate-200 bg-white p-7 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-md border border-slate-200 bg-slate-50 text-slate-500 transition hover:border-red-200 hover:bg-red-50 hover:text-red-700"
              onClick={closeDetail}
              aria-label="Cerrar"
            >
              ✕
            </button>
            <h2 className="pr-10 text-lg font-semibold tracking-tight text-slate-900">
              {detail.title.length > 90 ? `${detail.title.slice(0, 90)}…` : detail.title}
            </h2>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <p className={`mb-2 ${dashKpiLabel}`}>Riesgo bruto</p>
                <p className="flex justify-between text-xs">
                  <span className="text-slate-500">Probabilidad</span>
                  <strong>{detail.probability}%</strong>
                </p>
                <p className="flex justify-between text-xs">
                  <span className="text-slate-500">Impacto</span>
                  <strong>{fmtMoneyMxn(detail.impactAmount)}</strong>
                </p>
                <p className="mt-2 text-2xl font-semibold tabular-nums text-red-600">
                  {fmtMoneyMxn(vmeGross(detail.probability, detail.impactAmount))}
                </p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <p className={`mb-2 ${dashKpiLabel}`}>Riesgo residual</p>
                <p className="flex justify-between text-xs">
                  <span className="text-slate-500">Prob. residual</span>
                  <strong>{detail.residualProb}%</strong>
                </p>
                <p className="flex justify-between text-xs">
                  <span className="text-slate-500">Score</span>
                  <strong>{residualScore(detail.residualProb, detail.impactAmount)}/25</strong>
                </p>
                <p className="mt-2 text-2xl font-semibold tabular-nums text-blue-600">
                  {fmtMoneyMxn(vmeResidual(detail.residualProb, detail.impactAmount))}
                </p>
              </div>
            </div>
            {detail.mitigation ? (
              <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3">
                <p className={dashKpiLabel}>Mitigación</p>
                <p className="mt-1 text-sm leading-relaxed text-slate-700">{detail.mitigation}</p>
              </div>
            ) : null}
            {detail.trigger ? (
              <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3">
                <p className="text-xs font-medium text-amber-800">Disparador Plan B</p>
                <p className="mt-1 text-sm text-amber-950">{detail.trigger}</p>
              </div>
            ) : null}
            {residualScore(detail.residualProb, detail.impactAmount) > 10 ? (
              <div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3">
                <p className="text-xs font-semibold text-red-800">Contingencia</p>
                <p className="mt-1 text-sm text-red-950">{detail.contingency || "No definido"}</p>
              </div>
            ) : null}
            <p className="mt-4 text-xs text-slate-500">
              Proyecto:{" "}
              <Link
                href={DELIVERABLES_PROJECT(detail.project.id)}
                className="font-medium text-slate-800 underline"
              >
                {detail.project.name}
              </Link>
              {detail.deliverable ? (
                <>
                  {" "}
                  · Entregable:{" "}
                  <Link
                    href={DELIVERABLE_DETAIL_IN_PROJECT(detail.deliverable.id, detail.project.id)}
                    className="font-medium text-slate-800 underline"
                  >
                    {detail.deliverable.title}
                  </Link>
                </>
              ) : null}
            </p>
          </div>
        </div>
      )}

      {createOpen && canEdit ? (
        <CreateRiskModal
          key={prefill ? `prefill-${prefill.projectId}` : "new"}
          projects={projects}
          deliverables={deliverables}
          prefill={prefill}
          createAction={createAction}
          onClose={() => setCreateOpen(false)}
        />
      ) : null}

      {/* Memo */}
      {memoOpen && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/30 p-4 backdrop-blur-sm"
          role="presentation"
          onClick={(e) => {
            if (e.target === e.currentTarget) setMemoOpen(false);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            className="relative max-h-[min(90vh,640px)] w-full max-w-2xl overflow-y-auto rounded-2xl border border-slate-200 bg-white p-7 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-md border border-slate-200 bg-slate-50 text-slate-500 transition hover:bg-slate-100"
              onClick={() => setMemoOpen(false)}
              aria-label="Cerrar"
            >
              ✕
            </button>
            <h2 className="pr-10 text-lg font-semibold">Risk Memo — Exposición financiera</h2>
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
                onClick={() => {
                  void navigator.clipboard.writeText(memoText).then(() => window.alert("Memo copiado al portapapeles"));
                }}
              >
                Copiar
              </button>
              <button
                type="button"
                className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                onClick={() => {
                  const blob = new Blob([memoText], { type: "text/plain;charset=utf-8" });
                  const a = document.createElement("a");
                  a.href = URL.createObjectURL(blob);
                  a.download = `RiskMemo_${new Date().toISOString().slice(0, 10)}.txt`;
                  a.click();
                  URL.revokeObjectURL(a.href);
                }}
              >
                Descargar .txt
              </button>
            </div>
            <pre className="mt-4 max-h-[min(50vh,480px)] overflow-y-auto whitespace-pre-wrap rounded-lg border border-slate-200 bg-slate-50 p-5 font-mono text-[11.5px] leading-relaxed text-slate-700">
              {memoText}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
