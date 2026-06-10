import Link from "next/link";

import type { ProjectHierarchyGroup } from "@/lib/project-hierarchy";
import { projectCardAccent } from "@/lib/project-hierarchy-visuals";
import { PMO_PROJECT_DETAIL, PMO_PROJECTS } from "@/lib/dashboard-paths";

type ProjectAccessListProps = {
  fullAccess: boolean;
  groups: ProjectHierarchyGroup[];
};

function countSubprojects(groups: ProjectHierarchyGroup[]) {
  return groups.reduce((sum, group) => sum + group.subprojects.length, 0);
}

export function ProjectAccessList({ fullAccess, groups }: ProjectAccessListProps) {
  if (groups.length === 0) {
    return (
      <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-950">
        {fullAccess ? (
          <p>Esta organización aún no tiene iniciativas registradas.</p>
        ) : (
          <p>
            No tienes iniciativas asignadas. Pide a un administrador que configure tu alcance en{" "}
            <Link href="/dashboard/pmo/team" className="font-medium underline">
              Equipo
            </Link>
            .
          </p>
        )}
      </div>
    );
  }

  const initiativeCount = groups.length;
  const subprojectCount = countSubprojects(groups);

  return (
    <div className="mt-3">
      {fullAccess ? (
        <p className="text-sm text-slate-600">
          Tienes acceso a <strong>todas las iniciativas y subproyectos</strong> de esta organización.
        </p>
      ) : (
        <p className="text-sm text-slate-600">
          Estas son las iniciativas y subproyectos incluidos en tu alcance como PM.
        </p>
      )}

      <div className="mt-3 flex flex-wrap gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-700 shadow-sm">
          <span className="h-1.5 w-1.5 rounded-full bg-slate-400" aria-hidden />
          {initiativeCount} iniciativa{initiativeCount !== 1 ? "s" : ""}
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-700 shadow-sm">
          <span className="h-1.5 w-1.5 rounded-full bg-blue-500" aria-hidden />
          {subprojectCount} subproyecto{subprojectCount !== 1 ? "s" : ""}
        </span>
      </div>

      <ul className="mt-4 grid gap-3 sm:grid-cols-2">
        {groups.map((group, index) => {
          const accent = projectCardAccent(index);
          const subCount = group.subprojects.length;

          return (
            <li
              key={group.initiative.id}
              className={`rounded-xl border border-slate-200 border-t-4 bg-white p-4 shadow-sm transition hover:border-slate-300 hover:shadow-md ${accent}`}
            >
              <div className="flex items-start justify-between gap-2">
                <Link
                  href={PMO_PROJECT_DETAIL(group.initiative.id)}
                  className="text-sm font-semibold leading-snug text-slate-900 hover:text-blue-700 hover:underline"
                >
                  {group.initiative.name}
                </Link>
                <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-600">
                  {subCount > 0 ? `${subCount} sub` : "Directa"}
                </span>
              </div>

              {subCount > 0 ? (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {group.subprojects.map((sub) => (
                    <Link
                      key={sub.id}
                      href={PMO_PROJECT_DETAIL(sub.id)}
                      className="inline-flex max-w-full items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-800"
                    >
                      <span className="truncate">{sub.name}</span>
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="mt-3 inline-flex items-center rounded-full border border-dashed border-slate-200 bg-slate-50/80 px-2.5 py-1 text-xs text-slate-500">
                  Unidad de trabajo — sin subproyectos
                </p>
              )}
            </li>
          );
        })}
      </ul>

      <p className="mt-4 text-xs text-slate-500">
        Ver detalle en{" "}
        <Link href={PMO_PROJECTS} className="font-medium text-slate-700 underline hover:text-slate-900">
          PMO → Iniciativas
        </Link>
        .
      </p>
    </div>
  );
}
