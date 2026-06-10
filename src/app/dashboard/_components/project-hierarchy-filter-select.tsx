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

/** Select nativo con optgroups para formularios GET (servidor). */
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
