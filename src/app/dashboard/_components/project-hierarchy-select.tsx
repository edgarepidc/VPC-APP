"use client";

import type { ProjectHierarchyGroup } from "@/lib/project-hierarchy";

export type ProjectHierarchySelectProps = {
  value: string;
  onChange: (value: string) => void;
  groups: ProjectHierarchyGroup[];
  /** Incluir opción vacía (todos). */
  allowAll?: boolean;
  allLabel?: string;
  /** Solo subproyectos + iniciativas legacy sin hijos (formularios de alta). */
  workScopeOnly?: boolean;
  className?: string;
  id?: string;
  name?: string;
  "aria-label"?: string;
};

export function ProjectHierarchySelect({
  value,
  onChange,
  groups,
  allowAll = true,
  allLabel = "Todas las iniciativas",
  workScopeOnly = false,
  className,
  id,
  "aria-label": ariaLabel,
  name,
}: ProjectHierarchySelectProps) {
  return (
    <select
      id={id}
      name={name}
      aria-label={ariaLabel}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={className}
    >
      {allowAll ? <option value="">{allLabel}</option> : null}
      {groups.map((g) => {
        if (g.subprojects.length === 0) {
          if (workScopeOnly) {
            return (
              <option key={g.initiative.id} value={g.initiative.id}>
                {g.initiative.name}
              </option>
            );
          }
          return (
            <optgroup key={g.initiative.id} label={g.initiative.name}>
              <option value={g.initiative.id}>{g.initiative.name} (iniciativa)</option>
            </optgroup>
          );
        }

        if (workScopeOnly) {
          return (
            <optgroup key={g.initiative.id} label={g.initiative.name}>
              {g.subprojects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </optgroup>
          );
        }

        return (
          <optgroup key={g.initiative.id} label={g.initiative.name}>
            <option value={g.initiative.id}>Toda la iniciativa</option>
            {g.subprojects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </optgroup>
        );
      })}
    </select>
  );
}
