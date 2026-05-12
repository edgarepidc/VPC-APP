import { db } from "@/lib/db";
import {
  createStandardRolesForTenantWithClient,
  ensureGlobalPermissions,
} from "@/modules/tenancy/tenant-roles";

const SLUG_REGEX = /^[a-z0-9]+(-[a-z0-9]+)*$/;

type CreateResult =
  | { ok: true; tenantId: string }
  | { ok: false; message: string };

/**
 * Crea un tenant con roles base y membresía owner, solo si el usuario aún no tiene ninguna org activa.
 */
export async function createFirstOrganizationAsOwner(input: {
  userId: string;
  name: string;
  slug: string;
}): Promise<CreateResult> {
  const name = input.name.trim();
  const slug = input.slug
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-|-$/g, "");

  if (!name || name.length < 2) {
    return { ok: false, message: "El nombre debe tener al menos 2 caracteres." };
  }
  if (!slug || !SLUG_REGEX.test(slug)) {
    return {
      ok: false,
      message:
        "Identificador (slug) invalido: usa minusculas, numeros y guiones (ej. mobility-ado).",
    };
  }

  const existing = await db.membership.count({
    where: { userId: input.userId, status: "active" },
  });
  if (existing > 0) {
    return { ok: false, message: "Ya tienes una organizacion asignada." };
  }

  const slugTaken = await db.tenant.findUnique({
    where: { slug },
    select: { id: true },
  });
  if (slugTaken) {
    return {
      ok: false,
      message:
        "Ese identificador ya esta en uso. Prueba otro slug o pide acceso a quien creo esa organizacion.",
    };
  }

  const allPermissions = await ensureGlobalPermissions();

  try {
    const tenantId = await db.$transaction(async (tx) => {
      const tenant = await tx.tenant.create({
        data: { name, slug, plan: "starter" },
      });

      const roles = await createStandardRolesForTenantWithClient(
        tx,
        tenant.id,
        allPermissions,
      );

      await tx.membership.create({
        data: {
          tenantId: tenant.id,
          userId: input.userId,
          roleId: roles.owner.id,
          status: "active",
        },
      });

      return tenant.id;
    });

    return { ok: true, tenantId };
  } catch (e: unknown) {
    const code =
      typeof e === "object" &&
      e !== null &&
      "code" in e &&
      typeof (e as { code: unknown }).code === "string"
        ? (e as { code: string }).code
        : undefined;
    if (code === "P2002") {
      return {
        ok: false,
        message: "Ese identificador ya existe. Prueba otro slug.",
      };
    }
    console.error("[createFirstOrganizationAsOwner]", e);
    return {
      ok: false,
      message: "No se pudo crear la organizacion. Intenta de nuevo o revisa los logs.",
    };
  }
}
