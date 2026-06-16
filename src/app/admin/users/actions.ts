"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getSessionUser } from "@/lib/auth/session";
import { requirePlatformSuperAdmin } from "@/lib/auth/platform-admin";
import { isNextNavigationError } from "@/lib/server-action-errors";
import type { RoleKey } from "@/lib/types";
import { parseManagerProjectScopeFromForm } from "@/modules/memberships/project-access";
import { PlanLimitError } from "@/modules/platform";
import {
  addUserToTenant,
  changeUserMembershipRole,
  createPlatformUserDirect,
  removeUserFromTenant,
  resetPlatformUserPassword,
  updatePlatformUserProfile,
} from "@/modules/platform-users/service";

const VALID_ROLES: RoleKey[] = ["admin", "manager", "member"];

function usersQuery(params: {
  tenantId?: string;
  q?: string;
  error?: string;
  ok?: string;
  extra?: Record<string, string>;
}) {
  const sp = new URLSearchParams();
  if (params.tenantId) sp.set("tenantId", params.tenantId);
  if (params.q) sp.set("q", params.q);
  if (params.error) sp.set("error", params.error);
  if (params.ok) sp.set("ok", params.ok);
  if (params.extra) {
    for (const [k, v] of Object.entries(params.extra)) sp.set(k, v);
  }
  const qs = sp.toString();
  return qs ? `/admin/users?${qs}` : "/admin/users";
}

async function requireSuperAdmin() {
  return requirePlatformSuperAdmin("/admin/users?error=Sin+permiso");
}

export async function createUserAction(formData: FormData) {
  const s = await requireSuperAdmin();
  const tenantId = String(formData.get("tenantId") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const jobTitle = String(formData.get("jobTitle") ?? "").trim();
  const department = String(formData.get("department") ?? "").trim();
  const roleKey = String(formData.get("role")) as RoleKey;
  const managerScope = parseManagerProjectScopeFromForm(formData);
  const filterQ = String(formData.get("filterQ") ?? "").trim();
  const filterTenant = String(formData.get("filterTenant") ?? "").trim();

  if (!tenantId || !email || !password || !VALID_ROLES.includes(roleKey)) {
    redirect(
      usersQuery({
        tenantId: filterTenant || tenantId,
        q: filterQ,
        error: "Datos inválidos",
      }),
    );
  }

  try {
    const result = await createPlatformUserDirect({
      tenantId,
      email,
      password,
      name: name || undefined,
      phone: phone || undefined,
      jobTitle: jobTitle || undefined,
      department: department || undefined,
      roleKey,
      managerScope,
      actorUserId: s.userId,
    });
    revalidatePath("/admin/users");
    revalidatePath("/admin");
    redirect(
      usersQuery({
        tenantId: filterTenant || tenantId,
        q: filterQ,
        ok:
          result.status === "created"
            ? "Usuario creado y asignado"
            : result.message,
      }),
    );
  } catch (e) {
    if (isNextNavigationError(e)) throw e;
    const msg = e instanceof PlanLimitError ? e.message : (e as Error).message;
    redirect(
      usersQuery({
        tenantId: filterTenant || tenantId,
        q: filterQ,
        error: msg,
      }),
    );
  }
}

export async function updateUserAction(formData: FormData) {
  const s = await requireSuperAdmin();
  const userId = String(formData.get("userId") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const jobTitle = String(formData.get("jobTitle") ?? "").trim();
  const department = String(formData.get("department") ?? "").trim();
  const isActive = formData.get("isActive") === "on";
  const isSuperAdmin = formData.get("isSuperAdmin") === "on";
  const filterQ = String(formData.get("filterQ") ?? "").trim();
  const filterTenant = String(formData.get("filterTenant") ?? "").trim();

  if (!userId) redirect(usersQuery({ error: "Usuario inválido" }));

  try {
    await updatePlatformUserProfile({
      userId,
      name,
      phone,
      jobTitle,
      department,
      isActive,
      isSuperAdmin,
      actorUserId: s.userId,
    });
    revalidatePath("/admin/users");
    redirect(usersQuery({ q: filterQ, tenantId: filterTenant, ok: "Perfil actualizado" }));
  } catch (e) {
    if (isNextNavigationError(e)) throw e;
    redirect(
      usersQuery({
        q: filterQ,
        tenantId: filterTenant,
        error: (e as Error).message,
      }),
    );
  }
}

export async function addMembershipAction(formData: FormData) {
  const s = await requireSuperAdmin();
  const userId = String(formData.get("userId") ?? "").trim();
  const tenantId = String(formData.get("tenantId") ?? "").trim();
  const roleKey = String(formData.get("roleKey")) as RoleKey;
  const managerScope = parseManagerProjectScopeFromForm(formData);
  const filterQ = String(formData.get("filterQ") ?? "").trim();
  const filterTenant = String(formData.get("filterTenant") ?? "").trim();

  if (!userId || !tenantId || !VALID_ROLES.includes(roleKey)) {
    redirect(usersQuery({ q: filterQ, tenantId: filterTenant, error: "Datos inválidos" }));
  }

  try {
    await addUserToTenant({
      userId,
      tenantId,
      roleKey,
      managerScope,
      actorUserId: s.userId,
    });
    revalidatePath("/admin/users");
    redirect(usersQuery({ q: filterQ, tenantId: filterTenant, ok: "Organización asignada" }));
  } catch (e) {
    if (isNextNavigationError(e)) throw e;
    const msg = e instanceof PlanLimitError ? e.message : (e as Error).message;
    redirect(usersQuery({ q: filterQ, tenantId: filterTenant, error: msg }));
  }
}

export async function changeMembershipRoleAction(formData: FormData) {
  const s = await requireSuperAdmin();
  const userId = String(formData.get("userId") ?? "").trim();
  const tenantId = String(formData.get("tenantId") ?? "").trim();
  const roleKey = String(formData.get("roleKey")) as RoleKey;
  const managerScope = parseManagerProjectScopeFromForm(formData);
  const filterQ = String(formData.get("filterQ") ?? "").trim();
  const filterTenant = String(formData.get("filterTenant") ?? "").trim();

  if (!userId || !tenantId || !VALID_ROLES.includes(roleKey)) {
    redirect(usersQuery({ q: filterQ, tenantId: filterTenant, error: "Datos inválidos" }));
  }

  try {
    await changeUserMembershipRole({
      userId,
      tenantId,
      roleKey,
      managerScope,
      actorUserId: s.userId,
    });
    revalidatePath("/admin/users");
    redirect(usersQuery({ q: filterQ, tenantId: filterTenant, ok: "Rol e iniciativas actualizados" }));
  } catch (e) {
    if (isNextNavigationError(e)) throw e;
    redirect(usersQuery({ q: filterQ, tenantId: filterTenant, error: (e as Error).message }));
  }
}

export async function removeMembershipAction(formData: FormData) {
  const s = await requireSuperAdmin();
  const userId = String(formData.get("userId") ?? "").trim();
  const tenantId = String(formData.get("tenantId") ?? "").trim();
  const filterQ = String(formData.get("filterQ") ?? "").trim();
  const filterTenant = String(formData.get("filterTenant") ?? "").trim();

  if (!userId || !tenantId) {
    redirect(usersQuery({ q: filterQ, tenantId: filterTenant, error: "Datos inválidos" }));
  }

  try {
    await removeUserFromTenant({
      userId,
      tenantId,
      actorUserId: s.userId,
    });
    revalidatePath("/admin/users");
    redirect(usersQuery({ q: filterQ, tenantId: filterTenant, ok: "Usuario removido de la org" }));
  } catch (e) {
    if (isNextNavigationError(e)) throw e;
    redirect(usersQuery({ q: filterQ, tenantId: filterTenant, error: (e as Error).message }));
  }
}

export async function resetPasswordAction(
  userId: string,
  mode: "temp" | "link",
): Promise<{ ok: true; mode: "temp"; password: string } | { ok: true; mode: "link"; link: string } | { ok: false; error: string }> {
  const s = await getSessionUser();
  if (!s?.isSuperAdmin) return { ok: false, error: "Sin permiso" };

  try {
    const result = await resetPlatformUserPassword({
      userId,
      mode,
      actorUserId: s.userId,
    });
    if (result.mode === "temp") {
      return { ok: true, mode: "temp", password: result.password };
    }
    return { ok: true, mode: "link", link: result.recoveryLink };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}
