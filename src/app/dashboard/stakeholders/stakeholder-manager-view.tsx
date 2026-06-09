"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { getQuadrantId } from "@/lib/stakeholder-playbook";
import {
  dashAlertWarn,
  dashCard,
  dashKpiGrid,
  dashKpiValue,
  dashSectionTitle,
  uiInput,
  uiLabel,
} from "@/lib/ui-classes";

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

type StakeholderManagerViewProps = {
  stakeholders: MatrixStakeholder[];
  projects: { id: string; name: string }[];
  canEdit: boolean;
  initial?: { id?: string; project?: string; q?: string };
  createAction: (formData: FormData) => void | Promise<void>;
  updateAction: (formData: FormData) => void | Promise<void>;
  deleteAction: (formData: FormData) => void | Promise<void>;
};

export function StakeholderManagerView({
  stakeholders,
  projects,
  canEdit,
  initial,
  createAction,
  updateAction,
  deleteAction,
}: StakeholderManagerViewProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [selectedId, setSelectedId] = useState<string | null>(initial?.id ?? null);
  const [projectFilter, setProjectFilter] = useState(() => {
    if (initial?.project && projects.some((p) => p.id === initial.project)) {
      return initial.project;
    }
    return "all";
  });
  const [q, setQ] = useState(initial?.q ?? "");
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

  useEffect(() => {
    if (initial?.id && stakeholders.some((s) => s.id === initial.id)) {
      openDetail(initial.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- deep link once
  }, [initial?.id, stakeholders]);

  useEffect(() => {
    syncUrl({
      project: projectFilter === "all" ? null : projectFilter,
      q: q.trim() || null,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- sync filters only
  }, [projectFilter, q]);

  const scopedStakeholders = useMemo(() => {
    const ql = q.trim().toLowerCase();
    return stakeholders.filter((s) => {
      const projectOk = projectFilter === "all" || s.projectId === projectFilter;
      const hay =
        !ql ||
        s.name.toLowerCase().includes(ql) ||
        (s.role ?? "").toLowerCase().includes(ql) ||
        s.projectName.toLowerCase().includes(ql) ||
        getQuadrantId(s.influence, s.interest).includes(ql);
      return projectOk && hay;
    });
  }, [stakeholders, projectFilter, q]);

  const scopedProjects = useMemo(() => {
    if (projectFilter === "all") return projects;
    return projects.filter((p) => p.id === projectFilter);
  }, [projects, projectFilter]);

  const actionRows = useMemo(
    () =>
      scopedStakeholders.map((s) => ({
        id: s.id,
        name: s.name,
        role: s.role,
        influence: s.influence,
        interest: s.interest,
        observation: s.observation,
        project: { id: s.projectId, name: s.projectName },
      })),
    [scopedStakeholders],
  );

  const actionItems = useMemo(
    () => buildStakeholderActionItems(actionRows, scopedProjects),
    [actionRows, scopedProjects],
  );

  const kpis = useMemo(() => {
    const promotores = scopedStakeholders.filter(
      (s) => getQuadrantId(s.influence, s.interest) === "q1",
    ).length;
    const latentes = scopedStakeholders.filter(
      (s) => getQuadrantId(s.influence, s.interest) === "q2",
    ).length;
    const gaps = actionItems.filter(
      (i) => i.kinds.includes("project_empty") || i.kinds.includes("project_no_promoters"),
    ).length;
    return { total: scopedStakeholders.length, promotores, latentes, gaps };
  }, [scopedStakeholders, actionItems]);

  function handleActionSelect(item: StakeholderActionItem) {
    if (projectFilter !== item.projectId && projectFilter !== "all") {
      setProjectFilter(item.projectId);
    } else if (projectFilter === "all") {
      setProjectFilter(item.projectId);
    }
    if (item.stakeholderId) openDetail(item.stakeholderId);
    else {
      closeDetail();
      setCreateOpen(true);
    }
  }

  return (
    <div className="space-y-4 text-slate-900">
      <div className={dashKpiGrid}>
        <div className={`${dashCard} p-4`}>
          <StakeholderKpiLabel hint={STAKEHOLDER_KPI_HINTS.total}>Interesados</StakeholderKpiLabel>
          <p className={dashKpiValue}>{kpis.total}</p>
        </div>
        <div className={`${dashCard} p-4`}>
          <StakeholderKpiLabel hint={STAKEHOLDER_KPI_HINTS.promotores}>
            Promotores (Q1)
          </StakeholderKpiLabel>
          <p className={`${dashKpiValue} text-green-700`}>{kpis.promotores}</p>
        </div>
        <div className={`${dashCard} p-4`}>
          <StakeholderKpiLabel hint={STAKEHOLDER_KPI_HINTS.latentes}>Latentes (Q2)</StakeholderKpiLabel>
          <p className={`${dashKpiValue} text-amber-600`}>{kpis.latentes}</p>
        </div>
        <div className={`${dashCard} p-4`}>
          <StakeholderKpiLabel hint={STAKEHOLDER_KPI_HINTS.gaps}>
            Brechas de cobertura
          </StakeholderKpiLabel>
          <p className={`${dashKpiValue} text-orange-600`}>{kpis.gaps}</p>
        </div>
      </div>

      <StakeholdersActionQueue
        items={actionItems}
        activeId={selectedId}
        onSelect={handleActionSelect}
      />

      <section className={`${dashCard} p-4`}>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className={dashSectionTitle}>Matriz de interesados</h2>
          <div className="flex flex-wrap items-center gap-2">
            <label className="flex items-center gap-2">
              <span className={uiLabel}>Buscar</span>
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Nombre, rol, cuadrante…"
                className={`${uiInput} w-44 sm:w-52`}
              />
            </label>
            {canEdit ? (
              <button
                type="button"
                onClick={() => {
                  setEditTarget(null);
                  setCreateOpen(true);
                }}
                className="rounded-lg bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-800"
              >
                + Nuevo interesado
              </button>
            ) : (
              <p className={`${dashAlertWarn} py-1`}>Tu rol es solo lectura para este módulo.</p>
            )}
          </div>
        </div>

        <StakeholderMatrixClient
          stakeholders={scopedStakeholders}
          projectNames={projects}
          projectFilter={projectFilter}
          onProjectFilterChange={setProjectFilter}
          selectedId={selectedId}
          onSelectId={(id) => (id ? openDetail(id) : closeDetail())}
          canEdit={canEdit}
          onEdit={(s) => {
            setEditTarget(s);
            setCreateOpen(true);
          }}
          onDelete={(s) => setDeleteTarget(s)}
        />
      </section>

      {createOpen ? (
        <CreateStakeholderModal
          projects={projects}
          editStakeholder={editTarget}
          defaultProjectId={projectFilter === "all" ? "" : projectFilter}
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
  );
}
