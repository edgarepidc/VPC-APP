"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { DashboardScopeSelect } from "@/app/dashboard/_components/dashboard-scope-select";
import { DashboardSectionShell } from "@/app/dashboard/_components/section-shell";
import { EscalationHistoryList } from "@/app/dashboard/escalometro/escalation-history-list";
import {
  computeEscalationKpis,
  filterDeteriorationAlerts,
  filterEscalationHistory,
  normalizeEscalationTier,
  type EscalationTierFilter,
} from "@/app/dashboard/escalometro/escalation-filter-utils";
import { EscalationTierKpiGrid } from "@/app/dashboard/escalometro/escalation-tier-kpi-grid";
import {
  EscalometroKeyboardLayer,
  EscalometroShortcutsHint,
} from "@/app/dashboard/escalometro/escalometro-keyboard-layer";
import type { EscalationDetailRecord } from "@/app/dashboard/pmo/escalation-detail-dialog";
import {
  EscalationDeteriorationAlerts,
  type DeteriorationAlertRow,
} from "@/app/dashboard/pmo/escalation-deterioration-alerts";
import { exportEscalationHistoryCsv } from "@/lib/escalation-export-csv";
import type { ProjectHierarchyGroup, ProjectHierarchyRow } from "@/lib/project-hierarchy";
import { dashSectionTitle } from "@/lib/ui-classes";

type PmoEscalationsManagerViewProps = {
  projectGroups: ProjectHierarchyGroup[];
  projectHierarchy: ProjectHierarchyRow[];
  historyRows: EscalationDetailRecord[];
  deteriorationAlerts: DeteriorationAlertRow[];
  canCreateRisk: boolean;
  initial?: { id?: string; project?: string; projectId?: string; q?: string; tier?: string };
};

export function PmoEscalationsManagerView({
  projectGroups,
  projectHierarchy,
  historyRows,
  deteriorationAlerts,
  canCreateRisk,
  initial,
}: PmoEscalationsManagerViewProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [selectedId, setSelectedId] = useState<string | null>(initial?.id ?? null);
  const [projectFilter, setProjectFilter] = useState(() => {
    const raw = initial?.project ?? initial?.projectId ?? "";
    if (raw && projectHierarchy.some((p) => p.id === raw)) return raw;
    return "";
  });
  const [q, setQ] = useState(initial?.q ?? "");
  const [tierFilter, setTierFilter] = useState<EscalationTierFilter | "">(() =>
    normalizeEscalationTier(initial?.tier),
  );

  function syncUrl(patch: Record<string, string | null>) {
    const p = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(patch)) {
      if (value) p.set(key, value);
      else p.delete(key);
    }
    p.delete("projectId");
    const qs = p.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  function setProject(next: string) {
    setProjectFilter(next);
    syncUrl({ project: next || null });
  }

  function setTier(next: EscalationTierFilter | "") {
    setTierFilter(next);
    syncUrl({ tier: next || null });
  }

  function toggleTier(tier: EscalationTierFilter) {
    setTier(tierFilter === tier ? "" : tier);
  }

  function openDetail(id: string) {
    setSelectedId(id);
    syncUrl({ id });
  }

  function closeDetail() {
    setSelectedId(null);
    syncUrl({ id: null });
  }

  useEffect(() => {
    if (initial?.id && historyRows.some((row) => row.id === initial.id)) {
      openDetail(initial.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- deep link once
  }, [initial?.id, historyRows]);

  useEffect(() => {
    syncUrl({ q: q.trim() || null });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- sync search only
  }, [q]);

  const scopedHistory = useMemo(
    () =>
      filterEscalationHistory(historyRows, {
        projectHierarchy,
        projectFilter,
        q,
        tierFilter,
      }),
    [historyRows, projectHierarchy, projectFilter, q, tierFilter],
  );

  const kpis = useMemo(
    () => computeEscalationKpis(historyRows, projectHierarchy, projectFilter),
    [historyRows, projectHierarchy, projectFilter],
  );

  const scopedAlerts = useMemo(
    () => filterDeteriorationAlerts(deteriorationAlerts, projectHierarchy, projectFilter),
    [deteriorationAlerts, projectHierarchy, projectFilter],
  );

  return (
    <DashboardSectionShell
      eyebrow="PMO"
      title="Escalamientos"
      titleAs="h1"
      headerTrailing={
        <>
          <EscalometroKeyboardLayer />
          <input
            id="escalometro-search-input"
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar evaluaciones…"
            className="h-10 w-[min(100%,12rem)] rounded-lg border border-slate-300 bg-white px-2.5 text-sm text-slate-900 shadow-sm outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-100 sm:w-[13rem]"
          />
          <DashboardScopeSelect
            value={projectFilter}
            onChange={setProject}
            groups={projectGroups}
            allLabel="Todas las iniciativas"
            aria-label="Filtrar por iniciativa o subproyecto"
          />
        </>
      }
      bodyClassName="p-4"
    >
      <div className="space-y-4 text-slate-900">
        <EscalationDeteriorationAlerts
          alerts={scopedAlerts}
          viewAllHref={false}
          onProjectSelect={setProject}
        />

        <EscalationTierKpiGrid
          kpis={kpis}
          tierFilter={tierFilter}
          onClearTier={() => setTier("")}
          onToggleTier={toggleTier}
        />

        <section>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className={dashSectionTitle}>Historial de evaluaciones</h2>
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm text-slate-500">
                <strong className="text-slate-800">{scopedHistory.length}</strong> en el alcance
              </p>
              <button
                type="button"
                onClick={() => exportEscalationHistoryCsv(scopedHistory)}
                disabled={scopedHistory.length === 0}
                className="h-9 rounded-lg border border-slate-300 bg-white px-3.5 text-xs font-medium text-slate-800 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Exportar CSV
              </button>
            </div>
          </div>
          <ul className="space-y-2">
            {scopedHistory.length > 0 ? (
              <EscalationHistoryList
                rows={scopedHistory}
                canCreateRisk={canCreateRisk}
                selectedId={selectedId}
                onSelectedIdChange={(id) => (id ? openDetail(id) : closeDetail())}
              />
            ) : (
              <li className="rounded-lg border border-dashed border-slate-200 p-8 text-center text-sm text-slate-500">
                {projectFilter || q.trim() || tierFilter
                  ? "No hay evaluaciones con los filtros actuales."
                  : "Sin evaluaciones registradas."}
              </li>
            )}
          </ul>
        </section>

        <EscalometroShortcutsHint />
      </div>
    </DashboardSectionShell>
  );
}
