"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { type QuadrantId, getQuadrantId } from "@/lib/stakeholder-playbook";
import { DashboardScopeSelect } from "@/app/dashboard/_components/dashboard-scope-select";
import { DashboardSectionShell } from "@/app/dashboard/_components/section-shell";
import { KpiTile, dashKpiTilesGrid } from "@/app/dashboard/_components/kpi-tile";
import {
  dashAlertWarn,
  dashCard,
  dashSectionTitle,
  dashTabActive,
  dashTabIdle,
} from "@/lib/ui-classes";

import {
  resolveProjectFilterIds,
  type ProjectHierarchyGroup,
  type ProjectHierarchyRow,
} from "@/lib/project-hierarchy";

import { CreateStakeholderModal } from "./create-stakeholder-modal";
import {
  StakeholderMatrixClient,
  type MatrixStakeholder,
} from "./stakeholder-matrix-client";
import {
  buildStakeholderActionItems,
  type StakeholderActionItem,
} from "./stakeholder-action-utils";
import { STAKEHOLDER_KPI_HINTS } from "./stakeholder-field-hints";
import { StakeholderKpiLabel } from "./stakeholder-field-label";
import { StakeholdersActionQueue } from "./stakeholders-action-queue";
import {
  StakeholdersKeyboardLayer,
  StakeholdersShortcutsHint,
} from "./stakeholders-keyboard-layer";
import { StakeholdersRegisterView } from "./stakeholders-register-view";

const STAKEHOLDER_VIEWS = ["matrix", "register"] as const;
type StakeholderView = (typeof STAKEHOLDER_VIEWS)[number];

function normalizeView(raw: string | undefined): StakeholderView {
  const v = raw?.trim().toLowerCase();
  return STAKEHOLDER_VIEWS.includes(v as StakeholderView) ? (v as StakeholderView) : "matrix";
}

function normalizeQuadrant(raw: string | undefined): QuadrantId | "" {
  const v = raw?.trim().toLowerCase();
  if (v === "q1" || v === "q2" || v === "q3" || v === "q4") return v;
  return "";
}

type StakeholderManagerViewProps = {
  stakeholders: MatrixStakeholder[];
  projects: { id: string; name: string }[];
  projectGroups: ProjectHierarchyGroup[];
  projectHierarchy: ProjectHierarchyRow[];
  canEdit: boolean;
  initial?: { id?: string; project?: string; q?: string; view?: string; quadrant?: string };
  createAction: (formData: FormData) => void | Promise<void>;
  updateAction: (formData: FormData) => void | Promise<void>;
  deleteAction: (formData: FormData) => void | Promise<void>;
};

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

export function StakeholderManagerView({
  stakeholders,
  projects,
  projectGroups,
  projectHierarchy,
  canEdit,
  initial,
  createAction,
  updateAction,
  deleteAction,
}: StakeholderManagerViewProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const actionQueueRef = useRef<HTMLDivElement>(null);

  const [selectedId, setSelectedId] = useState<string | null>(initial?.id ?? null);
  const [projectFilter, setProjectFilter] = useState(() => {
    if (initial?.project && projectHierarchy.some((p) => p.id === initial.project)) {
      return initial.project;
    }
    return "";
  });
  const [q, setQ] = useState(initial?.q ?? "");
  const [panelView, setPanelView] = useState<StakeholderView>(() => normalizeView(initial?.view));
  const [quadrantFilter, setQuadrantFilter] = useState<QuadrantId | "">(() =>
    normalizeQuadrant(initial?.quadrant),
  );
  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<MatrixStakeholder | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<MatrixStakeholder | null>(null);

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
    setSelectedId(id);
    syncUrl({ id });
  }

  function closeDetail() {
    setSelectedId(null);
    syncUrl({ id: null });
  }

  function setView(next: StakeholderView) {
    setPanelView(next);
    syncUrl({ view: next === "matrix" ? null : next });
  }

  function setQuadrant(next: QuadrantId | "") {
    setQuadrantFilter(next);
    syncUrl({ quadrant: next || null });
  }

  useEffect(() => {
    if (initial?.id && stakeholders.some((s) => s.id === initial.id)) {
      openDetail(initial.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- deep link once
  }, [initial?.id, stakeholders]);

  useEffect(() => {
    syncUrl({
      project: projectFilter || null,
      q: q.trim() || null,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- sync filters only
  }, [projectFilter, q]);

  const projectScoped = useMemo(() => {
    const ql = q.trim().toLowerCase();
    const filterIds = resolveProjectFilterIds(projectHierarchy, projectFilter || null);
    return stakeholders.filter((s) => {
      const projectOk = !filterIds || filterIds.includes(s.projectId);
      const hay =
        !ql ||
        s.name.toLowerCase().includes(ql) ||
        (s.role ?? "").toLowerCase().includes(ql) ||
        s.projectName.toLowerCase().includes(ql) ||
        getQuadrantId(s.influence, s.interest).includes(ql);
      return projectOk && hay;
    });
  }, [stakeholders, projectFilter, projectHierarchy, q]);

  const scopedStakeholders = useMemo(() => {
    if (!quadrantFilter) return projectScoped;
    return projectScoped.filter(
      (s) => getQuadrantId(s.influence, s.interest) === quadrantFilter,
    );
  }, [projectScoped, quadrantFilter]);

  const scopedProjects = useMemo(() => {
    if (!projectFilter) return projects;
    const filterIds = resolveProjectFilterIds(projectHierarchy, projectFilter);
    if (filterIds) return projects.filter((p) => filterIds.includes(p.id));
    return projects.filter((p) => p.id === projectFilter);
  }, [projects, projectFilter, projectHierarchy]);

  const actionRows = useMemo(
    () =>
      projectScoped.map((s) => ({
        id: s.id,
        name: s.name,
        role: s.role,
        influence: s.influence,
        interest: s.interest,
        observation: s.observation,
        project: { id: s.projectId, name: s.projectName },
      })),
    [projectScoped],
  );

  const actionItems = useMemo(
    () => buildStakeholderActionItems(actionRows, scopedProjects),
    [actionRows, scopedProjects],
  );

  const kpis = useMemo(() => {
    const countQ = (qid: QuadrantId) =>
      projectScoped.filter((s) => getQuadrantId(s.influence, s.interest) === qid).length;
    const gaps = actionItems.filter(
      (i) => i.kinds.includes("project_empty") || i.kinds.includes("project_no_promoters"),
    ).length;
    return {
      total: projectScoped.length,
      promotores: countQ("q1"),
      latentes: countQ("q2"),
      gaps,
    };
  }, [projectScoped, actionItems]);

  function handleActionSelect(item: StakeholderActionItem) {
    if (projectFilter !== item.projectId) {
      setProjectFilter(item.projectId);
    }
    if (item.stakeholderId) openDetail(item.stakeholderId);
    else {
      closeDetail();
      setCreateOpen(true);
    }
  }

  function scrollToActionQueue() {
    actionQueueRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  const projectFilterLabel =
    !projectFilter
      ? "Todas las iniciativas"
      : projects.find((p) => p.id === projectFilter)?.name ??
        projectGroups
          .flatMap((g) => [g.initiative, ...g.subprojects])
          .find((p) => p.id === projectFilter)?.name ??
        "Alcance seleccionado";

  return (
    <DashboardSectionShell
      eyebrow="Interesados"
      title="Mapa de poder e interés"
      titleAs="h1"
      headerTrailing={
        <>
          <StakeholdersKeyboardLayer />
          <input
            id="stakeholders-search-input"
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar interesado…"
            className="h-10 w-[min(100%,12rem)] rounded-lg border border-slate-300 bg-white px-2.5 text-sm text-slate-900 shadow-sm outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-100 sm:w-[13rem]"
          />
          <DashboardScopeSelect
            value={projectFilter}
            onChange={setProjectFilter}
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
          <ClickableKpi active={!quadrantFilter} onClick={() => setQuadrant("")}>
            <KpiTile
              tone="slate"
              label={
                <StakeholderKpiLabel hint={STAKEHOLDER_KPI_HINTS.total}>Interesados</StakeholderKpiLabel>
              }
              value={kpis.total}
            />
          </ClickableKpi>
          <ClickableKpi
            active={quadrantFilter === "q1"}
            onClick={() => setQuadrant(quadrantFilter === "q1" ? "" : "q1")}
          >
            <KpiTile
              tone="emerald"
              label={
                <StakeholderKpiLabel hint={STAKEHOLDER_KPI_HINTS.promotores}>
                  Promotores (Q1)
                </StakeholderKpiLabel>
              }
              value={kpis.promotores}
            />
          </ClickableKpi>
          <ClickableKpi
            active={quadrantFilter === "q2"}
            onClick={() => setQuadrant(quadrantFilter === "q2" ? "" : "q2")}
          >
            <KpiTile
              tone="amber"
              label={
                <StakeholderKpiLabel hint={STAKEHOLDER_KPI_HINTS.latentes}>
                  Latentes (Q2)
                </StakeholderKpiLabel>
              }
              value={kpis.latentes}
            />
          </ClickableKpi>
          <ClickableKpi onClick={scrollToActionQueue}>
            <KpiTile
              tone="rose"
              label={
                <StakeholderKpiLabel hint={STAKEHOLDER_KPI_HINTS.gaps}>
                  Brechas de cobertura
                </StakeholderKpiLabel>
              }
              value={kpis.gaps}
            />
          </ClickableKpi>
        </div>

        <div ref={actionQueueRef}>
          <StakeholdersActionQueue
            items={actionItems}
            activeId={selectedId}
            onSelect={handleActionSelect}
          />
        </div>

        <section className={`${dashCard} p-4`}>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3">
              <h2 className={dashSectionTitle}>Interesados</h2>
              <nav className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setView("matrix")}
                  className={panelView === "matrix" ? dashTabActive : dashTabIdle}
                >
                  Matriz
                </button>
                <button
                  type="button"
                  onClick={() => setView("register")}
                  className={panelView === "register" ? dashTabActive : dashTabIdle}
                >
                  Registro
                </button>
              </nav>
            </div>
            {canEdit ? (
              <button
                type="button"
                onClick={() => {
                  setEditTarget(null);
                  setCreateOpen(true);
                }}
                className="h-9 shrink-0 whitespace-nowrap rounded-lg border border-violet-600 bg-violet-600 px-4 text-sm font-medium text-white shadow-sm transition hover:bg-violet-700"
              >
                + Nuevo interesado
              </button>
            ) : (
              <p className={`${dashAlertWarn} py-1`}>Tu rol es solo lectura para este módulo.</p>
            )}
          </div>

          {panelView === "matrix" ? (
            <StakeholderMatrixClient
              stakeholders={scopedStakeholders}
              projectFilterLabel={projectFilterLabel}
              selectedId={selectedId}
              onSelectId={(id) => (id ? openDetail(id) : closeDetail())}
              quadrantFilter={quadrantFilter}
              onQuadrantFilter={setQuadrant}
              canEdit={canEdit}
              onEdit={(s) => {
                setEditTarget(s);
                setCreateOpen(true);
              }}
              onDelete={(s) => setDeleteTarget(s)}
            />
          ) : (
            <StakeholdersRegisterView
              stakeholders={scopedStakeholders}
              selectedId={selectedId}
              onSelectId={(id) => (id ? openDetail(id) : closeDetail())}
              canEdit={canEdit}
              onEdit={(s) => {
                setEditTarget(s);
                setCreateOpen(true);
              }}
              onDelete={(s) => setDeleteTarget(s)}
            />
          )}
        </section>

        <StakeholdersShortcutsHint />

        {createOpen ? (
          <CreateStakeholderModal
            projects={projects}
            projectGroups={projectGroups}
            editStakeholder={editTarget}
            defaultProjectId={projectFilter || ""}
            createAction={createAction}
            updateAction={updateAction}
            onClose={() => {
              setCreateOpen(false);
              setEditTarget(null);
            }}
          />
        ) : null}

        {deleteTarget ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <button
              type="button"
              className="absolute inset-0 bg-black/45"
              aria-label="Cerrar"
              onClick={() => setDeleteTarget(null)}
            />
            <div className="relative w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-xl">
              <h3 className="text-lg font-semibold text-slate-900">Eliminar interesado</h3>
              <p className="mt-2 text-sm text-slate-600">
                ¿Eliminar a <strong>{deleteTarget.name}</strong> del mapa? Esta acción no se puede
                deshacer.
              </p>
              <form action={deleteAction} className="mt-4 flex justify-end gap-2">
                <input type="hidden" name="stakeholderId" value={deleteTarget.id} />
                <button
                  type="button"
                  onClick={() => setDeleteTarget(null)}
                  className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
                >
                  Eliminar
                </button>
              </form>
            </div>
          </div>
        ) : null}
      </div>
    </DashboardSectionShell>
  );
}
