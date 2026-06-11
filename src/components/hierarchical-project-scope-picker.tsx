"use client";

import type { ProjectHierarchyGroup } from "@/lib/project-hierarchy";

type HierarchicalProjectScopePickerProps = {
  groups: ProjectHierarchyGroup[];
  selected: Set<string>;
  onToggle: (id: string) => void;
  onToggleInitiative: (group: ProjectHierarchyGroup) => void;
  emptyMessage?: string;
};

export function HierarchicalProjectScopePicker({
  groups,
  selected,
  onToggle,
  onToggleInitiative,
  emptyMessage = "No hay iniciativas en esta organización.",
}: HierarchicalProjectScopePickerProps) {
  if (groups.length === 0) {
    return <p className="mt-2 text-xs text-amber-700">{emptyMessage}</p>;
  }

  return (
    <div className="mt-2 max-h-64 space-y-2 overflow-y-auto rounded-lg border border-slate-200 bg-white p-2.5">
      {groups.map((group) => {
        const initiativeSelected = selected.has(group.initiative.id);
        const subIds = group.subprojects.map((s) => s.id);
        const allSubsSelected =
          subIds.length > 0 && subIds.every((id) => selected.has(id));
        const partialSubs =
          subIds.length > 0 &&
          subIds.some((id) => selected.has(id)) &&
          !allSubsSelected &&
          !initiativeSelected;

        return (
          <div
            key={group.initiative.id}
            className="rounded-lg border border-slate-100 bg-slate-50/80 p-2.5"
          >
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => onToggleInitiative(group)}
                aria-pressed={initiativeSelected || allSubsSelected}
                className={
                  initiativeSelected || allSubsSelected
                    ? "inline-flex max-w-full items-center rounded-full border-2 border-violet-500 bg-violet-50 px-3 py-1 text-xs font-semibold text-violet-900"
                    : partialSubs
                      ? "inline-flex max-w-full items-center rounded-full border-2 border-violet-300 bg-violet-50/60 px-3 py-1 text-xs font-semibold text-violet-800"
                      : "inline-flex max-w-full items-center rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-700 hover:border-violet-200"
                }
              >
                <span className="truncate">{group.initiative.name}</span>
                {subIds.length > 0 ? (
                  <span className="ml-1 text-[10px] font-normal opacity-70">· todas</span>
                ) : null}
              </button>
              {subIds.length === 0 ? (
                <span className="text-[10px] text-slate-500">Iniciativa directa</span>
              ) : null}
            </div>

            {group.subprojects.length > 0 ? (
              <div className="mt-2 flex flex-wrap gap-1.5 pl-1">
                {group.subprojects.map((sub) => {
                  const isSelected =
                    selected.has(sub.id) || initiativeSelected || allSubsSelected;
                  return (
                    <button
                      key={sub.id}
                      type="button"
                      onClick={() => onToggle(sub.id)}
                      aria-pressed={isSelected}
                      className={
                        isSelected
                          ? "inline-flex max-w-full items-center rounded-full border-2 border-blue-500 bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-900"
                          : "inline-flex max-w-full items-center rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-600 hover:border-blue-200"
                      }
                    >
                      <span className="truncate">{sub.name}</span>
                    </button>
                  );
                })}
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

/** Normaliza ids seleccionados: iniciativa implica todos sus subproyectos en el set guardado. */
export function normalizeScopeSelection(
  groups: ProjectHierarchyGroup[],
  selected: Set<string>,
): string[] {
  const out = new Set<string>();
  for (const group of groups) {
    if (selected.has(group.initiative.id)) {
      out.add(group.initiative.id);
      continue;
    }
    for (const sub of group.subprojects) {
      if (selected.has(sub.id)) out.add(sub.id);
    }
    if (group.subprojects.length === 0 && selected.has(group.initiative.id)) {
      out.add(group.initiative.id);
    }
  }
  return [...out];
}

export function toggleScopeId(
  groups: ProjectHierarchyGroup[],
  selected: Set<string>,
  id: string,
): Set<string> {
  const next = new Set(selected);
  const group = groups.find(
    (g) => g.initiative.id === id || g.subprojects.some((s) => s.id === id),
  );
  if (!group) {
    if (next.has(id)) next.delete(id);
    else next.add(id);
    return next;
  }

  if (group.initiative.id === id) {
    if (next.has(id)) {
      next.delete(id);
      for (const sub of group.subprojects) next.delete(sub.id);
    } else {
      next.add(id);
      for (const sub of group.subprojects) next.delete(sub.id);
    }
    return next;
  }

  if (next.has(group.initiative.id)) {
    next.delete(group.initiative.id);
    for (const sub of group.subprojects) {
      if (sub.id !== id) next.add(sub.id);
    }
    return next;
  }

  if (next.has(id)) next.delete(id);
  else next.add(id);

  const allSubs = group.subprojects.every((s) => next.has(s.id));
  if (allSubs && group.subprojects.length > 0) {
    for (const sub of group.subprojects) next.delete(sub.id);
    next.add(group.initiative.id);
  }

  return next;
}

export function toggleScopeInitiative(
  groups: ProjectHierarchyGroup[],
  selected: Set<string>,
  group: ProjectHierarchyGroup,
): Set<string> {
  return toggleScopeId(groups, selected, group.initiative.id);
}
