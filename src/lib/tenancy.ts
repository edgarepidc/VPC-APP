import type { GetSessionUserOptions } from "@/lib/auth/session";
import { getSessionUser } from "@/lib/auth/session";

export async function requireTenantId(options?: GetSessionUserOptions) {
  const session = await getSessionUser(options);

  if (!session?.activeTenantId) {
    throw new Error("No tenant selected in current session.");
  }

  return session.activeTenantId;
}
