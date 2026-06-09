import type { SessionUser } from "@/lib/types";
import {
  getMembershipProjectScope,
  restrictToProjectIds,
} from "@/modules/memberships/project-access";
import { listProjectsByTenant } from "@/modules/projects/service";

export async function getSessionProjectScope(session: SessionUser, tenantId: string) {
  return getMembershipProjectScope({
    tenantId,
    userId: session.userId,
    role: session.role,
    isPlatformVisit: session.isPlatformVisit,
  });
}

export async function listProjectsForSession(session: SessionUser, tenantId: string) {
  const scope = await getSessionProjectScope(session, tenantId);
  const restrictIds = restrictToProjectIds(scope);
  const activeOnly = session.role === "manager";
  return listProjectsByTenant(tenantId, {
    restrictToProjectIds: restrictIds,
    activeOnly,
  });
}

export async function getSessionProjectIdsFilter(
  session: SessionUser,
  tenantId: string,
): Promise<string[] | undefined> {
  const scope = await getSessionProjectScope(session, tenantId);
  return restrictToProjectIds(scope);
}
