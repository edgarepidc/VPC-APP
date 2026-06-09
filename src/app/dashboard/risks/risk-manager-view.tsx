"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";

import type { RiskFormPrefill } from "@/lib/escalation-risk-prefill";
import { DELIVERABLE_DETAIL_IN_PROJECT, DELIVERABLES_PROJECT } from "@/lib/dashboard-paths";

import {
  dashAlertWarn,
  dashCard,
  dashCardBody,
  dashKpiGrid,
  dashKpiLabel,
  dashKpiValue,
  dashSectionTitle,
} from "@/lib/ui-classes";

import {
  fmtMoneyUSD,
  grossScore,
  heatmapTone,
  i2l,
  p2l,
  RISK_CATEGORIES,
  residualScore,
  scoreBadgeClass,
  scoreBarColor,
  vmeGross,
  vmeResidual,
} from "./risk-utils";
import { buildRiskActionItems } from "./risk-action-utils";
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
    <div>
      <p className="mb-3 font-mono text-xs font-medium uppercase tracking-wider text-slate-500">{label}</p>
      <div className="flex gap-1.5">
        <div
          className="flex items-center pb-5 font-mono text-[9px] font-medium uppercase tracking-widest text-stone-400"
          style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}
        >
          Prob.
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex gap-1">
            <div className="grid shrink-0 grid-rows-5 gap-1 py-0 pr-1.5 font-mono text-[10px] text-stone-400">
              {[5, 4, 3, 2, 1].map((n) => (
                <div key={n} className="flex h-full items-center justify-end">
                  {n}
                </div>
              ))}
            </div>
            <div className="min-w-0 flex-1">
              <div className="grid grid-cols-5 gap-1">
                {rows.flatMap((row) =>
                  row.map(({ pl, il, count, score }) => {
                    const { bg, fg } = heatmapTone(score);
                    return (
                      <div
                        key={`${pl}-${il}-${before}`}
                        title={`Score ${score} · Prob.${pl} × Imp.${il}${count ? ` · ${count} riesgo(s)` : ""}`}
                        className="flex aspect-square items-center justify-center rounded-md transition-transform hover:z-[1] hover:scale-110"
                        style={{ backgroundColor: bg, color: fg }}
                      >
                        {count > 0 ? (
                          <span
                            className="flex h-[22px] w-[22px] items-center justify-center rounded-full text-[10px] font-bold"
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
              <div className="mt-1 grid grid-cols-5 gap-1 text-center font-mono text-[10px] text-stone-400">
                {[1, 2, 3, 4, 5].map((n) => (
                  <span key={n}>{n}</span>
                ))}
              </div>
              <p className="mt-1 text-center font-mono text-[9px] font-medium uppercase tracking-wider text-stone-400">
                Impacto
              </p>
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
  const formSectionRef = useRef<HTMLElement>(null);
  const rowRefs = useRef<Map<string, HTMLElement>>(new Map());
  const [detailId, setDetailId] = useState<string | null>(initial?.id ?? null);
  const [focusId, setFocusId] = useState<string | null>(initial?.id ?? null);
  const [projectFilter, setProjectFilter] = useState(initial?.project ?? "");
  const [q, setQ] = useState(initial?.q ?? "");
  const [formProjectId, setFormProjectId] = useState(prefill?.projectId ?? "");
  const [memoOpen, setMemoOpen] = useState(false);
  const [prob, setProb] = useState(prefill?.probability ?? 50);
  const [resProb, setResProb] = useState(prefill?.residualProb ?? 20);
  const [impact, setImpact] = useState(prefill?.impactAmount ?? 50_000);

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
    if (!prefill) return;
    setProb(prefill.probability);
    setResProb(prefill.residualProb);
    setImpact(prefill.impactAmount);
    setFormProjectId(prefill.projectId ?? "");
    formSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [prefill]);

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

  const formDeliverables = useMemo(
    () =>
      formProjectId
        ? deliverables.filter((d) => d.projectId === formProjectId)
        : deliverables,
    [deliverables, formProjectId],
  );

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

  const preview = useMemo(() => {
    const g = vmeGross(prob, impact);
    const r = vmeResidual(resProb, impact);
    return { gross: g, residual: r, saving: g - r };
  }, [prob, resProb, impact]);

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

EXPOSICIÓN FINANCIERA (VME)
${L}
  VME bruto (sin mitigación)    : ${fmtMoneyUSD(tV)}
  VME residual (con mitigación) : ${fmtMoneyUSD(tR)}
  Ahorro por mitigación         : ${fmtMoneyUSD(tV - tR)}
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
  Prob. / Impacto: ${r.probability}% · ${fmtMoneyUSD(r.impactAmount)}
  Score bruto    : ${gs}/25 · VME bruto: ${fmtMoneyUSD(vg)}
  Prob. residual : ${r.residualProb}% · Score residual: ${rs}/25 · VME residual: ${fmtMoneyUSD(vr)}
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
          <p className={`mb-2 ${dashKpiLabel}`}>Exposición total VME</p>
          <p className={`${dashKpiValue} text-red-600`}>{fmtMoneyUSD(kpis.grossV)}</p>
          <p className={`mt-2 ${dashKpiLabel}`}>
            <span className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-red-500 align-middle" />
            {kpis.activeCount} riesgos activos
          </p>
        </div>
        <div className={`${dashCard} p-4`}>
          <p className={`mb-2 ${dashKpiLabel}`}>VME residual</p>
          <p className={`${dashKpiValue} text-blue-600`}>{fmtMoneyUSD(kpis.resV)}</p>
          <p className={`mt-2 ${dashKpiLabel}`}>
            <span className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-blue-500 align-middle" />
            tras mitigación
          </p>
        </div>
        <div className={`${dashCard} p-4`}>
          <p className={`mb-2 ${dashKpiLabel}`}>Riesgos críticos</p>
          <p className={`${dashKpiValue} text-amber-600`}>{kpis.critical}</p>
          <p className={`mt-2 ${dashKpiLabel}`}>
            <span className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-amber-500 align-middle" />
            score residual &gt; 10
          </p>
        </div>
        <div className={`${dashCard} p-4`}>
          <p className={`mb-2 ${dashKpiLabel}`}>Efectividad mitigación</p>
          <p className={`${dashKpiValue} text-emerald-600`}>
            {kpis.eff !== null ? `${kpis.eff}%` : "—"}
          </p>
          <p className={`mt-2 ${dashKpiLabel}`}>
            <span className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-emerald-500 align-middle" />
            reducción de exposición
          </p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_22rem] lg:items-start">
        <section ref={formSectionRef} id="risk-register-form" className={`${dashCard} p-4`}>
          <h2 className={`mb-4 ${dashSectionTitle}`}>Registrar riesgo</h2>
          {prefill && canEdit && (
            <p className={`mb-4 ${dashAlertWarn}`}>
              Formulario prellenado desde una evaluación del Escalómetro. Revisa y ajusta antes de
              guardar.
            </p>
          )}
          {!canEdit ? (
            <p className={dashAlertWarn}>Tu rol es solo lectura para este módulo.</p>
          ) : (
            <form
              action={createAction}
              onSubmit={(e) => {
                const fd = new FormData(e.currentTarget);
                const rp = Number(fd.get("residualProb") ?? 20);
                const imp = Number(fd.get("impactAmount") ?? 0);
                const cont = String(fd.get("contingency") ?? "").trim();
                const rs = residualScore(rp, imp);
                if (rs > 10 && !cont) {
                  e.preventDefault();
                  window.alert(
                    "Plan de contingencia obligatorio cuando el score residual es mayor que 10 (umbral de tolerancia).",
                  );
                }
              }}
              className="space-y-4"
            >
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="sm:col-span-2">
                  <span className="mb-1 block font-mono text-xs font-medium uppercase tracking-wider text-slate-600">
                    Descripción del riesgo *
                  </span>
                  <textarea
                    name="title"
                    required
                    rows={3}
                    defaultValue={prefill?.title ?? ""}
                    placeholder="Describe el riesgo, causa y consecuencia posible…"
                    className="w-full rounded-lg border border-[#e4e2dc] bg-[#f5f4f0] px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/15"
                  />
                </label>
                <label>
                  <span className="mb-1 block font-mono text-xs font-medium uppercase tracking-wider text-slate-600">
                    Categoría
                  </span>
                  <select
                    name="category"
                    defaultValue={prefill?.category ?? RISK_CATEGORIES[0]}
                    className="w-full rounded-lg border border-[#e4e2dc] bg-[#f5f4f0] px-3 py-2 text-sm outline-none focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/15"
                  >
                    {RISK_CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <span className="mb-1 block font-mono text-xs font-medium uppercase tracking-wider text-slate-600">
                    Dueño del riesgo *
                  </span>
                  <input
                    name="ownerName"
                    required
                    placeholder="Nombre o área responsable"
                    className="w-full rounded-lg border border-[#e4e2dc] bg-[#f5f4f0] px-3 py-2 text-sm outline-none focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/15"
                  />
                </label>
                <label className="sm:col-span-2">
                  <span className="mb-1 block font-mono text-xs font-medium uppercase tracking-wider text-slate-600">
                    Proyecto *
                  </span>
                  <select
                    name="projectId"
                    required
                    defaultValue={prefill?.projectId ?? ""}
                    onChange={(e) => setFormProjectId(e.target.value)}
                    className="w-full rounded-lg border border-[#e4e2dc] bg-[#f5f4f0] px-3 py-2 text-sm outline-none focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/15"
                  >
                    <option value="">Selecciona proyecto</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="sm:col-span-2">
                  <span className="mb-1 block font-mono text-xs font-medium uppercase tracking-wider text-slate-600">
                    Entregable (opcional)
                  </span>
                  <select
                    name="deliverableId"
                    className="w-full rounded-lg border border-[#e4e2dc] bg-[#f5f4f0] px-3 py-2 text-sm outline-none focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/15"
                  >
                    <option value="">—</option>
                    {formDeliverables.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.title}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="sm:col-span-2">
                  <span className="mb-1 block font-mono text-xs font-medium uppercase tracking-wider text-slate-600">
                    Probabilidad de ocurrencia ({prob}%)
                  </span>
                  <input
                    type="range"
                    name="probability"
                    min={1}
                    max={100}
                    value={prob}
                    onChange={(e) => setProb(+e.target.value)}
                    className="h-2 w-full cursor-pointer accent-blue-600"
                  />
                </label>
                <label className="sm:col-span-2">
                  <span className="mb-1 block font-mono text-xs font-medium uppercase tracking-wider text-slate-600">
                    Impacto financiero (USD)
                  </span>
                  <input
                    name="impactAmount"
                    type="number"
                    min={0}
                    value={impact}
                    onChange={(e) => setImpact(+e.target.value || 0)}
                    className="w-full rounded-lg border border-[#e4e2dc] bg-[#f5f4f0] px-3 py-2 font-mono text-sm outline-none focus:border-blue-500 focus:bg-white"
                  />
                </label>
                <label className="sm:col-span-2">
                  <span className="mb-1 block font-mono text-xs font-medium uppercase tracking-wider text-slate-600">
                    Fecha de caducidad (opcional)
                  </span>
                  <input
                    name="dueDate"
                    type="date"
                    className="w-full rounded-lg border border-[#e4e2dc] bg-[#f5f4f0] px-3 py-2 text-sm outline-none focus:border-blue-500 focus:bg-white"
                  />
                </label>
              </div>

              <div className="flex items-center gap-2 border-t border-[#e4e2dc] pt-4 font-mono text-xs font-semibold uppercase tracking-wider text-slate-600">
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
                Plan de respuesta
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="sm:col-span-2">
                  <span className="mb-1 block font-mono text-xs font-medium uppercase tracking-wider text-slate-600">
                    Acción de mitigación
                  </span>
                  <textarea
                    name="mitigation"
                    rows={2}
                    defaultValue={prefill?.mitigation ?? ""}
                    placeholder="¿Qué acciones reducen la probabilidad?"
                    className="w-full rounded-lg border border-[#e4e2dc] bg-[#f5f4f0] px-3 py-2 text-sm outline-none focus:border-blue-500 focus:bg-white"
                  />
                </label>
                <label className="sm:col-span-2">
                  <span className="mb-1 block font-mono text-xs font-medium uppercase tracking-wider text-slate-600">
                    Probabilidad residual ({resProb}%)
                  </span>
                  <input
                    type="range"
                    name="residualProb"
                    min={1}
                    max={100}
                    value={resProb}
                    onChange={(e) => setResProb(+e.target.value)}
                    className="h-2 w-full cursor-pointer accent-blue-600"
                  />
                </label>
                <label className="sm:col-span-2">
                  <span className="mb-1 block font-mono text-xs font-medium uppercase tracking-wider text-slate-600">
                    Disparador del Plan B
                  </span>
                  <input
                    name="trigger"
                    defaultValue={prefill?.trigger ?? ""}
                    placeholder="Ej.: Si la entrega no ocurre antes de semana 4…"
                    className="w-full rounded-lg border border-[#e4e2dc] bg-[#f5f4f0] px-3 py-2 text-sm outline-none focus:border-blue-500 focus:bg-white"
                  />
                </label>
                <label className="sm:col-span-2">
                  <span className="mb-1 block font-mono text-xs font-medium uppercase tracking-wider text-slate-600">
                    Plan de contingencia / Plan B{" "}
                    <span className="font-sans font-normal normal-case text-stone-400">
                      (obligatorio si score residual &gt; 10)
                    </span>
                  </span>
                  <textarea
                    name="contingency"
                    rows={2}
                    placeholder="Plan alternativo de respuesta…"
                    className="w-full rounded-lg border border-[#e4e2dc] bg-[#f5f4f0] px-3 py-2 text-sm outline-none focus:border-blue-500 focus:bg-white"
                  />
                </label>
              </div>

              <div className="grid grid-cols-3 gap-3 rounded-lg border border-[#e4e2dc] bg-[#f5f4f0] p-4 font-mono text-sm">
                <div>
                  <p className="text-[10px] font-medium uppercase tracking-wider text-slate-500">VME bruto</p>
                  <p className="mt-1 text-lg font-semibold text-red-600">{fmtMoneyUSD(preview.gross)}</p>
                </div>
                <div>
                  <p className="text-[10px] font-medium uppercase tracking-wider text-slate-500">VME residual</p>
                  <p className="mt-1 text-lg font-semibold text-blue-600">{fmtMoneyUSD(preview.residual)}</p>
                </div>
                <div>
                  <p className="text-[10px] font-medium uppercase tracking-wider text-slate-500">Ahorro</p>
                  <p className="mt-1 text-lg font-semibold text-emerald-600">{fmtMoneyUSD(preview.saving)}</p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="submit"
                  className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
                >
                  + Agregar riesgo
                </button>
                <button
                  type="button"
                  className="inline-flex items-center gap-2 rounded-lg border border-[#e4e2dc] bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-[#f5f4f0]"
                  onClick={() => {
                    setProb(50);
                    setResProb(20);
                    setImpact(50_000);
                  }}
                >
                  Restablecer sliders
                </button>
                <button
                  type="button"
                  className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700"
                  onClick={() => setMemoOpen(true)}
                >
                  Exportar Risk Memo
                </button>
              </div>
            </form>
          )}
        </section>

        {/* Heatmaps */}
        <section className={`${dashCard} p-4`}>
          <h2 className={`mb-4 ${dashSectionTitle}`}>Mapa de calor</h2>
          <div className="flex flex-col gap-8">
            <HeatmapBlock label="Antes de mitigación" before={true} risks={risks} />
            <HeatmapBlock label="Después de mitigación" before={false} risks={risks} />
          </div>
        </section>
      </div>

      {/* Tabla */}
      <section className={`${dashCard} p-4`}>
        <h2 className={`mb-4 ${dashSectionTitle}`}>Registro de riesgos</h2>

        <RisksActionQueue
          items={actionItems}
          activeId={focusId}
          onSelect={openDetail}
        />

        <div className="mb-4 flex flex-wrap items-center gap-2">
          <label className="text-xs font-medium text-slate-600">Proyecto</label>
          <select
            value={projectFilter}
            onChange={(e) => setProjectFilter(e.target.value)}
            className="h-9 rounded-lg border border-slate-300 bg-white px-2.5 text-sm"
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
            className="h-9 w-[200px] max-w-full rounded-lg border border-slate-300 bg-white px-2.5 text-sm"
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
          <table className="w-full min-w-[960px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-[#e4e2dc] bg-[#f5f4f0] text-left font-mono text-[10px] font-medium uppercase tracking-wider text-slate-500">
                <th className="whitespace-nowrap px-3 py-2">Proyecto</th>
                <th className="whitespace-nowrap px-3 py-2">Descripción</th>
                <th className="whitespace-nowrap px-3 py-2">Cat.</th>
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
                      <span className="inline-block rounded-full bg-emerald-50 px-2 py-0.5 font-mono text-[10px] font-medium text-emerald-700 ring-1 ring-emerald-200">
                        Definido
                      </span>
                    ) : (
                      <span className="inline-block rounded-full bg-red-50 px-2 py-0.5 font-mono text-[10px] font-medium text-red-700 ring-1 ring-red-200">
                        Falta
                      </span>
                    )
                  ) : (
                    <span className="text-stone-400">—</span>
                  );
                return (
                  <tr
                    key={risk.id}
                    ref={(el) => {
                      if (el) rowRefs.current.set(risk.id, el);
                      else rowRefs.current.delete(risk.id);
                    }}
                    className={["cursor-pointer border-b border-[#e4e2dc] transition hover:bg-[#f5f4f0]", expired ? "opacity-[0.55]" : "", focusId === risk.id ? "bg-slate-50" : ""].join(
                      " ",
                    )}
                    onClick={() => openDetail(risk.id)}
                  >
                    <td className="px-3 py-3 align-middle text-slate-700">{risk.project.name}</td>
                    <td className="max-w-[200px] px-3 py-3 align-middle">
                      <div className="font-medium leading-snug text-slate-900">
                        {risk.title.length > 80 ? `${risk.title.slice(0, 80)}…` : risk.title}
                      </div>
                    </td>
                    <td className="px-3 py-3 align-middle">
                      <span className="inline-block rounded-full border border-[#e4e2dc] bg-[#f5f4f0] px-2 py-0.5 font-mono text-[10px] text-slate-600">
                        {risk.category}
                      </span>
                    </td>
                    <td className="px-3 py-3 align-middle text-slate-600">{risk.ownerName}</td>
                    <td className="px-3 py-3 align-middle font-mono text-xs">{risk.probability}%</td>
                    <td className="px-3 py-3 align-middle font-mono text-xs">{fmtMoneyUSD(risk.impactAmount)}</td>
                    <td className="px-3 py-3 align-middle font-mono text-xs text-red-600">{fmtMoneyUSD(vg)}</td>
                    <td className="px-3 py-3 align-middle font-mono text-xs">{risk.residualProb}%</td>
                    <td className="px-3 py-3 align-middle font-mono text-xs text-blue-600">{fmtMoneyUSD(vr)}</td>
                    <td className="px-3 py-3 align-middle">
                      <div className="flex items-center gap-2">
                        <span className={`inline-block rounded-full px-2 py-0.5 font-mono text-[10px] font-medium ${scoreBadgeClass(rs)}`}>
                          {rs}
                        </span>
                        <div className="h-1 w-14 overflow-hidden rounded-full bg-stone-200">
                          <div className={`h-full rounded-full ${scoreBarColor(rs)}`} style={{ width: `${barW}%` }} />
                        </div>
                      </div>
                      {rs > 10 ? (
                        <p className="mt-0.5 font-mono text-[10px] text-red-600">Plan B req.</p>
                      ) : null}
                    </td>
                    <td className="px-3 py-3 align-middle font-mono text-xs">
                      {risk.dueDate ? (
                        expired ? (
                          <span className="text-amber-700">
                            {new Date(risk.dueDate).toLocaleDateString("es-MX")} ⚠
                          </span>
                        ) : (
                          new Date(risk.dueDate).toLocaleDateString("es-MX")
                        )
                      ) : (
                        <span className="text-stone-400">—</span>
                      )}
                    </td>
                    <td className="px-3 py-3 align-middle">{planB}</td>
                    <td className="whitespace-nowrap px-3 py-3 align-middle">
                      <button
                        type="button"
                        className="rounded-md border border-transparent px-2 py-1 text-stone-400 transition hover:border-[#e4e2dc] hover:bg-white hover:text-slate-800"
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
                  <td colSpan={13} className="py-12 text-center font-mono text-sm text-stone-400">
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
            className="relative max-h-[min(90vh,720px)] w-full max-w-xl overflow-y-auto rounded-2xl border border-[#e4e2dc] bg-white p-7 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-md border border-[#e4e2dc] bg-[#f5f4f0] text-slate-500 transition hover:border-red-200 hover:bg-red-50 hover:text-red-700"
              onClick={closeDetail}
              aria-label="Cerrar"
            >
              ✕
            </button>
            <h2 className="pr-10 text-lg font-semibold tracking-tight text-slate-900">
              {detail.title.length > 90 ? `${detail.title.slice(0, 90)}…` : detail.title}
            </h2>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg border border-[#e4e2dc] bg-[#f5f4f0] p-4">
                <p className="mb-2 font-mono text-[10px] font-medium uppercase tracking-wider text-slate-500">Riesgo bruto</p>
                <p className="flex justify-between text-xs">
                  <span className="text-slate-500">Probabilidad</span>
                  <strong>{detail.probability}%</strong>
                </p>
                <p className="flex justify-between text-xs">
                  <span className="text-slate-500">Impacto</span>
                  <strong>{fmtMoneyUSD(detail.impactAmount)}</strong>
                </p>
                <p className="mt-2 text-2xl font-semibold text-red-600">
                  {fmtMoneyUSD(vmeGross(detail.probability, detail.impactAmount))}
                </p>
              </div>
              <div className="rounded-lg border border-[#e4e2dc] bg-[#f5f4f0] p-4">
                <p className="mb-2 font-mono text-[10px] font-medium uppercase tracking-wider text-slate-500">Riesgo residual</p>
                <p className="flex justify-between text-xs">
                  <span className="text-slate-500">Prob. residual</span>
                  <strong>{detail.residualProb}%</strong>
                </p>
                <p className="flex justify-between text-xs">
                  <span className="text-slate-500">Score</span>
                  <strong>{residualScore(detail.residualProb, detail.impactAmount)}/25</strong>
                </p>
                <p className="mt-2 text-2xl font-semibold text-blue-600">
                  {fmtMoneyUSD(vmeResidual(detail.residualProb, detail.impactAmount))}
                </p>
              </div>
            </div>
            {detail.mitigation ? (
              <div className="mt-4 rounded-lg border border-[#e4e2dc] bg-[#f5f4f0] p-3">
                <p className="font-mono text-[10px] font-medium uppercase tracking-wider text-slate-500">Mitigación</p>
                <p className="mt-1 text-sm leading-relaxed text-slate-700">{detail.mitigation}</p>
              </div>
            ) : null}
            {detail.trigger ? (
              <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3">
                <p className="font-mono text-[10px] font-medium uppercase tracking-wider text-amber-800">Disparador Plan B</p>
                <p className="mt-1 text-sm text-amber-950">{detail.trigger}</p>
              </div>
            ) : null}
            {residualScore(detail.residualProb, detail.impactAmount) > 10 ? (
              <div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3">
                <p className="font-mono text-[10px] font-semibold uppercase tracking-wider text-red-800">Contingencia</p>
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
            className="relative max-h-[min(90vh,640px)] w-full max-w-2xl overflow-y-auto rounded-2xl border border-[#e4e2dc] bg-white p-7 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-md border border-[#e4e2dc] bg-[#f5f4f0] text-slate-500 transition hover:bg-slate-100"
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
                className="rounded-lg border border-[#e4e2dc] bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-[#f5f4f0]"
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
            <pre className="mt-4 max-h-[min(50vh,480px)] overflow-y-auto whitespace-pre-wrap rounded-lg border border-[#e4e2dc] bg-[#f5f4f0] p-5 font-mono text-[11.5px] leading-relaxed text-slate-700">
              {memoText}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
