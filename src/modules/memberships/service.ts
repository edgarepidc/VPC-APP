import type { RoleKey } from "@/lib/types";
import { db } from "@/lib/db";
import { canAddMemberSeat, PlanLimitError } from "@/modules/platform/limits";

import {
  type ManagerProjectScopeInput,
  setMembershipProjectAccess,
} from "./project-access";

/** Usuarios con membresía activa (selector de responsable en tareas, etc.). */
export async function listMemberUsersForTenant(tenantId: string) {
  const rows = await db.membership.findMany({
    where: { tenantId, status: "active" },
    select: {
      user: { select: { id: true, name: true, email: true } },
    },
    orderBy: { user: { email: "asc" } },
  });
  return rows.map((r) => r.user);
}

export async function listMembersByTenant(tenantId: string) {
  return db.membership.findMany({
    where: { tenantId, status: "active" },
    select: {
      id: true,
      managerAllProjects: true,
      managerReadOnly: true,
      user: {
        select: {
          id: true,
          email: true,
          name: true,
        },
      },
      role: {
        select: {
          key: true,
          name: true,
        },
      },
      projectAccess: {
        select: {
          project: { select: { id: true, name: true } },
        },
      },
    },
    orderBy: { user: { email: "asc" } },
  });
}

export async function assignRoleByEmail(input: {
  tenantId: string;
  email: string;
  roleKey: RoleKey;
  managerScope?: ManagerProjectScopeInput;
}) {
  const normalizedEmail = input.email.trim().toLowerCase();
  const user = await db.user.findUnique({
    where: { email: normalizedEmail },
    select: { id: true },
  });

  if (!user) {
    throw new Error("Usuario no encontrado. Debe registrarse primero.");
  }

  const role = await db.role.findUnique({
    where: {
      tenantId_key: {
        tenantId: input.tenantId,
        key: input.roleKey,
      },
    },
    select: { id: true },
  });

  if (!role) {
    throw new Error("Rol no disponible para este tenant.");
  }

  const existingMembership = await db.membership.findFirst({
    where: { tenantId: input.tenantId, userId: user.id },
  });
  if (!existingMembership) {
    const seat = await canAddMemberSeat(input.tenantId);
    if (!seat.ok) {
      throw new PlanLimitError(seat.message);
    }
  }

  const membership = await db.membership.upsert({
    where: {
      tenantId_userId: {
        tenantId: input.tenantId,
        userId: user.id,
      },
    },
    create: {
      tenantId: input.tenantId,
      userId: user.id,
      roleId: role.id,
      status: "active",
    },
    update: {
      roleId: role.id,
      status: "active",
    },
    select: { id: true },
  });

  await setMembershipProjectAccess(
    membership.id,
    input.tenantId,
    input.roleKey,
    input.managerScope ?? { managerAllProjects: false, managerReadOnly: false, projectIds: [] },
  );
}

export async function updateMemberProjectAccess(input: {
  tenantId: string;
  membershipId: string;
  roleKey: RoleKey;
  managerScope: ManagerProjectScopeInput;
}) {
  const membership = await db.membership.findFirst({
    where: { id: input.membershipId, tenantId: input.tenantId, status: "active" },
    select: { id: true },
  });
  if (!membership) {
    throw new Error("Miembro no encontrado.");
  }

  await setMembershipProjectAccess(
    membership.id,
    input.tenantId,
    input.roleKey,
    input.managerScope,
  );
}
