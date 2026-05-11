import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import type { SessionUser } from "@/lib/types";
import { db } from "@/lib/db";
import { acceptPendingInvitationsForUser } from "@/modules/invitations/service";
import { TENANT_COOKIE } from "@/lib/tenant-cookie";
import { createClient } from "@/utils/supabase/server";

export type GetSessionUserOptions = {
  /** Default true. Set false in Route Handlers so failed DB does not call redirect(). */
  redirectOnDbFailure?: boolean;
};

export async function getSessionUser(
  options?: GetSessionUserOptions,
): Promise<SessionUser | null> {
  const redirectOnDbFailure = options?.redirectOnDbFailure !== false;

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
      redirect(
        `/login?error=${encodeURIComponent(
          "No se pudo conectar con la base de datos. En Vercel revisa DATABASE_URL (Postgres de Supabase) y que las migraciones Prisma esten aplicadas.",
        )}`,
      );
    }
    return null;
  }

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
