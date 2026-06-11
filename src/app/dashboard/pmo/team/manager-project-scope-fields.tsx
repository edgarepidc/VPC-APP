"use client";

import { useEffect, useMemo, useState } from "react";

import {
  HierarchicalProjectScopePicker,
  normalizeScopeSelection,
  toggleScopeId,
  toggleScopeInitiative,
} from "@/components/hierarchical-project-scope-picker";
import { InitiativeScopeChips } from "@/components/initiative-scope-chips";
import type { ProjectHierarchyGroup } from "@/lib/project-hierarchy";
import { uiLabel } from "@/lib/ui-classes";
import type { RoleKey } from "@/lib/types";

export type ProjectOption = { id: string; name: string };

type Props = {
  projects: ProjectOption[];
  groups?: ProjectHierarchyGroup[];
  roleSelectName?: string;
  initialRole?: RoleKey;
  initialAllProjects?: boolean;
  initialReadOnly?: boolean;
  initialProjectIds?: string[];
};

export function ManagerProjectScopeFields({
  projects,
  groups,
  roleSelectName = "role",
  initialRole = "member",
  initialAllProjects = false,
  initialReadOnly = false,
  initialProjectIds = [],
}: Props) {
  const [role, setRole] = useState<RoleKey>(initialRole);
  const [allProjects, setAllProjects] = useState(initialAllProjects);
  const [readOnly, setReadOnly] = useState(initialReadOnly);
  const [selected, setSelected] = useState<Set<string>>(new Set(initialProjectIds));

  useEffect(() => {
    const form = document.querySelector(`select[name="${roleSelectName}"]`);
    if (!form) return;
    const handler = () => setRole((form as HTMLSelectElement).value as RoleKey);
    form.addEventListener("change", handler);
    return () => form.removeEventListener("change", handler);
  }, [roleSelectName]);

  const useHierarchy = Boolean(groups && groups.length > 0);
  const normalizedIds = useMemo(
    () => (useHierarchy && groups ? normalizeScopeSelection(groups, selected) : [...selected]),
    [useHierarchy, groups, selected],
  );

  if (role !== "manager") return null;

  const toggle = (id: string) => {
    if (useHierarchy && groups) {
      setSelected(toggleScopeId(groups, selected, id));
    } else {
      setSelected((prev) => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      });
    }
  };

  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
      <p className="text-sm font-medium text-slate-900">Iniciativas del PM</p>
      <p className="mt-0.5 text-xs text-slate-600">
        Elige iniciativas completas o subproyectos concretos; el PM solo verá lo asignado.
      </p>

      <label className="mt-3 flex items-center gap-2 text-sm text-slate-800">
        <input
          type="checkbox"
          name="managerAllProjects"
          checked={allProjects}
          onChange={(e) => setAllProjects(e.target.checked)}
          className="rounded border-slate-300"
        />
        Todas las iniciativas de la organización
      </label>

      <label className="mt-2 flex items-center gap-2 text-sm text-slate-800">
        <input
          type="checkbox"
          name="managerReadOnly"
          checked={readOnly}
          onChange={(e) => setReadOnly(e.target.checked)}
          className="rounded border-slate-300"
        />
        Solo lectura (consulta sin crear ni editar)
      </label>

      {!allProjects ? (
        <div className="mt-3">
          <span className={uiLabel}>Alcance asignado</span>
          {useHierarchy && groups ? (
            <HierarchicalProjectScopePicker
              groups={groups}
              selected={selected}
              onToggle={toggle}
              onToggleInitiative={(group) =>
                setSelected(toggleScopeInitiative(groups, selected, group))
              }
            />
          ) : (
            <InitiativeScopeChips
              projects={projects}
              selected={selected}
              onToggle={toggle}
              emptyMessage="No hay iniciativas en esta organización. Crea iniciativas antes de asignar un PM."
            />
          )}
          <input type="hidden" name="managerProjectIds" value={normalizedIds.join(",")} />
        </div>
      ) : (
        <input type="hidden" name="managerProjectIds" value="" />
      )}
    </div>
  );
}
