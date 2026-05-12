import type { RoleKey } from "@/lib/types";
import { db } from "@/lib/db";
import { canAddMemberSeat, PlanLimitError } from "@/modules/platform/limits";

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
      user: {
        select: {
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
    },
    orderBy: { user: { email: "asc" } },
  });
}

export async function assignRoleByEmail(input: {
  tenantId: string;
  email: string;
  roleKey: RoleKey;
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

  await db.membership.upsert({
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
  });
}
