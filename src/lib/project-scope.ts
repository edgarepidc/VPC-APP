import type { SessionUser } from "@/lib/types";
import {
  buildProjectHierarchyGroups,
  expandProjectIdsWithDescendants,
  type ProjectHierarchyGroup,
  type ProjectHierarchyRow,
} from "@/lib/project-hierarchy";
import {
  getMembershipProjectScope,
  restrictToProjectIds,
} from "@/modules/memberships/project-access";
import { listAllProjectsForTenant, listProjectsByTenant } from "@/modules/projects/service";

export async function getSessionProjectScope(session: SessionUser, tenantId: string) {
  return getMembershipProjectScope({
    tenantId,
    userId: session.userId,
    role: session.role,
    isPlatformVisit: session.isPlatformVisit,
  });
}

async function expandFilterIds(
  tenantId: string,
  restrictIds: string[] | undefined,
): Promise<string[] | undefined> {
  if (restrictIds === undefined) return undefined;
  const all = await listAllProjectsForTenant(tenantId);
  return expandProjectIdsWithDescendants(all, restrictIds);
}

export async function listProjectsForSession(
  session: SessionUser,
  tenantId: string,
  options?: { activeOnly?: boolean },
) {
  const scope = await getSessionProjectScope(session, tenantId);
  const restrictIds = restrictToProjectIds(scope);
  const expanded = await expandFilterIds(tenantId, restrictIds);
  const activeOnly = options?.activeOnly ?? session.role === "manager";
  return listProjectsByTenant(tenantId, {
    restrictToProjectIds: expanded,
    activeOnly,
  });
}

export async function getSessionProjectIdsFilter(
  session: SessionUser,
  tenantId: string,
): Promise<string[] | undefined> {
  const scope = await getSessionProjectScope(session, tenantId);
  const restrictIds = restrictToProjectIds(scope);
  return expandFilterIds(tenantId, restrictIds);
}

export async function getProjectHierarchyForSession(
  session: SessionUser,
  tenantId: string,
  options?: { activeOnly?: boolean },
): Promise<{
  projects: ProjectHierarchyRow[];
  groups: ProjectHierarchyGroup[];
}> {
  const projects = await listProjectsForSession(session, tenantId, options);
  const rows: ProjectHierarchyRow[] = projects.map((p) => ({
    id: p.id,
    name: p.name,
    parentProjectId: p.parentProjectId,
    sortOrder: p.sortOrder,
    status: p.status,
  }));
  return { projects: rows, groups: buildProjectHierarchyGroups(rows) };
}
