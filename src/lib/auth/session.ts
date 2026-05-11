import { Prisma } from "@prisma/client";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import type { SessionUser } from "@/lib/types";
import { db } from "@/lib/db";
import { acceptPendingInvitationsForUser } from "@/modules/invitations/service";
import { TENANT_COOKIE } from "@/lib/tenant-cookie";
import { getSupabasePublicEnv } from "@/utils/supabase/env";
import { createClient } from "@/utils/supabase/server";

export type GetSessionUserOptions = {
  /** Default true. Set false in Route Handlers so failed DB does not call redirect(). */
  redirectOnDbFailure?: boolean;
};

function prismaFailureMessage(err: unknown): string {
  const code =
    err instanceof Prisma.PrismaClientKnownRequestError
      ? err.code
      : err instanceof Prisma.PrismaClientInitializationError
        ? err.errorCode
        : undefined;

  if (code === "P2021" || code === "P2010") {
    return "La base de datos no tiene las tablas de la app. En tu PC (o CI) ejecuta prisma migrate deploy con DATABASE_URL apuntando a Supabase, o aplica prisma/migrations en el SQL Editor.";
  }

  return "No se pudo conectar con la base de datos. En Vercel usa DATABASE_URL del Session pooler o Transaction pooler de Supabase (IPv4), con contraseña correcta; Prisma añade sslmode=require. Luego prisma migrate deploy.";
}

export async function getSessionUser(
  options?: GetSessionUserOptions,
): Promise<SessionUser | null> {
  const redirectOnDbFailure = options?.redirectOnDbFailure !== false;

  if (!getSupabasePublicEnv()) {
    return null;
  }

  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();
  if (!authUser) return null;
  const authEmail = (authUser.email ?? "").trim().toLowerCase();

  try {
    await db.user.upsert({
      where: { id: authUser.id },
      update: {
        email: authEmail,
        name: authUser.user_metadata?.name ?? authEmail,
      },
      create: {
        id: authUser.id,
        email: authEmail,
        name: authUser.user_metadata?.name ?? authEmail,
      },
    });

    if (authEmail) {
      await acceptPendingInvitationsForUser({
        userId: authUser.id,
        email: authEmail,
      });
    }
  } catch (err) {
    console.error("[getSessionUser] database sync failed:", err);
    if (redirectOnDbFailure) {
      redirect(`/login?error=${encodeURIComponent(prismaFailureMessage(err))}`);
    }
    return null;
  }

  let isSuperAdminDb = false;
  try {
    const row = await db.user.findUnique({
      where: { id: authUser.id },
      select: { isSuperAdmin: true },
    });
    isSuperAdminDb = row?.isSuperAdmin ?? false;
  } catch {
    /* columna aun no migrada */
  }

  const envSuperList =
    process.env.PLATFORM_SUPERADMIN_EMAILS?.split(/[,;]/)
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean) ?? [];
  const isSuperAdmin = isSuperAdminDb || envSuperList.includes(authEmail);

  const cookieStore = await cookies();
  const activeTenantId = cookieStore.get(TENANT_COOKIE)?.value ?? null;
  const role = activeTenantId
    ? await getRoleForTenant(authUser.id, activeTenantId)
    : "member";

  return {
    userId: authUser.id,
    email: authEmail,
    name: authUser.user_metadata?.name ?? authEmail ?? "User",
    role,
    activeTenantId,
    isSuperAdmin,
  };
}

export async function setActiveTenant(tenantId: string) {
  const session = await getSessionUser();
  if (!session) return;

  const membership = await db.membership.findFirst({
    where: {
      tenantId,
      userId: session.userId,
      status: "active",
    },
    select: { id: true },
  });

  if (!membership) return;

  const cookieStore = await cookies();
  cookieStore.set(TENANT_COOKIE, tenantId);
}

export async function clearActiveTenant() {
  const cookieStore = await cookies();
  cookieStore.delete(TENANT_COOKIE);
}

async function getRoleForTenant(
  userId: string,
  tenantId: string,
): Promise<SessionUser["role"]> {
  const membership = await db.membership.findFirst({
    where: { userId, tenantId, status: "active" },
    select: { role: { select: { key: true } } },
  });

  const roleKey = membership?.role.key as SessionUser["role"] | undefined;
  return roleKey ?? "member";
}
