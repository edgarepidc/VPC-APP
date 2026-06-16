"use client";

import type { ProjectHierarchyGroup } from "@/lib/project-hierarchy";

export type ProjectHierarchySelectProps = {
  value: string;
  onChange: (value: string) => void;
  groups: ProjectHierarchyGroup[];
  /** Incluir opción vacía (todos). */
  allowAll?: boolean;
  allLabel?: string;
  /** Opción vacía cuando allowAll es false (p. ej. «Selecciona un subproyecto»). */
  placeholderLabel?: string;
  /** Solo subproyectos + iniciativas legacy sin hijos (formularios de alta). */
  workScopeOnly?: boolean;
  className?: string;
  id?: string;
  name?: string;
  "aria-label"?: string;
};

function ProjectHierarchyOptions({
  groups,
  workScopeOnly,
}: {
  groups: ProjectHierarchyGroup[];
  workScopeOnly: boolean;
}) {
  if (workScopeOnly) {
    return groups.map((g) => {
      if (g.subprojects.length === 0) {
        return (
          <option key={g.initiative.id} value={g.initiative.id}>
            {g.initiative.name}
          </option>
        );
      }
      return (
        <optgroup key={g.initiative.id} label={g.initiative.name}>
          {g.subprojects.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </optgroup>
      );
    });
  }

  return groups.flatMap((g) => {
    const options = [
      <option key={g.initiative.id} value={g.initiative.id}>
        {g.initiative.name}
      </option>,
    ];
    for (const s of g.subprojects) {
      options.push(
        <option key={s.id} value={s.id}>
          {"\u00a0\u00a0"}
          {s.name}
        </option>,
      );
    }
    return options;
  });
}

export function ProjectHierarchySelect({
  value,
  onChange,
  groups,
  allowAll = true,
  allLabel = "Todas las iniciativas",
  placeholderLabel,
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
      {!allowAll && placeholderLabel ? (
        <option value="">{placeholderLabel}</option>
      ) : null}
      <ProjectHierarchyOptions groups={groups} workScopeOnly={workScopeOnly} />
    </select>
  );
}
