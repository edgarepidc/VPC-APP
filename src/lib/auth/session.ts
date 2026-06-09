import { Prisma } from "@prisma/client";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import type { SessionUser } from "@/lib/types";
import {
  db,
  getDatabaseUrlDiagnostics,
  hintsForDatabaseUrl,
} from "@/lib/db";
import { acceptPendingInvitationsForUser } from "@/modules/invitations/service";
import { TENANT_COOKIE } from "@/lib/tenant-cookie";
import { getSupabasePublicEnv } from "@/utils/supabase/env";
import { createClient } from "@/utils/supabase/server";

export type GetSessionUserOptions = {
  /** Default true. Set false in Route Handlers so failed DB does not call redirect(). */
  redirectOnDbFailure?: boolean;
};

function parsePlatformSuperadminEmailsFromEnv(): string[] {
  return (
    process.env.PLATFORM_SUPERADMIN_EMAILS?.split(/[,;]/)
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean) ?? []
  );
}

/**
 * True when PLATFORM_OWNER_EMAIL or PLATFORM_SUPERADMIN_EMAILS is set in the
 * runtime environment (same notion as getSessionUser uses for env-based access).
 */
export function isPlatformSuperadminEnvConfigured(): boolean {
  if (process.env.PLATFORM_OWNER_EMAIL?.trim()) return true;
  return parsePlatformSuperadminEmailsFromEnv().length > 0;
}

function envDatabaseHints(): string {
  const raw = process.env.DATABASE_URL?.trim() ?? "";
  if (!raw) {
    return " Falta DATABASE_URL en Vercel (Production). Agrégala y redeploy.";
  }
  const diag = getDatabaseUrlDiagnostics(raw);
  const hints = diag ? hintsForDatabaseUrl(diag) : [];
  return hints.length ? ` ${hints.join(" ")}` : "";
}

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

  if (code === "P2022") {
    const col =
      err instanceof Prisma.PrismaClientKnownRequestError
        ? String((err.meta as { column?: unknown })?.column ?? "")
        : "";
    return (
      "Falta una columna en Postgres (P2022" +
      (col ? `: ${col}` : "") +
      '). Ejecuta prisma migrate deploy contra producción, o en Supabase SQL Editor aplica la migración pendiente (p. ej. ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "phone" TEXT;).'
    );
  }

  const causeMsg =
    err instanceof Error && err.cause instanceof Error ? err.cause.message : "";
  const errMsg =
    err instanceof Error ? `${err.message} ${causeMsg}` : String(err);
  if (/EMAXCONNSESSION|max clients reached.*session mode/i.test(errMsg)) {
    const tail = envDatabaseHints();
    const healthHint =
      " /api/health/db solo hace SELECT 1; el login además escribe en User (upsert).";
    return (
      "Se alcanzó el máximo de conexiones del Session pooler de Supabase (≈15 sesiones compartidas en todo el proyecto). Solución recomendada: en Supabase → Connect → copia la cadena «Transaction pooler» (host *.pooler.supabase.com, puerto 6543) y sustituye DATABASE_URL en Vercel; redeploy. La app añade pgbouncer=true y, en host pooler, connection_limit=1 para aliviar el uso por instancia." +
      tail +
      healthHint
    );
  }

  const tail = envDatabaseHints();
  const healthHint =
    " /api/health/db solo hace SELECT 1; el login además escribe en User (upsert).";

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (code === "P2002") {
      const target = Array.isArray(err.meta?.target)
        ? (err.meta?.target as string[]).join(", ")
        : String(err.meta?.target ?? "");
      return (
        "Conflicto de datos únicos en la base (P2002" +
        (target ? `: ${target}` : "") +
        "). Suele ocurrir si ya existe una fila en User con este correo pero otro id (p. ej. borraste la cuenta en Auth y volviste a registrarte). En Supabase SQL Editor revisa public.\"User\" por email duplicado o id distinto al de auth.users; ajusta o elimina la fila vieja si corresponde." +
        healthHint
      );
    }
    if (code === "P1017") {
      return (
        "El servidor Postgres cerró la conexión (P1017), a veces con el pooler transaccional bajo carga. Prueba Session pooler en Supabase o reduce concurrencia; en la URI de transacciones debe ir pgbouncer=true (la app lo añade en puerto 6543)." +
        tail +
        healthHint
      );
    }
    if (code === "P1002" || code === "P1008") {
      return (
        "Tiempo de espera agotado al hablar con la base (" +
        code +
        "). Revisa el pooler de Supabase, latencia, o si la instancia está pausada." +
        tail +
        healthHint
      );
    }
  }

  if (err instanceof Prisma.PrismaClientInitializationError) {
    if (err.errorCode === "P1000") {
      return (
        "Postgres rechazó usuario o contraseña (P1000). En Supabase resetea la contraseña de la base, copia de nuevo la URI del pooler y pégala entera en DATABASE_URL. Si la contraseña tiene caracteres especiales, deben ir codificados en la URL." +
        tail +
        healthHint
      );
    }
    if (err.errorCode === "P1001") {
      return (
        "No se alcanza el servidor de base de datos (P1001: red, host o puerto). En Vercel suele fallar el host directo db.*.supabase.co:5432; usa la cadena del Session pooler o Transaction pooler (host *.pooler.supabase.com). Puerto 6543 = modo transacción (Prisma añade pgbouncer=true)." +
        tail +
        healthHint
      );
    }
  }

  if (err instanceof Prisma.PrismaClientUnknownRequestError) {
    const msg = err.message ?? "";
    if (/prepared statement/i.test(msg)) {
      return (
        "Error del pooler con sentencias preparadas (típico con PgBouncer en modo transacción). Usa la cadena Session pooler de Supabase, o confirma que DATABASE_URL en puerto 6543 incluye pgbouncer=true (Prisma lo añade automático)." +
        tail +
        healthHint
      );
    }
  }

  const codeSuffix = code ? ` Código Prisma: ${code}.` : "";
  const rawMsg =
    err instanceof Error ? ` ${err.name}: ${err.message.slice(0, 400)}` : "";
  return (
    "Falló la sincronización del usuario con Postgres (no es solo el ping de salud)." +
    codeSuffix +
    rawMsg +
    " Revisa logs del despliegue en Vercel para el stack completo. Si acabas de cambiar Auth o correos, mira duplicados en User (P2002)." +
    tail +
    healthHint
  );
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
    /** Mismo email en otro id = típico tras re-registro en Auth; el upsert fallaría por @unique en email. */
    if (authEmail) {
      const stale = await db.user.findFirst({
        where: { email: authEmail, id: { not: authUser.id } },
        select: {
          id: true,
          _count: { select: { memberships: true } },
        },
      });
      if (stale) {
        if (stale._count.memberships > 0) {
          redirect(
            `/login?error=${encodeURIComponent(
              "Hay otra cuenta en Postgres con este correo y datos de organización (memberships). " +
                "Un admin debe unificar usuarios o borrar la fila duplicada en public.\"User\". " +
                `Ids: sesión Auth=${authUser.id}, fila en conflicto=${stale.id}.`,
            )}`,
          );
        }
        await db.user.delete({ where: { id: stale.id } });
      }
    }

    const meta = authUser.user_metadata ?? {};
    const metaName = typeof meta.name === "string" ? meta.name : undefined;
    const metaPhone = typeof meta.phone === "string" ? meta.phone.trim() || null : null;
    const metaJobTitle =
      typeof meta.jobTitle === "string" ? meta.jobTitle.trim() || null : null;
    const metaDepartment =
      typeof meta.department === "string" ? meta.department.trim() || null : null;
    const lastSignInAt = authUser.last_sign_in_at
      ? new Date(authUser.last_sign_in_at)
      : null;

    await db.user.upsert({
      where: { id: authUser.id },
      update: {
        email: authEmail,
        name: metaName ?? authEmail,
        ...(metaPhone !== null ? { phone: metaPhone } : {}),
        ...(metaJobTitle !== null ? { jobTitle: metaJobTitle } : {}),
        ...(metaDepartment !== null ? { department: metaDepartment } : {}),
        ...(lastSignInAt ? { lastSignInAt } : {}),
      },
      create: {
        id: authUser.id,
        email: authEmail,
        name: metaName ?? authEmail,
        phone: metaPhone,
        jobTitle: metaJobTitle,
        department: metaDepartment,
        lastSignInAt,
      },
    });
  } catch (err) {
    console.error("[getSessionUser] user upsert failed:", err);
    if (redirectOnDbFailure) {
      redirect(`/login?error=${encodeURIComponent(prismaFailureMessage(err))}`);
    }
    return null;
  }

  if (authEmail) {
    try {
      await acceptPendingInvitationsForUser({
        userId: authUser.id,
        email: authEmail,
      });
    } catch (invErr) {
      console.error(
        "[getSessionUser] acceptPendingInvitationsForUser failed (non-fatal):",
        invErr,
      );
    }
  }

  let isSuperAdminDb = false;
  try {
    const row = await db.user.findUnique({
      where: { id: authUser.id },
      select: { isSuperAdmin: true, isActive: true },
    });
    if (row && row.isActive === false) {
      await supabase.auth.signOut();
      if (redirectOnDbFailure) {
        redirect(
          `/login?error=${encodeURIComponent("Tu cuenta está desactivada. Contacta al administrador.")}`,
        );
      }
      return null;
    }
    isSuperAdminDb = row?.isSuperAdmin ?? false;
  } catch {
    /* columna aun no migrada */
  }

  const envSuperList = parsePlatformSuperadminEmailsFromEnv();
  const ownerEmail = process.env.PLATFORM_OWNER_EMAIL?.trim().toLowerCase();
  const isSuperAdmin =
    isSuperAdminDb ||
    envSuperList.includes(authEmail) ||
    (!!ownerEmail && ownerEmail === authEmail);

  const cookieStore = await cookies();
  const cookieTenantId = cookieStore.get(TENANT_COOKIE)?.value ?? null;
  const tenantContext = await resolveActiveTenantContext(
    authUser.id,
    cookieTenantId,
    isSuperAdmin,
  );

  if (tenantContext.clearCookie && cookieTenantId) {
    cookieStore.delete(TENANT_COOKIE);
  }

  return {
    userId: authUser.id,
    email: authEmail,
    name: authUser.user_metadata?.name ?? authEmail ?? "User",
    role: tenantContext.role,
    activeTenantId: tenantContext.activeTenantId,
    isSuperAdmin,
    isSuperAdminFromDb: isSuperAdminDb,
    isPlatformVisit: tenantContext.isPlatformVisit,
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

/**
 * Solo superadmin consultora: entra al workspace de un tenant sin ser miembro.
 * En sesión tendrá rol admin para ese tenant (ver getRoleForTenant).
 */
export async function setActiveTenantAsPlatformOwner(tenantId: string) {
  const session = await getSessionUser();
  if (!session?.isSuperAdmin) return false;

  const tenant = await db.tenant.findUnique({
    where: { id: tenantId },
    select: { id: true },
  });
  if (!tenant) return false;

  const cookieStore = await cookies();
  cookieStore.set(TENANT_COOKIE, tenantId);
  return true;
}

export async function clearActiveTenant() {
  const cookieStore = await cookies();
  cookieStore.delete(TENANT_COOKIE);
}

/** Si el tenant activo en cookie es el indicado, lo borra (p. ej. tras eliminar esa org). */
export async function clearActiveTenantIfMatches(tenantId: string) {
  const cookieStore = await cookies();
  if (cookieStore.get(TENANT_COOKIE)?.value === tenantId) {
    cookieStore.delete(TENANT_COOKIE);
  }
}

type ResolvedTenantContext = {
  activeTenantId: string | null;
  role: SessionUser["role"];
  isPlatformVisit: boolean;
  /** Cookie pointed at a tenant the user may not use; caller should delete it. */
  clearCookie?: boolean;
};

/**
 * Validates `embus_tenant` on every session read. Without this, a forged cookie could
 * grant read access via APIs that trust `activeTenantId` + default role "member".
 */
async function resolveActiveTenantContext(
  userId: string,
  cookieTenantId: string | null,
  isSuperAdmin: boolean,
): Promise<ResolvedTenantContext> {
  if (!cookieTenantId) {
    return { activeTenantId: null, role: "member", isPlatformVisit: false };
  }

  const tenant = await db.tenant.findUnique({
    where: { id: cookieTenantId },
    select: { id: true },
  });
  if (!tenant) {
    return {
      activeTenantId: null,
      role: "member",
      isPlatformVisit: false,
      clearCookie: true,
    };
  }

  const membership = await db.membership.findFirst({
    where: { userId, tenantId: cookieTenantId, status: "active" },
    select: { role: { select: { key: true } } },
  });

  if (membership) {
    return {
      activeTenantId: cookieTenantId,
      role: membership.role.key as SessionUser["role"],
      isPlatformVisit: false,
    };
  }

  if (isSuperAdmin) {
    return {
      activeTenantId: cookieTenantId,
      role: "admin",
      isPlatformVisit: true,
    };
  }

  return {
    activeTenantId: null,
    role: "member",
    isPlatformVisit: false,
    clearCookie: true,
  };
}
