import { db } from "@/lib/db";
import type { RoleKey } from "@/lib/types";
import { canAddMemberSeat, PlanLimitError } from "@/modules/platform/limits";
import { createAdminClient } from "@/utils/supabase/admin";

export type CreatePlatformUserResult =
  | { status: "created" }
  | { status: "linked"; message: string };

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
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

  await db.membership.upsert({
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
  });
}

/**
 * Crea usuario en Supabase Auth con contraseña y email confirmado (sin correo de invitación).
 */
export async function createPlatformUserDirect(input: {
  tenantId: string;
  email: string;
  password: string;
  name?: string;
  phone?: string;
  roleKey: RoleKey;
}): Promise<CreatePlatformUserResult> {
  const email = normalizeEmail(input.email);
  const name = input.name?.trim() || null;
  const phone = input.phone?.trim() || null;

  if (input.password.length < 8) {
    throw new Error("La contraseña debe tener al menos 8 caracteres.");
  }

  await removeOrphanAppUserRowIfAuthUserIsGone(email);

  const existing = await db.user.findUnique({
    where: { email },
    select: { id: true },
  });

  if (existing) {
    await upsertMembership({
      tenantId: input.tenantId,
      userId: existing.id,
      roleKey: input.roleKey,
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
    user_metadata: {
      name: name ?? email,
      ...(phone ? { phone } : {}),
    },
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
      isActive: true,
    },
  });

  await upsertMembership({
    tenantId: input.tenantId,
    userId: data.user.id,
    roleKey: input.roleKey,
  });

  return { status: "created" };
}

export async function listPlatformUsers(options?: { q?: string }) {
  const q = options?.q?.trim();
  const where = q
    ? {
        OR: [
          { email: { contains: q, mode: "insensitive" as const } },
          { name: { contains: q, mode: "insensitive" as const } },
          { phone: { contains: q, mode: "insensitive" as const } },
        ],
      }
    : undefined;

  return db.user.findMany({
    where,
    orderBy: [{ email: "asc" }],
    select: {
      id: true,
      email: true,
      name: true,
      phone: true,
      isActive: true,
      isSuperAdmin: true,
      createdAt: true,
      memberships: {
        where: { status: "active" },
        select: {
          role: { select: { key: true, name: true } },
          tenant: { select: { id: true, name: true, slug: true } },
        },
        orderBy: { tenant: { name: "asc" } },
      },
    },
  });
}

export async function updatePlatformUserProfile(input: {
  userId: string;
  name?: string;
  phone?: string;
  isActive?: boolean;
}) {
  const name = input.name?.trim() || null;
  const phone = input.phone?.trim() || null;

  const user = await db.user.findUnique({
    where: { id: input.userId },
    select: { id: true, email: true },
  });
  if (!user) throw new Error("Usuario no encontrado.");

  await db.user.update({
    where: { id: input.userId },
    data: {
      name,
      phone,
      ...(typeof input.isActive === "boolean" ? { isActive: input.isActive } : {}),
    },
  });

  const admin = createAdminClient();
  const { error } = await admin.auth.admin.updateUserById(input.userId, {
    user_metadata: {
      name: name ?? user.email,
      ...(phone ? { phone } : { phone: null }),
    },
    ...(input.isActive === false
      ? { ban_duration: "876000h" }
      : input.isActive === true
        ? { ban_duration: "none" }
        : {}),
  });

  if (error) {
    throw new Error(error.message);
  }
}
