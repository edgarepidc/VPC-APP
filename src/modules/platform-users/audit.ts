import { db } from "@/lib/db";

export const USER_AUDIT_ACTIONS = {
  CREATED: "user_created",
  PROFILE_UPDATED: "profile_updated",
  ACTIVATED: "activated",
  DEACTIVATED: "deactivated",
  PASSWORD_RESET_TEMP: "password_reset_temp",
  PASSWORD_RESET_LINK: "password_reset_link",
  MEMBERSHIP_ADDED: "membership_added",
  MEMBERSHIP_ROLE_CHANGED: "membership_role_changed",
  MEMBERSHIP_REMOVED: "membership_removed",
} as const;

export type UserAuditAction = (typeof USER_AUDIT_ACTIONS)[keyof typeof USER_AUDIT_ACTIONS];

export async function logUserAudit(input: {
  userId: string;
  actorUserId?: string | null;
  action: UserAuditAction | string;
  details?: string | null;
}) {
  await db.userAuditLog.create({
    data: {
      userId: input.userId,
      actorUserId: input.actorUserId ?? null,
      action: input.action,
      details: input.details ?? null,
    },
  });
}

export async function listPlatformUserAudits(options?: {
  take?: number;
  userId?: string;
}) {
  const take = Math.min(Math.max(options?.take ?? 40, 1), 100);
  return db.userAuditLog.findMany({
    where: options?.userId ? { userId: options.userId } : undefined,
    orderBy: { createdAt: "desc" },
    take,
    select: {
      id: true,
      action: true,
      details: true,
      createdAt: true,
      user: { select: { email: true, name: true } },
      actor: { select: { email: true, name: true } },
    },
  });
}

export function auditActionLabel(action: string): string {
  const map: Record<string, string> = {
    user_created: "Usuario creado",
    profile_updated: "Perfil actualizado",
    activated: "Cuenta activada",
    deactivated: "Cuenta desactivada",
    password_reset_temp: "Contraseña temporal",
    password_reset_link: "Enlace de recuperación",
    membership_added: "Asignado a organización",
    membership_role_changed: "Rol cambiado",
    membership_removed: "Removido de organización",
  };
  return map[action] ?? action;
}
