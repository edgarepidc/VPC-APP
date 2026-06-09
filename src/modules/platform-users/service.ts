import { db } from "@/lib/db";
import { getAppUrl } from "@/lib/env";
import type { RoleKey } from "@/lib/types";
import { canAddMemberSeat, PlanLimitError } from "@/modules/platform/limits";
import { createAdminClient } from "@/utils/supabase/admin";

import {
  type ManagerProjectScopeInput,
  setMembershipProjectAccess,
} from "@/modules/memberships/project-access";

import {
  logUserAudit,
  USER_AUDIT_ACTIONS,
} from "./audit";

export type CreatePlatformUserResult =
  | { status: "created" }
  | { status: "linked"; message: string };

export type PasswordResetResult =
  | { mode: "temp"; password: string }
  | { mode: "link"; recoveryLink: string };

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function randomTempPassword(): string {
  const chars = "abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789!@#$";
  let out = "";
  for (let i = 0; i < 14; i++) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return out;
}

async function removeOrphanAppUserRowIfAuthUserIsGone(email: string): Promise<void> {
  const normalized = normalizeEmail(email);
  const row = await db.user.findUnique({
    where: { email: normalized },
    select: { id: true },
  });
  if (!row) return;

  const admin = createAdminClient();
  let res: Awaited<ReturnType<typeof admin.auth.admin.getUserById>>;
  try {
    res = await admin.auth.admin.getUserById(row.id);
  } catch {
    return;
  }

  if (res.data?.user) return;

  const err = res.error;
  const authUserMissing =
    !err ||
    err.status === 404 ||
    /not\s*found|user\s*not\s*found|no\s*user\s*found/i.test(err.message ?? "");

  if (!authUserMissing) return;

  await db.user.deleteMany({ where: { id: row.id } });
}

async function upsertMembership(input: {
  tenantId: string;
  userId: string;
  roleKey: RoleKey;
  managerScope?: ManagerProjectScopeInput;
}) {
  const role = await db.role.findUnique({
    where: {
      tenantId_key: {
        tenantId: input.tenantId,
        key: input.roleKey,
      },
    },
    select: { id: true },
  });
  if (!role) throw new Error("Rol no disponible para esta organización.");

  const existingMembership = await db.membership.findFirst({
    where: { tenantId: input.tenantId, userId: input.userId },
  });
  if (!existingMembership) {
    const seat = await canAddMemberSeat(input.tenantId);
    if (!seat.ok) throw new PlanLimitError(seat.message);
  }

  const membership = await db.membership.upsert({
    where: {
      tenantId_userId: {
        tenantId: input.tenantId,
        userId: input.userId,
      },
    },
    create: {
      tenantId: input.tenantId,
      userId: input.userId,
      roleId: role.id,
      status: "active",
    },
    update: {
      roleId: role.id,
      status: "active",
    },
    select: { id: true },
  });

  if (input.managerScope) {
    await setMembershipProjectAccess(
      membership.id,
      input.tenantId,
      input.roleKey,
      input.managerScope,
    );
  } else if (input.roleKey !== "manager") {
    await setMembershipProjectAccess(membership.id, input.tenantId, input.roleKey, {
      managerAllProjects: false,
      projectIds: [],
    });
  }
}

function buildAuthMetadata(input: {
  email: string;
  name?: string | null;
  phone?: string | null;
  jobTitle?: string | null;
  department?: string | null;
}) {
  return {
    name: input.name?.trim() || input.email,
    phone: input.phone?.trim() || null,
    jobTitle: input.jobTitle?.trim() || null,
    department: input.department?.trim() || null,
  };
}

export async function createPlatformUserDirect(input: {
  tenantId: string;
  email: string;
  password: string;
  name?: string;
  phone?: string;
  jobTitle?: string;
  department?: string;
  roleKey: RoleKey;
  managerScope?: ManagerProjectScopeInput;
  actorUserId?: string;
}): Promise<CreatePlatformUserResult> {
  const email = normalizeEmail(input.email);
  const name = input.name?.trim() || null;
  const phone = input.phone?.trim() || null;
  const jobTitle = input.jobTitle?.trim() || null;
  const department = input.department?.trim() || null;

  if (input.password.length < 8) {
    throw new Error("La contraseña debe tener al menos 8 caracteres.");
  }

  await removeOrphanAppUserRowIfAuthUserIsGone(email);

  const tenant = await db.tenant.findUnique({
    where: { id: input.tenantId },
    select: { name: true, slug: true },
  });

  const existing = await db.user.findUnique({
    where: { email },
    select: { id: true },
  });

  if (existing) {
    await upsertMembership({
      tenantId: input.tenantId,
      userId: existing.id,
      roleKey: input.roleKey,
      managerScope: input.managerScope,
    });
    await logUserAudit({
      userId: existing.id,
      actorUserId: input.actorUserId,
      action: USER_AUDIT_ACTIONS.MEMBERSHIP_ADDED,
      details: `${tenant?.name ?? input.tenantId} · rol ${input.roleKey}`,
    });
    return {
      status: "linked",
      message: "Ese correo ya existía; se asignó a la organización seleccionada.",
    };
  }

  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: input.password,
    email_confirm: true,
    user_metadata: buildAuthMetadata({ email, name, phone, jobTitle, department }),
  });

  if (error || !data.user) {
    const msg = error?.message ?? "No se pudo crear el usuario en Auth.";
    if (/already|registered|exists/i.test(msg)) {
      throw new Error("Ese correo ya está registrado en Supabase Auth.");
    }
    throw new Error(msg);
  }

  await db.user.create({
    data: {
      id: data.user.id,
      email,
      name,
      phone,
      jobTitle,
      department,
      isActive: true,
      lastSignInAt: data.user.last_sign_in_at
        ? new Date(data.user.last_sign_in_at)
        : null,
    },
  });

  await upsertMembership({
    tenantId: input.tenantId,
    userId: data.user.id,
    roleKey: input.roleKey,
    managerScope: input.managerScope,
  });

  await logUserAudit({
    userId: data.user.id,
    actorUserId: input.actorUserId,
    action: USER_AUDIT_ACTIONS.CREATED,
    details: `${email} · ${tenant?.name ?? input.tenantId} · ${input.roleKey}`,
  });

  return { status: "created" };
}

export async function listPlatformUsers(options?: {
  q?: string;
  tenantId?: string;
}) {
  const q = options?.q?.trim();
  const tenantId = options?.tenantId?.trim();

  const and: Array<Record<string, unknown>> = [];
  if (q) {
    and.push({
      OR: [
        { email: { contains: q, mode: "insensitive" } },
        { name: { contains: q, mode: "insensitive" } },
        { phone: { contains: q, mode: "insensitive" } },
        { jobTitle: { contains: q, mode: "insensitive" } },
        { department: { contains: q, mode: "insensitive" } },
      ],
    });
  }
  if (tenantId) {
    and.push({
      memberships: { some: { tenantId, status: "active" } },
    });
  }

  const where = and.length > 0 ? { AND: and } : undefined;

  return db.user.findMany({
    where,
    orderBy: [{ email: "asc" }],
    select: {
      id: true,
      email: true,
      name: true,
      phone: true,
      jobTitle: true,
      department: true,
      lastSignInAt: true,
      isActive: true,
      isSuperAdmin: true,
      createdAt: true,
      memberships: {
        where: { status: "active" },
        select: {
          id: true,
          managerAllProjects: true,
          role: { select: { key: true, name: true } },
          tenant: { select: { id: true, name: true, slug: true } },
          projectAccess: {
            select: { project: { select: { id: true, name: true } } },
          },
        },
        orderBy: { tenant: { name: "asc" } },
      },
    },
  });
}

export async function syncUsersLastSignIn(userIds: string[]): Promise<void> {
  const ids = [...new Set(userIds)].slice(0, 40);
  if (ids.length === 0) return;

  const admin = createAdminClient();
  await Promise.all(
    ids.map(async (id) => {
      try {
        const { data, error } = await admin.auth.admin.getUserById(id);
        if (error || !data.user) return;
        const last = data.user.last_sign_in_at
          ? new Date(data.user.last_sign_in_at)
          : null;
        await db.user.update({
          where: { id },
          data: { lastSignInAt: last },
        });
      } catch {
        /* ignore per-user sync errors */
      }
    }),
  );
}

export async function getUsersGrowthByMonth(months = 12) {
  const since = new Date();
  since.setMonth(since.getMonth() - (months - 1));
  since.setDate(1);
  since.setHours(0, 0, 0, 0);

  const users = await db.user.findMany({
    where: { createdAt: { gte: since } },
    select: { createdAt: true },
    orderBy: { createdAt: "asc" },
  });

  const buckets = new Map<string, number>();
  for (let i = 0; i < months; i++) {
    const d = new Date(since);
    d.setMonth(since.getMonth() + i);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    buckets.set(key, 0);
  }

  for (const u of users) {
    const d = u.createdAt;
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    if (buckets.has(key)) {
      buckets.set(key, (buckets.get(key) ?? 0) + 1);
    }
  }

  return [...buckets.entries()].map(([month, count]) => ({ month, count }));
}

export async function updatePlatformUserProfile(input: {
  userId: string;
  name?: string;
  phone?: string;
  jobTitle?: string;
  department?: string;
  isActive?: boolean;
  actorUserId?: string;
}) {
  const name = input.name?.trim() || null;
  const phone = input.phone?.trim() || null;
  const jobTitle = input.jobTitle?.trim() || null;
  const department = input.department?.trim() || null;

  const user = await db.user.findUnique({
    where: { id: input.userId },
    select: { id: true, email: true, isActive: true },
  });
  if (!user) throw new Error("Usuario no encontrado.");

  await db.user.update({
    where: { id: input.userId },
    data: {
      name,
      phone,
      jobTitle,
      department,
      ...(typeof input.isActive === "boolean" ? { isActive: input.isActive } : {}),
    },
  });

  const admin = createAdminClient();
  const { error } = await admin.auth.admin.updateUserById(input.userId, {
    user_metadata: buildAuthMetadata({
      email: user.email,
      name,
      phone,
      jobTitle,
      department,
    }),
    ...(input.isActive === false
      ? { ban_duration: "876000h" }
      : input.isActive === true
        ? { ban_duration: "none" }
        : {}),
  });

  if (error) throw new Error(error.message);

  await logUserAudit({
    userId: input.userId,
    actorUserId: input.actorUserId,
    action: USER_AUDIT_ACTIONS.PROFILE_UPDATED,
    details: [name, phone, jobTitle, department].filter(Boolean).join(" · ") || "perfil",
  });

  if (typeof input.isActive === "boolean" && input.isActive !== user.isActive) {
    await logUserAudit({
      userId: input.userId,
      actorUserId: input.actorUserId,
      action: input.isActive ? USER_AUDIT_ACTIONS.ACTIVATED : USER_AUDIT_ACTIONS.DEACTIVATED,
    });
  }
}

export async function addUserToTenant(input: {
  userId: string;
  tenantId: string;
  roleKey: RoleKey;
  managerScope?: ManagerProjectScopeInput;
  actorUserId?: string;
}) {
  const tenant = await db.tenant.findUnique({
    where: { id: input.tenantId },
    select: { name: true },
  });
  if (!tenant) throw new Error("Organización no encontrada.");

  await upsertMembership(input);

  await logUserAudit({
    userId: input.userId,
    actorUserId: input.actorUserId,
    action: USER_AUDIT_ACTIONS.MEMBERSHIP_ADDED,
    details: `${tenant.name} · rol ${input.roleKey}`,
  });
}

export async function changeUserMembershipRole(input: {
  userId: string;
  tenantId: string;
  roleKey: RoleKey;
  managerScope?: ManagerProjectScopeInput;
  actorUserId?: string;
}) {
  const tenant = await db.tenant.findUnique({
    where: { id: input.tenantId },
    select: { name: true },
  });
  if (!tenant) throw new Error("Organización no encontrada.");

  await upsertMembership(input);

  await logUserAudit({
    userId: input.userId,
    actorUserId: input.actorUserId,
    action: USER_AUDIT_ACTIONS.MEMBERSHIP_ROLE_CHANGED,
    details: `${tenant.name} · nuevo rol ${input.roleKey}`,
  });
}

export async function removeUserFromTenant(input: {
  userId: string;
  tenantId: string;
  actorUserId?: string;
}) {
  const tenant = await db.tenant.findUnique({
    where: { id: input.tenantId },
    select: { name: true },
  });

  const deleted = await db.membership.deleteMany({
    where: { userId: input.userId, tenantId: input.tenantId },
  });

  if (deleted.count === 0) {
    throw new Error("El usuario no pertenece a esa organización.");
  }

  await logUserAudit({
    userId: input.userId,
    actorUserId: input.actorUserId,
    action: USER_AUDIT_ACTIONS.MEMBERSHIP_REMOVED,
    details: tenant?.name ?? input.tenantId,
  });
}

export async function resetPlatformUserPassword(input: {
  userId: string;
  mode: "temp" | "link";
  actorUserId?: string;
}): Promise<PasswordResetResult> {
  const user = await db.user.findUnique({
    where: { id: input.userId },
    select: { id: true, email: true, isActive: true },
  });
  if (!user) throw new Error("Usuario no encontrado.");
  if (!user.isActive) throw new Error("No se puede resetear una cuenta desactivada.");

  const admin = createAdminClient();

  if (input.mode === "temp") {
    const password = randomTempPassword();
    const { error } = await admin.auth.admin.updateUserById(user.id, { password });
    if (error) throw new Error(error.message);

    await logUserAudit({
      userId: user.id,
      actorUserId: input.actorUserId,
      action: USER_AUDIT_ACTIONS.PASSWORD_RESET_TEMP,
      details: "Contraseña temporal generada por admin",
    });

    return { mode: "temp", password };
  }

  const redirectTo = `${getAppUrl().value}/login/restablecer`;
  const { data, error } = await admin.auth.admin.generateLink({
    type: "recovery",
    email: user.email,
    options: { redirectTo },
  });

  if (error || !data.properties?.action_link) {
    throw new Error(error?.message ?? "No se pudo generar el enlace de recuperación.");
  }

  await logUserAudit({
    userId: user.id,
    actorUserId: input.actorUserId,
    action: USER_AUDIT_ACTIONS.PASSWORD_RESET_LINK,
    details: "Enlace de recuperación generado",
  });

  return { mode: "link", recoveryLink: data.properties.action_link };
}

function csvEscape(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export async function buildUsersCsv(options?: { q?: string; tenantId?: string }) {
  const users = await listPlatformUsers(options);
  const header = [
    "email",
    "nombre",
    "telefono",
    "cargo",
    "departamento",
    "activo",
    "superadmin",
    "organizaciones",
    "roles",
    "ultimo_acceso",
    "alta",
  ].join(",");

  const lines = users.map((u) => {
    const orgs = u.memberships.map((m) => m.tenant.name).join("; ");
    const roles = u.memberships.map((m) => m.role.key).join("; ");
    return [
      csvEscape(u.email),
      csvEscape(u.name ?? ""),
      csvEscape(u.phone ?? ""),
      csvEscape(u.jobTitle ?? ""),
      csvEscape(u.department ?? ""),
      u.isActive ? "si" : "no",
      u.isSuperAdmin ? "si" : "no",
      csvEscape(orgs),
      csvEscape(roles),
      u.lastSignInAt ? u.lastSignInAt.toISOString() : "",
      u.createdAt.toISOString(),
    ].join(",");
  });

  return `\uFEFF${header}\n${lines.join("\n")}`;
}
