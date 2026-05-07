import { getSessionUser } from "@/lib/auth/session";

export async function requireTenantId() {
  const session = await getSessionUser();

  if (!session?.activeTenantId) {
    throw new Error("No tenant selected in current session.");
  }

  return session.activeTenantId;
}
