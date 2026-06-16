"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";

import type { RiskFormPrefill } from "@/lib/escalation-risk-prefill";
import {
  DELIVERABLE_DETAIL_IN_PROJECT,
  RISKS_PROJECT,
} from "@/lib/dashboard-paths";
import { DashboardScopeSelect } from "@/app/dashboard/_components/dashboard-scope-select";
import { DashboardSectionShell } from "@/app/dashboard/_components/section-shell";
import { resolveProjectFilterIds, type ProjectHierarchyGroup, type ProjectHierarchyRow } from "@/lib/project-hierarchy";

import { KpiTile, dashKpiTilesGrid } from "@/app/dashboard/_components/kpi-tile";
import {
  dashAlertWarn,
  dashCard,
  dashKpiLabel,
  dashSectionTitle,
  uiLabel,
} from "@/lib/ui-classes";

import { CreateRiskModal } from "./create-risk-modal";
import { RiskDetailEditForm } from "./risk-detail-edit-form";
import {
  fmtMoneyMxn,
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
  projectGroups: ProjectHierarchyGroup[];
  projectHierarchy: ProjectHierarchyRow[];
  deliverables: { id: string; title: string; projectId: string }[];
  canEdit: boolean;
  prefill?: RiskFormPrefill | null;
  initial?: { id?: string; project?: string; q?: string };
  createAction: (formData: FormData) => void | Promise<void>;
  updateAction: (formData: FormData) => void | Promise<void>;
  deleteAction: (formData: FormData) => void | Promise<void>;
};

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

const HEATMAP_CELL = "h-[3.75rem] w-[3.75rem]";

function HeatmapBlock({
  label,
  before,
  risks,
  onOpenRisk,
}: {
  label: string;
  before: boolean;
  risks: RiskClientRow[];
  onOpenRisk: (id: string) => void;
}) {
  const [hoverKey, setHoverKey] = useState<string | null>(null);

  const risksByCell = useMemo(() => {
    const map = new Map<string, RiskClientRow[]>();
    for (const risk of risks) {
      const pl = before ? p2l(risk.probability) : p2l(risk.residualProb);
      const il = i2l(risk.impactAmount);
      const key = `${pl}-${il}`;
      const list = map.get(key) ?? [];
      list.push(risk);
      map.set(key, list);
    }
    return map;
  }, [risks, before]);

  const rows = useMemo(() => {
    const out: { pl: number; il: number; count: number; score: number }[][] = [];
    for (let pi = 0; pi < 5; pi++) {
      const pl = 5 - pi;
      const row: { pl: number; il: number; count: number; score: number }[] = [];
      for (let il = 1; il <= 5; il++) {
        const key = `${pl}-${il}`;
        const cellRisks = risksByCell.get(key) ?? [];
        row.push({ pl, il, count: cellRisks.length, score: pl * il });
      }
      out.push(row);
    }
    return out;
  }, [risksByCell]);

  return (
    <div className="mx-auto w-full max-w-[540px]">
      <p className={`mb-2.5 ${uiLabel}`}>{label}</p>
      <div className="flex gap-1.5">
        <div
          className="flex items-center pb-6 text-[10px] font-medium text-slate-400"
          style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}
        >
          Prob.
        </div>
        <div>
          <div className="flex gap-1">
            <div className="grid shrink-0 grid-rows-5 gap-1 py-0 pr-1.5 text-[10px] leading-none text-slate-400">
              {[5, 4, 3, 2, 1].map((n) => (
                <div key={n} className="flex h-[3.75rem] w-4 items-center justify-end">
                  {n}
                </div>
              ))}
            </div>
            <div>
              <div className="grid grid-cols-5 gap-1">
                {rows.flatMap((row, rowIndex) =>
                  row.map(({ pl, il, count, score }) => {
                    const { bg, fg } = heatmapTone(score);
                    const cellKey = `${pl}-${il}`;
                    const cellRisks = risksByCell.get(cellKey) ?? [];
                    const isOpen = hoverKey === cellKey;
                    const popoverAbove = rowIndex >= 3;

                    return (
                      <div
                        key={`${pl}-${il}-${before}`}
                        className={`relative ${isOpen ? "z-30" : "z-0"}`}
                        onMouseEnter={() => {
                          if (count > 0) setHoverKey(cellKey);
                        }}
                        onMouseLeave={() => setHoverKey(null)}
                      >
                        <div
                          title={
                            count > 0
                              ? `Score ${score} · Prob.${pl} × Imp.${il} · ${count} riesgo(s)`
                              : `Score ${score} · Prob.${pl} × Imp.${il}`
                          }
                          className={`flex ${HEATMAP_CELL} items-center justify-center rounded-md transition-transform ${
                            count > 0 ? "cursor-pointer hover:scale-105" : ""
                          } ${isOpen ? "scale-105 ring-2 ring-slate-400/60" : ""}`}
                          style={{ backgroundColor: bg, color: fg }}
                        >
                          {count > 0 ? (
                            <span
                              className="flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold"
                              style={{ backgroundColor: `${fg}28`, color: fg }}
                            >
                              {count}
                            </span>
                          ) : null}
                        </div>
                        {isOpen && count > 0 ? (
                          <div
                            className={`pointer-events-auto absolute left-1/2 z-40 w-64 -translate-x-1/2 rounded-lg border border-slate-200 bg-white p-2 shadow-lg ${
                              popoverAbove ? "bottom-[calc(100%+6px)]" : "top-[calc(100%+6px)]"
                            }`}
                          >
                            <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                              Prob. {pl} × Imp. {il} · {count}
                            </p>
                            <ul className="max-h-44 space-y-0.5 overflow-y-auto">
                              {cellRisks.map((risk) => (
                                <li key={risk.id}>
                                  <button
                                    type="button"
                                    className="w-full rounded-md px-2 py-1.5 text-left hover:bg-slate-50"
                                    onClick={() => onOpenRisk(risk.id)}
                                  >
                                    <span className="line-clamp-2 text-xs font-medium text-slate-800">
                                      {risk.title}
                                    </span>
                                    <span className="mt-0.5 block truncate text-[10px] text-slate-500">
                                      {risk.project.name}
                                    </span>
                                  </button>
                                </li>
                              ))}
                            </ul>
                          </div>
                        ) : null}
                      </div>
                    );
                  }),
                )}
              </div>
              <div className="mt-1 grid grid-cols-5 gap-1 text-center text-[10px] text-slate-400">
                {[1, 2, 3, 4, 5].map((n) => (
                  <span key={n} className="w-[3.75rem]">
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
  projectGroups,
  projectHierarchy,
  deliverables,
  canEdit,
  prefill = null,
  initial,
  createAction,
  updateAction,
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
    const filterIds = resolveProjectFilterIds(projectHierarchy, projectFilter || null);
    return risks.filter((r) => {
      const projectOk = !filterIds || filterIds.includes(r.project.id);
      const hay =
        !ql ||
        r.title.toLowerCase().includes(ql) ||
        r.project.name.toLowerCase().includes(ql) ||
        r.ownerName.toLowerCase().includes(ql) ||
        r.category.toLowerCase().includes(ql);
      return projectOk && hay;
    });
  }, [risks, projectFilter, projectHierarchy, q]);

  const actionItems = useMemo(() => buildRiskActionItems(scopedRisks), [scopedRisks]);

  const today = useMemo(() => startOfToday(), []);

  const scopedActiveRisks = useMemo(
    () => scopedRisks.filter((r) => !r.dueDate || new Date(r.dueDate) >= today),
    [scopedRisks, today],
  );

  const kpis = useMemo(() => {
    const grossV = scopedActiveRisks.reduce((s, r) => s + vmeGross(r.probability, r.impactAmount), 0);
    const resV = scopedActiveRisks.reduce((s, r) => s + vmeResidual(r.residualProb, r.impactAmount), 0);
    const critical = scopedActiveRisks.filter((r) => residualScore(r.residualProb, r.impactAmount) > 10).length;
    const eff = grossV > 0 ? Math.round((1 - resV / grossV) * 100) : null;
    return { grossV, resV, critical, eff, activeCount: scopedActiveRisks.length };
  }, [scopedActiveRisks]);

  const detail = scopedRisks.find((x) => x.id === detailId) ?? risks.find((x) => x.id === detailId) ?? null;

  function exportRisksCsv() {
    const hdr = [
      "Proyecto",
      "Descripción",
      "Categoría",
      "Dueño",
      "Entregable",
      "Probabilidad %",
      "Impacto MXN",
      "VME bruto",
      "Prob. residual %",
      "VME residual",
      "Score residual",
      "Caducidad",
      "Plan B",
    ];
    const esc = (v: string) => `"${v.replace(/"/g, "'")}"`;
    const lines = [hdr.join(",")];
    for (const risk of scopedRisks) {
      const rs = residualScore(risk.residualProb, risk.impactAmount);
      const planB =
        rs > 10 ? (risk.contingency?.trim() ? "Definido" : "Falta") : "—";
      lines.push(
        [
          esc(risk.project.name),
          esc(risk.title),
          esc(risk.category),
          esc(risk.ownerName),
          esc(risk.deliverable?.title ?? ""),
          risk.probability,
          risk.impactAmount,
          vmeGross(risk.probability, risk.impactAmount),
          risk.residualProb,
          vmeResidual(risk.residualProb, risk.impactAmount),
          rs,
          risk.dueDate ? new Date(risk.dueDate).toLocaleDateString("es-MX") : "",
          planB,
        ].join(","),
      );
    }
    const blob = new Blob(["\uFEFF" + lines.join("\n")], {
      type: "text/csv;charset=utf-8",
    });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "registro-riesgos.csv";
    a.click();
    URL.revokeObjectURL(a.href);
  }

  return (
    <DashboardSectionShell
      eyebrow="Riesgos"
      title="Matriz y registro"
      titleAs="h1"
      headerTrailing={
        <>
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar riesgo…"
            className="h-10 w-[min(100%,12rem)] rounded-lg border border-slate-300 bg-white px-2.5 text-sm text-slate-900 shadow-sm outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-100 sm:w-[13rem]"
          />
          <DashboardScopeSelect
            value={projectFilter}
            onChange={(v) => {
              setProjectFilter(v);
              setFocusId(null);
            }}
            groups={projectGroups}
            allLabel="Todas las iniciativas"
            aria-label="Filtrar por iniciativa o subproyecto"
          />
        </>
      }
      bodyClassName="p-4"
    >
    <div className="space-y-4 text-slate-900">
      <div className={dashKpiTilesGrid}>
        <KpiTile
          tone="red"
          label={<RiskKpiLabel hint={RISK_KPI_HINTS.grossVme}>Exposición total VME</RiskKpiLabel>}
          value={fmtMoneyMxn(kpis.grossV)}
          sub={
            <>
              <span className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-red-500 align-middle" />
              {kpis.activeCount} riesgos activos
            </>
          }
        />
        <KpiTile
          tone="blue"
          label={<RiskKpiLabel hint={RISK_KPI_HINTS.residualVme}>VME residual</RiskKpiLabel>}
          value={fmtMoneyMxn(kpis.resV)}
          sub={
            <>
              <span className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-blue-500 align-middle" />
              tras mitigación
            </>
          }
        />
        <KpiTile
          tone="amber"
          label={<RiskKpiLabel hint={RISK_KPI_HINTS.critical}>Riesgos críticos</RiskKpiLabel>}
          value={kpis.critical}
          sub={
            <>
              <span className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-amber-500 align-middle" />
              score residual &gt; 10
            </>
          }
        />
        <KpiTile
          tone="emerald"
          label={<RiskKpiLabel hint={RISK_KPI_HINTS.mitigationEff}>Efectividad mitigación</RiskKpiLabel>}
          value={kpis.eff !== null ? `${kpis.eff}%` : "—"}
          sub={
            <>
              <span className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-emerald-500 align-middle" />
              reducción de exposición
            </>
          }
        />
      </div>

      <RisksActionQueue
        items={actionItems}
        activeId={focusId}
        onSelect={openDetail}
      />

      <section className={`${dashCard} p-4`}>
        <div className="mb-4">
          <h2 className={dashSectionTitle}>Mapa de calor</h2>
        </div>
        <div className="grid gap-8 sm:grid-cols-2">
          <HeatmapBlock label="Antes de mitigación" before={true} risks={scopedRisks} onOpenRisk={openDetail} />
          <HeatmapBlock label="Después de mitigación" before={false} risks={scopedRisks} onOpenRisk={openDetail} />
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
                className="h-[34px] whitespace-nowrap rounded-lg bg-slate-900 px-3.5 text-xs font-medium text-white hover:bg-slate-800"
              >
                + Nuevo riesgo
              </button>
            ) : (
              <p className={`${dashAlertWarn} py-1`}>Tu rol es solo lectura para este módulo.</p>
            )}
            <button
              type="button"
              onClick={exportRisksCsv}
              className="h-[34px] whitespace-nowrap rounded-lg border border-slate-300 bg-white px-3.5 text-xs font-medium hover:bg-slate-50"
            >
              CSV
            </button>
          </div>
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
                <th className="whitespace-nowrap px-3 py-2">Entregable</th>
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
                    <td className="max-w-[140px] px-3 py-3 align-middle" onClick={(e) => e.stopPropagation()}>
                      {risk.deliverable ? (
                        <Link
                          href={DELIVERABLE_DETAIL_IN_PROJECT(risk.deliverable.id, risk.project.id)}
                          className="block truncate text-slate-700 underline"
                          title={risk.deliverable.title}
                        >
                          {risk.deliverable.title}
                        </Link>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
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
                  <td colSpan={14} className="py-12 text-center text-sm text-slate-400">
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
                href={RISKS_PROJECT(detail.project.id)}
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
            {canEdit ? <RiskDetailEditForm risk={detail} updateAction={updateAction} /> : null}
          </div>
        </div>
      )}

      {createOpen && canEdit ? (
        <CreateRiskModal
          key={prefill ? `prefill-${prefill.projectId}` : "new"}
          projects={projects}
          projectGroups={projectGroups}
          deliverables={deliverables}
          prefill={prefill}
          createAction={createAction}
          onClose={() => setCreateOpen(false)}
        />
      ) : null}
    </div>
    </DashboardSectionShell>
  );
}
