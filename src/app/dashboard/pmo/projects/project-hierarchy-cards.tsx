import Link from "next/link";

import {
  DELIVERABLES_PROJECT,
  PMO_ESCALATIONS_PROJECT,
  PMO_MEETINGS_PROJECT,
  PMO_PROJECT_DETAIL,
  RISKS_PROJECT,
} from "@/lib/dashboard-paths";
import type { ProjectHierarchyGroup } from "@/lib/project-hierarchy";
import { projectCardAccent } from "@/lib/project-hierarchy-visuals";
import { getProjectStatusBadge } from "@/lib/ui";
import { uiButtonPrimary, uiInput, uiLabel } from "@/lib/ui-classes";

import { DeleteProjectForm } from "./delete-project-form";
import { EditProjectForm } from "./edit-project-form";

export type ProjectCatalogRow = {
  id: string;
  name: string;
  description: string | null;
  status: string;
  parentProjectId: string | null;
};

type ProjectHierarchyCardsProps = {
  groups: ProjectHierarchyGroup[];
  items: ProjectCatalogRow[];
  canManageCatalog: boolean;
  createSubprojectAction: (formData: FormData) => Promise<void>;
  updateProjectAction: (formData: FormData) => Promise<void>;
  deleteProjectAction: (formData: FormData) => Promise<void>;
};

const MODULE_LINKS = [
  { label: "Entregables", href: DELIVERABLES_PROJECT },
  { label: "Riesgos", href: RISKS_PROJECT },
  { label: "Escalamientos", href: PMO_ESCALATIONS_PROJECT },
  { label: "Reuniones", href: PMO_MEETINGS_PROJECT },
] as const;

function ModuleLinkChips({ projectId }: { projectId: string }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {MODULE_LINKS.map(({ label, href }) => (
        <Link
          key={label}
          href={href(projectId)}
          className="inline-flex items-center rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-600 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-800"
        >
          {label}
        </Link>
      ))}
    </div>
  );
}

function AdminActions({
  canManage,
  updateAction,
  deleteAction,
  project,
}: {
  canManage: boolean;
  updateAction: (formData: FormData) => Promise<void>;
  deleteAction: (formData: FormData) => Promise<void>;
  project: ProjectCatalogRow;
}) {
  if (!canManage) return null;

  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      <EditProjectForm
        updateAction={updateAction}
        projectId={project.id}
        initialName={project.name}
        initialDescription={project.description}
        initialStatus={project.status}
      />
      <DeleteProjectForm
        deleteAction={deleteAction}
        projectId={project.id}
        projectName={project.name}
      />
    </div>
  );
}

function SubprojectCard({
  sub,
  canManageCatalog,
  updateProjectAction,
  deleteProjectAction,
}: {
  sub: ProjectCatalogRow;
  canManageCatalog: boolean;
  updateProjectAction: (formData: FormData) => Promise<void>;
  deleteProjectAction: (formData: FormData) => Promise<void>;
}) {
  const statusBadge = getProjectStatusBadge(sub.status);

  return (
    <li className="rounded-lg border border-slate-200 bg-slate-50/60 p-3 transition hover:border-slate-300 hover:bg-white">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-sky-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-sky-800">
              Subproyecto
            </span>
            <span className={statusBadge.className}>{statusBadge.label}</span>
          </div>
          <Link
            href={PMO_PROJECT_DETAIL(sub.id)}
            className="mt-1.5 block text-sm font-semibold text-slate-900 hover:text-blue-700 hover:underline"
          >
            {sub.name}
          </Link>
          {sub.description?.trim() ? (
            <p className="mt-1 text-xs leading-relaxed text-slate-600">{sub.description.trim()}</p>
          ) : null}
        </div>
        <AdminActions
          canManage={canManageCatalog}
          updateAction={updateProjectAction}
          deleteAction={deleteProjectAction}
          project={sub}
        />
      </div>
      <div className="mt-3 border-t border-slate-200/80 pt-2.5">
        <ModuleLinkChips projectId={sub.id} />
      </div>
    </li>
  );
}

export function ProjectHierarchyCards({
  groups,
  items,
  canManageCatalog,
  createSubprojectAction,
  updateProjectAction,
  deleteProjectAction,
}: ProjectHierarchyCardsProps) {
  if (groups.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-slate-500">
        Sin iniciativas.
        {canManageCatalog ? " Usa «Nueva iniciativa» arriba." : null}
      </p>
    );
  }

  const subprojectCount = groups.reduce((sum, g) => sum + g.subprojects.length, 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 px-1">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-700 shadow-sm">
          <span className="h-1.5 w-1.5 rounded-full bg-slate-400" aria-hidden />
          {groups.length} iniciativa{groups.length !== 1 ? "s" : ""}
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-700 shadow-sm">
          <span className="h-1.5 w-1.5 rounded-full bg-blue-500" aria-hidden />
          {subprojectCount} subproyecto{subprojectCount !== 1 ? "s" : ""}
        </span>
      </div>

      <ul className="space-y-4">
        {groups.map((group, index) => {
          const initiative = items.find((p) => p.id === group.initiative.id);
          if (!initiative) return null;

          const statusBadge = getProjectStatusBadge(initiative.status);
          const accent = projectCardAccent(index);
          const subCount = group.subprojects.length;

          return (
            <li
              key={group.initiative.id}
              className={`rounded-xl border border-slate-200 border-t-4 bg-white p-4 shadow-sm transition hover:border-slate-300 hover:shadow-md sm:p-5 ${accent}`}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-violet-800">
                      Iniciativa
                    </span>
                    <span className={statusBadge.className}>{statusBadge.label}</span>
                    {subCount > 0 ? (
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-600">
                        {subCount} sub
                      </span>
                    ) : (
                      <span className="rounded-full border border-dashed border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-medium text-slate-500">
                        Directa
                      </span>
                    )}
                  </div>
                  <Link
                    href={PMO_PROJECT_DETAIL(group.initiative.id)}
                    className="mt-2 block text-base font-semibold leading-snug text-slate-900 hover:text-blue-700 hover:underline"
                  >
                    {group.initiative.name}
                  </Link>
                  {initiative.description?.trim() ? (
                    <p className="mt-1.5 max-w-3xl text-sm leading-relaxed text-slate-600">
                      {initiative.description.trim()}
                    </p>
                  ) : null}
                </div>
                <AdminActions
                  canManage={canManageCatalog}
                  updateAction={updateProjectAction}
                  deleteAction={deleteProjectAction}
                  project={initiative}
                />
              </div>

              {subCount === 0 ? (
                <div className="mt-4 border-t border-slate-100 pt-3">
                  <ModuleLinkChips projectId={group.initiative.id} />
                </div>
              ) : (
                <ul className="mt-4 space-y-2">
                  {group.subprojects.map((sp) => {
                    const sub = items.find((p) => p.id === sp.id);
                    if (!sub) return null;
                    return (
                      <SubprojectCard
                        key={sp.id}
                        sub={sub}
                        canManageCatalog={canManageCatalog}
                        updateProjectAction={updateProjectAction}
                        deleteProjectAction={deleteProjectAction}
                      />
                    );
                  })}
                </ul>
              )}

              {canManageCatalog ? (
                <details className="mt-4 border-t border-slate-100 pt-3 text-sm">
                  <summary className="cursor-pointer font-medium text-slate-600 hover:text-slate-900">
                    + Subproyecto en {group.initiative.name}
                  </summary>
                  <form
                    action={createSubprojectAction}
                    className="mt-3 grid max-w-lg gap-2 rounded-lg border border-slate-200 bg-slate-50/80 p-3"
                  >
                    <input type="hidden" name="parentProjectId" value={group.initiative.id} />
                    <div>
                      <label className={uiLabel}>Nombre del subproyecto</label>
                      <input name="name" required maxLength={200} className={`mt-1 ${uiInput}`} />
                    </div>
                    <div>
                      <label className={uiLabel}>Descripción</label>
                      <input name="description" maxLength={500} className={`mt-1 ${uiInput}`} />
                    </div>
                    <button
                      type="submit"
                      className={uiButtonPrimary.replace("w-full ", "w-auto !py-1.5 text-xs")}
                    >
                      Crear subproyecto
                    </button>
                  </form>
                </details>
              ) : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
