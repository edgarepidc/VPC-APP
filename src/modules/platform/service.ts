import { db } from "@/lib/db";
import { normalizeTenantPlan } from "@/modules/platform/plans";
import {
  createStandardRolesForTenantWithClient,
  ensureGlobalPermissions,
} from "@/modules/tenancy/tenant-roles";

const SLUG_REGEX = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export async function listAllTenants(search?: string) {
  const q = search?.trim();
  return db.tenant.findMany({
    where: q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { slug: { contains: q, mode: "insensitive" } },
          ],
        }
      : undefined,
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      slug: true,
      plan: true,
      createdAt: true,
      _count: { select: { memberships: true, projects: true } },
    },
  });
}

export type CreateTenantPlatformResult =
  | { ok: true; tenantId: string }
  | { ok: false; message: string };

export async function createTenantFromPlatform(input: {
  name: string;
  slug: string;
  /** starter | pro | enterprise; invalido cae en starter */
  plan?: string;
}): Promise<CreateTenantPlatformResult> {
  const plan = normalizeTenantPlan(input.plan);
  const name = input.name.trim();
  let slug = input.slug
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
        "Slug invalido: usa minusculas, numeros y guiones (ej. mobility-ado).",
    };
  }

  const taken = await db.tenant.findUnique({
    where: { slug },
    select: { id: true },
  });
  if (taken) {
    return { ok: false, message: "Ese slug ya esta en uso." };
  }

  const allPermissions = await ensureGlobalPermissions();

  try {
    const tenantId = await db.$transaction(async (tx) => {
      const tenant = await tx.tenant.create({
        data: { name, slug, plan },
      });
      await createStandardRolesForTenantWithClient(
        tx,
        tenant.id,
        allPermissions,
      );
      return tenant.id;
    });
    return { ok: true, tenantId };
  } catch (e: unknown) {
    console.error("[createTenantFromPlatform]", e);
    return {
      ok: false,
      message: "No se pudo crear el tenant. Revisa los logs.",
    };
  }
}
