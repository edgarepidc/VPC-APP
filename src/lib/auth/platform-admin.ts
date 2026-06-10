import { redirect } from "next/navigation";

import { PMO_HUB } from "@/lib/dashboard-paths";
import type { SessionUser } from "@/lib/types";

import { getSessionUser } from "./session";

export function parsePlatformSuperadminEmailsFromEnv(): string[] {
  return (
    process.env.PLATFORM_SUPERADMIN_EMAILS?.split(/[,;]/)
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean) ?? []
  );
}

export function isEmailGrantedSuperAdminByEnv(email: string): boolean {
  const normalized = email.trim().toLowerCase();
  if (!normalized) return false;
  const ownerEmail = process.env.PLATFORM_OWNER_EMAIL?.trim().toLowerCase();
  return (
    parsePlatformSuperadminEmailsFromEnv().includes(normalized) ||
    (!!ownerEmail && ownerEmail === normalized)
  );
}

export function isPlatformSuperadminEnvConfigured(): boolean {
  if (process.env.PLATFORM_OWNER_EMAIL?.trim()) return true;
  return parsePlatformSuperadminEmailsFromEnv().length > 0;
}

/** Acceso a /admin (plataforma). Solo consultora VPC, no admins de cliente. */
export async function requirePlatformSuperAdmin(
  redirectTo = PMO_HUB,
): Promise<SessionUser> {
  const session = await getSessionUser();
  if (!session) redirect("/login");
  if (!session.isSuperAdmin) redirect(redirectTo);
  return session;
}
