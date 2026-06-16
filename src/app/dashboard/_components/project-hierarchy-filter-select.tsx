import type { ProjectHierarchyGroup } from "@/lib/project-hierarchy";

type Props = {
  name: string;
  groups: ProjectHierarchyGroup[];
  defaultValue?: string;
  allLabel?: string;
  className?: string;
  workScopeOnly?: boolean;
  id?: string;
};

function ProjectHierarchyFilterOptions({
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

/** Select nativo con jerarquía iniciativa → subproyecto para formularios GET (servidor). */
export function ProjectHierarchyFilterSelect({
  name,
  groups,
  defaultValue = "",
  allLabel = "Todas las iniciativas",
  className,
  workScopeOnly = false,
  id,
}: Props) {
  return (
    <select id={id} name={name} defaultValue={defaultValue} className={className}>
      <option value="">{allLabel}</option>
      <ProjectHierarchyFilterOptions groups={groups} workScopeOnly={workScopeOnly} />
    </select>
  );
}
