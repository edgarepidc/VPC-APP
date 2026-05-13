import { db } from "@/lib/db";
import type { RoleKey } from "@/lib/types";
import { canAddMemberSeat, PlanLimitError } from "@/modules/platform/limits";
import { createAdminClient } from "@/utils/supabase/admin";

export type InviteAuthResult =
  | { status: "emailed" }
  | { status: "invitation_only"; message: string };

export async function inviteAuthUserToTenant(input: {
  tenantId: string;
  email: string;
  roleKey: RoleKey;
  invitedBy: string;
  /** URL absoluta (ej. `${getAppUrl().value}/login`) para enlaces del correo de Supabase. */
  redirectTo: string;
}): Promise<InviteAuthResult> {
  const email = input.email.trim().toLowerCase();

  await upsertPendingInvitation({
    tenantId: input.tenantId,
    email,
    roleKey: input.roleKey,
    invitedBy: input.invitedBy,
  });

  const admin = createAdminClient();
  const { error } = await admin.auth.admin.inviteUserByEmail(email, {
    data: { invitedTenantId: input.tenantId, roleKey: input.roleKey },
    redirectTo: input.redirectTo,
  });

  if (error) {
    const msg = error.message.toLowerCase();
    if (
      msg.includes("already") ||
      msg.includes("registered") ||
      msg.includes("exists") ||
      error.status === 422
    ) {
      return {
        status: "invitation_only",
        message:
          "Invitación al tenant guardada. Ese correo ya tiene cuenta: al iniciar sesión se unirá a la organización.",
      };
    }
    throw new Error(error.message);
  }

  return { status: "emailed" };
}

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

  const seat = await canAddMemberSeat(input.tenantId);
  if (!seat.ok) {
    throw new PlanLimitError(seat.message);
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
