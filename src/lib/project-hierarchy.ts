/** Iniciativa = raíz (parentProjectId null). Subproyecto = unidad de trabajo. */

export type ProjectHierarchyRow = {
  id: string;
  name: string;
  parentProjectId: string | null;
  sortOrder?: number;
  status?: string;
};

export type ProjectHierarchyGroup = {
  initiative: { id: string; name: string };
  subprojects: { id: string; name: string }[];
};

export type ProjectOptionFlat = {
  id: string;
  name: string;
  parentProjectId: string | null;
  sortOrder: number;
};

export function buildProjectHierarchyGroups(
  projects: ProjectHierarchyRow[],
): ProjectHierarchyGroup[] {
  const roots = projects
    .filter((p) => !p.parentProjectId)
    .sort(
      (a, b) =>
        (a.sortOrder ?? 0) - (b.sortOrder ?? 0) ||
        a.name.localeCompare(b.name, "es"),
    );

  const childrenByParent = new Map<string, ProjectHierarchyRow[]>();
  for (const p of projects) {
    if (!p.parentProjectId) continue;
    const list = childrenByParent.get(p.parentProjectId) ?? [];
    list.push(p);
    childrenByParent.set(p.parentProjectId, list);
  }

  return roots.map((initiative) => {
    const subs = (childrenByParent.get(initiative.id) ?? []).sort(
      (a, b) =>
        (a.sortOrder ?? 0) - (b.sortOrder ?? 0) ||
        a.name.localeCompare(b.name, "es"),
    );
    return {
      initiative: { id: initiative.id, name: initiative.name },
      subprojects: subs.map((s) => ({ id: s.id, name: s.name })),
    };
  });
}

/** Cuenta iniciativas de primer nivel visibles (no subproyectos). */
export function countInitiativesInScope(
  projects: Pick<ProjectHierarchyRow, "id" | "parentProjectId">[],
): number {
  const initiativeIds = new Set<string>();
  for (const p of projects) {
    initiativeIds.add(p.parentProjectId ?? p.id);
  }
  return initiativeIds.size;
}

/** IDs de subproyectos bajo una iniciativa (vacío si no tiene hijos). */
export function subprojectIdsUnder(
  projects: ProjectHierarchyRow[],
  initiativeId: string,
): string[] {
  return projects
    .filter((p) => p.parentProjectId === initiativeId)
    .map((p) => p.id);
}

/** Proyectos donde se registran entregables, riesgos, etc.: subproyectos o iniciativas sin hijos (legacy). */
export function workScopeProjectIds(projects: ProjectHierarchyRow[]): string[] {
  const groups = buildProjectHierarchyGroups(projects);
  const ids: string[] = [];
  for (const g of groups) {
    if (g.subprojects.length > 0) {
      for (const s of g.subprojects) ids.push(s.id);
    } else {
      ids.push(g.initiative.id);
    }
  }
  return ids;
}

export function expandProjectIdsWithDescendants(
  all: ProjectHierarchyRow[],
  ids: string[],
): string[] {
  const childrenByParent = new Map<string, string[]>();
  for (const p of all) {
    if (!p.parentProjectId) continue;
    const list = childrenByParent.get(p.parentProjectId) ?? [];
    list.push(p.id);
    childrenByParent.set(p.parentProjectId, list);
  }
  const out = new Set<string>();
  const stack = [...ids];
  while (stack.length) {
    const id = stack.pop()!;
    if (out.has(id)) continue;
    out.add(id);
    for (const child of childrenByParent.get(id) ?? []) stack.push(child);
  }
  return [...out];
}

/**
 * Resuelve un filtro de UI (puede ser iniciativa o subproyecto) a IDs de filas visibles.
 * null = sin filtro (todos).
 */
export function resolveProjectFilterIds(
  projects: ProjectHierarchyRow[],
  filterId: string | null | undefined,
): string[] | null {
  if (!filterId?.trim()) return null;
  const id = filterId.trim();
  const row = projects.find((p) => p.id === id);
  if (!row) return [id];
  const childIds = subprojectIdsUnder(projects, id);
  if (childIds.length > 0) return childIds;
  if (row.parentProjectId) return [id];
  return [id];
}

export function projectDisplayLabel(
  project: ProjectHierarchyRow,
  initiativeName?: string | null,
): string {
  if (project.parentProjectId && initiativeName) {
    return `${initiativeName} · ${project.name}`;
  }
  return project.name;
}

export function initiativeNameFor(
  projects: ProjectHierarchyRow[],
  projectId: string,
): string | null {
  const row = projects.find((p) => p.id === projectId);
  if (!row?.parentProjectId) return null;
  return projects.find((p) => p.id === row.parentProjectId)?.name ?? null;
}
