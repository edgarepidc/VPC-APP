import Link from "next/link";

import type { ProjectHierarchyGroup } from "@/lib/project-hierarchy";
import { PMO_PROJECTS } from "@/lib/dashboard-paths";

type ProjectAccessListProps = {
  fullAccess: boolean;
  groups: ProjectHierarchyGroup[];
};

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

  return (
    <div className="mt-3">
      {fullAccess ? (
        <p className="mb-3 text-sm text-slate-600">
          Tienes acceso a <strong>todas las iniciativas y subproyectos</strong> de esta organización.
        </p>
      ) : (
        <p className="mb-3 text-sm text-slate-600">
          Estas son las iniciativas y subproyectos incluidos en tu alcance como PM.
        </p>
      )}

      <ul className="space-y-2">
        {groups.map((group) => (
          <li
            key={group.initiative.id}
            className="rounded-lg border border-slate-200 bg-slate-50/80 px-3 py-2.5"
          >
            <p className="text-sm font-semibold text-slate-900">{group.initiative.name}</p>
            {group.subprojects.length > 0 ? (
              <ul className="mt-2 space-y-1 border-l-2 border-slate-200 pl-3">
                {group.subprojects.map((sub) => (
                  <li key={sub.id} className="text-sm text-slate-700">
                    {sub.name}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-1 text-xs text-slate-500">
                Sin subproyectos — la iniciativa es tu unidad de trabajo.
              </p>
            )}
          </li>
        ))}
      </ul>

      <p className="mt-3 text-xs text-slate-500">
        Ver detalle en{" "}
        <Link href={PMO_PROJECTS} className="font-medium text-slate-700 underline">
          PMO → Iniciativas
        </Link>
        .
      </p>
    </div>
  );
}
