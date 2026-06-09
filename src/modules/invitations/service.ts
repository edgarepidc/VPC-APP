import { db } from "@/lib/db";
import type { RoleKey } from "@/lib/types";
import {
  applyInvitationProjectAccessToMembership,
  type ManagerProjectScopeInput,
  setInvitationProjectAccess,
} from "@/modules/memberships/project-access";
import { canAddMemberSeat, PlanLimitError } from "@/modules/platform/limits";
import { createAdminClient } from "@/utils/supabase/admin";

export type InviteAuthResult =
  | { status: "emailed" }
  | { status: "invitation_only"; message: string };

/**
 * Si borraste el usuario en Supabase Auth pero quedó la fila en public."User"
 * (mismo email, id antiguo), un trigger de Auth o el UNIQUE en email puede hacer
 * fallar inviteUserByEmail con "Database error saving new user". Eliminamos esa
 * fila huérfana cuando ya no existe auth.users con ese id.
 */
async function removeOrphanAppUserRowIfAuthUserIsGone(email: string): Promise<void> {
  const normalized = email.trim().toLowerCase();
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

  if (!authUserMissing) {
    console.warn(
      "[invitations] getUserById no confirmó ausencia en Auth; no se elimina User:",
      err?.message,
    );
    return;
  }

  await db.user.deleteMany({ where: { id: row.id } });
}

/**
 * GoTrue valida redirectTo contra la lista de URLs permitidas y rechaza hosts incoherentes.
 */
function assertValidInviteRedirectTo(redirectTo: string): void {
  let u: URL;
  try {
    u = new URL(redirectTo);
  } catch {
    throw new Error(
      "URL de retorno invalida para la invitacion. Configura NEXT_PUBLIC_APP_URL en Vercel como la URL publica de esta app (ej. https://tu-proyecto.vercel.app), sin rutas raras.",
    );
  }
  if (u.protocol !== "http:" && u.protocol !== "https:") {
    throw new Error("URL de retorno invalida (solo se permiten http o https).");
  }
  const host = u.hostname.toLowerCase();
  if (host.endsWith(".supabase.co")) {
    throw new Error(
      "NEXT_PUBLIC_APP_URL apunta a *.supabase.co; debe ser el dominio donde corre esta aplicacion (p. ej. tu proyecto en Vercel). El correo de invitacion debe redirigir a /login de tu app, no al panel de Supabase.",
    );
  }
  const isLocal = host === "localhost" || host === "127.0.0.1" || host === "[::1]";
  if (process.env.NODE_ENV === "production" && !isLocal && u.protocol !== "https:") {
    throw new Error(
      "En produccion NEXT_PUBLIC_APP_URL debe usar https:// para que Supabase acepte redirectTo en invitaciones.",
    );
  }
}

function formatInviteAuthError(message: string): string {
  const lower = message.toLowerCase();
  if (/requested path is invalid/.test(lower)) {
    return (
      "Supabase Auth respondio «requested path is invalid». Suele deberse a: " +
      "(1) NEXT_PUBLIC_SUPABASE_URL mal copiada: debe ser solo `https://xxxx.supabase.co` sin sufijo `/auth/v1` ni `/rest/v1`. " +
      "(2) En Supabase → Authentication → URL Configuration: agrega en «Redirect URLs» tu `https://TU-DOMINIO/login` y `https://TU-DOMINIO/auth/callback`. " +
      "(3) NEXT_PUBLIC_APP_URL en Vercel = URL publica exacta de la app (HTTPS). " +
      "Tras corregir, redeploy. Atajo: crea el usuario en Supabase → Authentication → Users y que entre con «Olvide contrasena»; la invitacion pendiente en la app se aplica al iniciar sesion."
    );
  }
  if (/database error saving new user/i.test(message)) {
    return (
      "Supabase no pudo crear el usuario en Auth (error interno de base de datos). " +
      "Lo más habitual: quedó una fila en public.\"User\" con ese correo pero el id ya no existe en auth.users " +
      "(p. ej. borraste la cuenta solo en Authentication). La app intenta limpiar eso automáticamente; " +
      "si sigue fallando, en Supabase → SQL Editor: DELETE FROM public.\"User\" WHERE lower(email) = lower('…'); " +
      "luego vuelve a enviar la invitación. Revisa también triggers personalizados sobre auth.users."
    );
  }
  if (/rate limit|too many emails|email rate limit/i.test(lower)) {
    return (
      "Supabase bloqueó el envío por límite de correos (rate limit): en el plan gratuito el correo " +
      "integrado permite muy pocos envíos por hora. Espera ~1 hora, reduce pruebas repetidas, " +
      "o configura SMTP propio en Project Settings → Auth → SMTP (más cupo y mejor entregabilidad). " +
      "La invitación en tu base puede quedar pendiente aunque el correo no salga; revisa Auth logs en Supabase."
    );
  }
  return message;
}

export async function inviteAuthUserToTenant(input: {
  tenantId: string;
  email: string;
  roleKey: RoleKey;
  invitedBy: string;
  managerScope?: ManagerProjectScopeInput;
  /** URL absoluta (ej. `${getAppUrl().value}/login`) para enlaces del correo de Supabase. */
  redirectTo: string;
}): Promise<InviteAuthResult> {
  const email = input.email.trim().toLowerCase();

  assertValidInviteRedirectTo(input.redirectTo);

  await removeOrphanAppUserRowIfAuthUserIsGone(email);

  await upsertPendingInvitation({
    tenantId: input.tenantId,
    email,
    roleKey: input.roleKey,
    invitedBy: input.invitedBy,
    managerScope: input.managerScope,
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
    throw new Error(formatInviteAuthError(error.message));
  }

  return { status: "emailed" };
}

export async function upsertPendingInvitation(input: {
  tenantId: string;
  email: string;
  roleKey: RoleKey;
  invitedBy: string;
  managerScope?: ManagerProjectScopeInput;
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

  let invitationId: string;

  if (existing) {
    const updated = await db.invitation.update({
      where: { id: existing.id },
      data: { roleKey: input.roleKey, invitedBy: input.invitedBy },
      select: { id: true },
    });
    invitationId = updated.id;
  } else {
    const seat = await canAddMemberSeat(input.tenantId);
    if (!seat.ok) {
      throw new PlanLimitError(seat.message);
    }

    const created = await db.invitation.create({
      data: {
        tenantId: input.tenantId,
        email,
        roleKey: input.roleKey,
        invitedBy: input.invitedBy,
        status: "pending",
      },
      select: { id: true },
    });
    invitationId = created.id;
  }

  if (input.managerScope) {
    await setInvitationProjectAccess(
      invitationId,
      input.tenantId,
      input.roleKey,
      input.managerScope,
    );
  }

  return db.invitation.findUnique({ where: { id: invitationId } });
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

    const membership = await db.membership.upsert({
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
      select: { id: true },
    });

    await applyInvitationProjectAccessToMembership(
      invitation.id,
      membership.id,
      invitation.tenantId,
    );

    await db.invitation.update({
      where: { id: invitation.id },
      data: { status: "accepted", acceptedAt: new Date() },
    });
  }
}

/** Vista plataforma: últimas invitaciones en todos los tenants. */
export async function listRecentInvitationsForPlatform(options?: {
  take?: number;
}) {
  const take = Math.min(Math.max(options?.take ?? 40, 1), 100);
  return db.invitation.findMany({
    orderBy: { createdAt: "desc" },
    take,
    select: {
      id: true,
      email: true,
      roleKey: true,
      status: true,
      createdAt: true,
      acceptedAt: true,
      tenant: { select: { name: true, slug: true } },
      sender: { select: { name: true, email: true } },
    },
  });
}
