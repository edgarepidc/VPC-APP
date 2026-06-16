"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { DashboardScopeSelect } from "@/app/dashboard/_components/dashboard-scope-select";
import { DashboardSectionShell } from "@/app/dashboard/_components/section-shell";
import { KpiTile } from "@/app/dashboard/_components/kpi-tile";
import type { EscalationDetailRecord } from "@/app/dashboard/pmo/escalation-detail-dialog";
import {
  resolveProjectFilterIds,
  type ProjectHierarchyGroup,
  type ProjectHierarchyRow,
  workScopeProjectIds,
} from "@/lib/project-hierarchy";
import { dashSectionTitle } from "@/lib/ui-classes";

import { EscalometroClient } from "./escalometro-client";
import { ESCALOMETRO_KPI_HINTS } from "./escalometro-field-hints";
import { EscalometroKpiLabel } from "./escalometro-field-label";
import {
  EscalometroKeyboardLayer,
  EscalometroShortcutsHint,
} from "./escalometro-keyboard-layer";
import { EscalationHistoryList } from "./escalation-history-list";

const ESCALATION_TIERS = ["green", "orange", "red"] as const;
type EscalationTierFilter = (typeof ESCALATION_TIERS)[number];

const escalometroKpiGrid =
  "grid grid-cols-2 gap-1.5 min-[640px]:grid-cols-4 min-[640px]:gap-2";

const escalometroKpiTileClass = "!px-2 !py-1.5 !pl-2.5 min-w-0";
const escalometroKpiValueClass = "!text-xl";

type EscalometroManagerViewProps = {
  projects: { id: string; name: string }[];
  projectGroups: ProjectHierarchyGroup[];
  projectHierarchy: ProjectHierarchyRow[];
  historyRows: EscalationDetailRecord[];
  canSave: boolean;
  initial?: { project?: string; projectId?: string; q?: string; tier?: string };
};

function normalizeTier(raw: string | undefined): EscalationTierFilter | "" {
  const v = raw?.trim().toLowerCase();
  return ESCALATION_TIERS.includes(v as EscalationTierFilter) ? (v as EscalationTierFilter) : "";
}

function ClickableKpi({
  active,
  onClick,
  children,
}: {
  active?: boolean;
  onClick?: () => void;
  children: ReactNode;
}) {
  if (!onClick) return <>{children}</>;
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full rounded-lg text-left transition ${
        active ? "ring-2 ring-slate-800 ring-offset-1" : "hover:ring-1 hover:ring-slate-300"
      }`}
    >
      {children}
    </button>
  );
}

function defaultEvaluationProjectId(
  filter: string,
  projectHierarchy: ProjectHierarchyRow[],
): string {
  if (!filter) return "";
  const ids = resolveProjectFilterIds(projectHierarchy, filter);
  if (!ids || ids.length !== 1) return "";
  const workIds = new Set(workScopeProjectIds(projectHierarchy));
  return workIds.has(ids[0]!) ? ids[0]! : "";
}

export function EscalometroManagerView({
  projects,
  projectGroups,
  projectHierarchy,
  historyRows,
  canSave,
  initial,
}: EscalometroManagerViewProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [projectFilter, setProjectFilter] = useState(() => {
    const raw = initial?.project ?? initial?.projectId ?? "";
    if (raw && projectHierarchy.some((p) => p.id === raw)) return raw;
    return "";
  });
  const [q, setQ] = useState(initial?.q ?? "");
  const [tierFilter, setTierFilter] = useState<EscalationTierFilter | "">(() =>
    normalizeTier(initial?.tier),
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

  useEffect(() => {
    syncUrl({
      q: q.trim() || null,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- sync search only
  }, [q]);

  const scopedHistory = useMemo(() => {
    const filterIds = resolveProjectFilterIds(projectHierarchy, projectFilter || null);
    const ql = q.trim().toLowerCase();
    return historyRows.filter((row) => {
      const projectOk = !filterIds || filterIds.includes(row.project.id);
      const tierOk = !tierFilter || row.tier === tierFilter;
      const hay =
        !ql ||
        row.project.name.toLowerCase().includes(ql) ||
        row.title.toLowerCase().includes(ql) ||
        (row.topic ?? "").toLowerCase().includes(ql) ||
        row.authorName.toLowerCase().includes(ql);
      return projectOk && tierOk && hay;
    });
  }, [historyRows, projectFilter, projectHierarchy, q, tierFilter]);

  const kpis = useMemo(() => {
    const filterIds = resolveProjectFilterIds(projectHierarchy, projectFilter || null);
    const scoped = historyRows.filter(
      (row) => !filterIds || filterIds.includes(row.project.id),
    );
    const countTier = (tier: EscalationTierFilter) =>
      scoped.filter((row) => row.tier === tier).length;
    return {
      total: scoped.length,
      green: countTier("green"),
      orange: countTier("orange"),
      red: countTier("red"),
    };
  }, [historyRows, projectFilter, projectHierarchy]);

  const evaluationDefaultProjectId = useMemo(
    () => defaultEvaluationProjectId(projectFilter, projectHierarchy),
    [projectFilter, projectHierarchy],
  );

  return (
    <DashboardSectionShell
      eyebrow="Escalómetro"
      title="Evaluación de escalamiento"
      titleAs="h1"
      headerTrailing={
        <>
          <EscalometroKeyboardLayer />
          <input
            id="escalometro-search-input"
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar en historial…"
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
        <div className={escalometroKpiGrid}>
          <ClickableKpi active={!tierFilter} onClick={() => setTier("")}>
            <KpiTile
              tone="slate"
              className={escalometroKpiTileClass}
              valueClassName={escalometroKpiValueClass}
              label={
                <EscalometroKpiLabel hint={ESCALOMETRO_KPI_HINTS.total} compact>
                  Evaluaciones
                </EscalometroKpiLabel>
              }
              value={kpis.total}
            />
          </ClickableKpi>
          <ClickableKpi
            active={tierFilter === "green"}
            onClick={() => toggleTier("green")}
          >
            <KpiTile
              tone="emerald"
              className={escalometroKpiTileClass}
              valueClassName={escalometroKpiValueClass}
              label={
                <EscalometroKpiLabel hint={ESCALOMETRO_KPI_HINTS.green} compact>
                  Verde
                </EscalometroKpiLabel>
              }
              value={kpis.green}
            />
          </ClickableKpi>
          <ClickableKpi
            active={tierFilter === "orange"}
            onClick={() => toggleTier("orange")}
          >
            <KpiTile
              tone="amber"
              className={escalometroKpiTileClass}
              valueClassName={escalometroKpiValueClass}
              label={
                <EscalometroKpiLabel hint={ESCALOMETRO_KPI_HINTS.orange} compact>
                  Naranja
                </EscalometroKpiLabel>
              }
              value={kpis.orange}
            />
          </ClickableKpi>
          <ClickableKpi active={tierFilter === "red"} onClick={() => toggleTier("red")}>
            <KpiTile
              tone="rose"
              className={escalometroKpiTileClass}
              valueClassName={escalometroKpiValueClass}
              label={
                <EscalometroKpiLabel hint={ESCALOMETRO_KPI_HINTS.red} compact>
                  Rojo
                </EscalometroKpiLabel>
              }
              value={kpis.red}
            />
          </ClickableKpi>
        </div>

        <EscalometroClient
          projects={projects}
          projectGroups={projectGroups}
          canSave={canSave}
          defaultProjectId={evaluationDefaultProjectId}
        />

        <section>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className={dashSectionTitle}>Registros recientes</h2>
            <p className="text-sm text-slate-500">
              <strong className="text-slate-800">{scopedHistory.length}</strong> en el alcance
            </p>
          </div>
          <ul className="space-y-2">
            {scopedHistory.length > 0 ? (
              <EscalationHistoryList rows={scopedHistory} canCreateRisk={canSave} />
            ) : (
              <li className="rounded-lg border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500">
                {projectFilter || q.trim() || tierFilter
                  ? "No hay evaluaciones con los filtros actuales."
                  : "Aún no hay evaluaciones registradas. Completa el escalómetro y pulsa Evaluar."}
              </li>
            )}
          </ul>
        </section>

        <EscalometroShortcutsHint />
      </div>
    </DashboardSectionShell>
  );
}
