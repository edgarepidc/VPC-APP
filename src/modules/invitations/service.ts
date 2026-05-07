import { db } from "@/lib/db";
import type { RoleKey } from "@/lib/types";

export async function upsertPendingInvitation(input: {
  tenantId: string;
  email: string;
  roleKey: RoleKey;
  invitedBy: string;
}) {
  const email = input.email.trim().toLowerCase();
  const existing = await db.invitation.findFirst({
    where: {
      tenantId: input.tenantId,
      email,
      status: "pending",
    },
    select: { id: true },
  });

  if (existing) {
    return db.invitation.update({
      where: { id: existing.id },
      data: { roleKey: input.roleKey, invitedBy: input.invitedBy },
    });
  }

  return db.invitation.create({
    data: {
      tenantId: input.tenantId,
      email,
      roleKey: input.roleKey,
      invitedBy: input.invitedBy,
      status: "pending",
    },
  });
}

export async function acceptPendingInvitationsForUser(input: {
  userId: string;
  email: string;
}) {
  const invitations = await db.invitation.findMany({
    where: {
      email: input.email.trim().toLowerCase(),
      status: "pending",
    },
    select: {
      id: true,
      tenantId: true,
      roleKey: true,
    },
  });

  for (const invitation of invitations) {
    const role = await db.role.findUnique({
      where: {
        tenantId_key: {
          tenantId: invitation.tenantId,
          key: invitation.roleKey,
        },
      },
      select: { id: true },
    });

    if (!role) continue;

    await db.membership.upsert({
      where: {
        tenantId_userId: {
          tenantId: invitation.tenantId,
          userId: input.userId,
        },
      },
      create: {
        tenantId: invitation.tenantId,
        userId: input.userId,
        roleId: role.id,
        status: "active",
      },
      update: {
        roleId: role.id,
        status: "active",
      },
    });

    await db.invitation.update({
      where: { id: invitation.id },
      data: { status: "accepted", acceptedAt: new Date() },
    });
  }
}
