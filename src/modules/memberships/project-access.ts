import { db } from "@/lib/db";
import { expandProjectIdsWithDescendants } from "@/lib/project-hierarchy";
import type { RoleKey } from "@/lib/types";

export type ManagerProjectScopeInput = {
  managerAllProjects: boolean;
  managerReadOnly: boolean;
  projectIds: string[];
};

export type ProjectAccessScope =
  | { type: "all" }
  | { type: "restricted"; projectIds: string[] };

export function parseManagerProjectScopeFromForm(formData: FormData): ManagerProjectScopeInput {
  const roleKey = String(formData.get("role") ?? formData.get("roleKey") ?? "");
  if (roleKey !== "manager") {
    return { managerAllProjects: false, managerReadOnly: false, projectIds: [] };
  }

  const managerAllProjects = formData.get("managerAllProjects") === "on";
  const managerReadOnly = formData.get("managerReadOnly") === "on";
  const raw = String(formData.get("managerProjectIds") ?? "").trim();
  const projectIds = raw
    ? raw
        .split(",")
        .map((id) => id.trim())
        .filter(Boolean)
    : [];

  return { managerAllProjects, managerReadOnly, projectIds };
}

export async function getMembershipProjectScope(input: {
  tenantId: string;
  userId: string;
  role: RoleKey;
  isPlatformVisit?: boolean;
}): Promise<ProjectAccessScope> {
  if (input.role === "admin" || input.isPlatformVisit) {
    return { type: "all" };
  }

  if (input.role !== "manager") {
    return { type: "all" };
  }

  const membership = await db.membership.findFirst({
    where: { tenantId: input.tenantId, userId: input.userId, status: "active" },
    select: {
      managerAllProjects: true,
      projectAccess: { select: { projectId: true } },
    },
  });

  if (!membership) {
    return { type: "restricted", projectIds: [] };
  }

  if (membership.managerAllProjects) {
    return { type: "all" };
  }

  return {
    type: "restricted",
    projectIds: membership.projectAccess.map((row) => row.projectId),
  };
}

export function restrictToProjectIds(scope: ProjectAccessScope): string[] | undefined {
  if (scope.type === "all") return undefined;
  return scope.projectIds;
}

export async function assertCanAccessProject(input: {
  tenantId: string;
  userId: string;
  role: RoleKey;
  projectId: string;
  isPlatformVisit?: boolean;
}) {
  const scope = await getMembershipProjectScope(input);
  if (scope.type === "all") return;

  const all = await db.project.findMany({
    where: { tenantId: input.tenantId },
    select: { id: true, name: true, parentProjectId: true },
  });
  const expanded = new Set(expandProjectIdsWithDescendants(all, scope.projectIds));

  if (expanded.has(input.projectId)) return;

  const row = all.find((p) => p.id === input.projectId);
  if (row?.parentProjectId && expanded.has(row.parentProjectId)) return;

  throw new Error("No tienes acceso a este proyecto.");
}

export async function setMembershipProjectAccess(
  membershipId: string,
  tenantId: string,
  roleKey: RoleKey,
  scope: ManagerProjectScopeInput,
) {
  if (roleKey !== "manager") {
    await db.membership.update({
      where: { id: membershipId },
      data: { managerAllProjects: false, managerReadOnly: false },
    });
    await db.membershipProject.deleteMany({ where: { membershipId } });
    return;
  }

  if (scope.managerAllProjects) {
    await db.membership.update({
      where: { id: membershipId },
      data: {
        managerAllProjects: true,
        managerReadOnly: scope.managerReadOnly,
      },
    });
    await db.membershipProject.deleteMany({ where: { membershipId } });
    return;
  }

  const validProjects = await db.project.findMany({
    where: { tenantId, id: { in: scope.projectIds } },
    select: { id: true },
  });
  const validIds = validProjects.map((p) => p.id);

  if (validIds.length === 0) {
    throw new Error("Selecciona al menos un proyecto o marca «Todos los proyectos» para el PM.");
  }

  await db.membership.update({
    where: { id: membershipId },
    data: {
      managerAllProjects: false,
      managerReadOnly: scope.managerReadOnly,
    },
  });
  await db.membershipProject.deleteMany({ where: { membershipId } });
  await db.membershipProject.createMany({
    data: validIds.map((projectId) => ({ membershipId, projectId })),
    skipDuplicates: true,
  });
}

export async function setInvitationProjectAccess(
  invitationId: string,
  tenantId: string,
  roleKey: RoleKey,
  scope: ManagerProjectScopeInput,
) {
  await db.invitationProject.deleteMany({ where: { invitationId } });

  if (roleKey !== "manager") {
    await db.invitation.update({
      where: { id: invitationId },
      data: { managerAllProjects: false, managerReadOnly: false },
    });
    return;
  }

  if (scope.managerAllProjects) {
    await db.invitation.update({
      where: { id: invitationId },
      data: {
        managerAllProjects: true,
        managerReadOnly: scope.managerReadOnly,
      },
    });
    return;
  }

  const validProjects = await db.project.findMany({
    where: { tenantId, id: { in: scope.projectIds } },
    select: { id: true },
  });

  if (validProjects.length === 0) {
    throw new Error("Selecciona al menos un proyecto o marca «Todos los proyectos» para el PM.");
  }

  await db.invitation.update({
    where: { id: invitationId },
    data: {
      managerAllProjects: false,
      managerReadOnly: scope.managerReadOnly,
    },
  });
  await db.invitationProject.createMany({
    data: validProjects.map((p) => ({ invitationId, projectId: p.id })),
    skipDuplicates: true,
  });
}

export async function applyInvitationProjectAccessToMembership(
  invitationId: string,
  membershipId: string,
  tenantId: string,
) {
  const invitation = await db.invitation.findUnique({
    where: { id: invitationId },
    select: {
      roleKey: true,
      managerAllProjects: true,
      managerReadOnly: true,
      projectAccess: { select: { projectId: true } },
    },
  });
  if (!invitation) return;

  await setMembershipProjectAccess(membershipId, tenantId, invitation.roleKey as RoleKey, {
    managerAllProjects: invitation.managerAllProjects,
    managerReadOnly: invitation.managerReadOnly,
    projectIds: invitation.projectAccess.map((p) => p.projectId),
  });
}

export function formatProjectScopeLabel(input: {
  roleKey: string;
  managerAllProjects: boolean;
  projects: { id: string; name: string }[];
}): string {
  if (input.roleKey !== "manager") return "—";
  if (input.managerAllProjects) return "Todas las iniciativas";
  if (input.projects.length === 0) return "Sin iniciativas asignadas";
  if (input.projects.length <= 2) {
    return input.projects.map((p) => p.name).join(", ");
  }
  return `${input.projects.length} iniciativas`;
}
