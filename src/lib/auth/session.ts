import { cookies } from "next/headers";

import type { SessionUser } from "@/lib/types";

const USER_COOKIE = "embus_user";
const TENANT_COOKIE = "embus_tenant";

export async function getSessionUser(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const rawUser = cookieStore.get(USER_COOKIE)?.value;
  if (!rawUser) return null;

  const parsed = safeParse(rawUser);
  if (!parsed) return null;

  return {
    userId: parsed.userId,
    email: parsed.email,
    name: parsed.name,
    role: parsed.role,
    activeTenantId: cookieStore.get(TENANT_COOKIE)?.value ?? null,
  };
}

export async function createDemoSession() {
  const cookieStore = await cookies();
  cookieStore.set(
    USER_COOKIE,
    JSON.stringify({
      userId: "usr-1",
      email: "owner@acme.com",
      name: "Owner Demo",
      role: "owner",
    }),
    { httpOnly: true, sameSite: "lax", path: "/" },
  );
}

export async function setActiveTenant(tenantId: string) {
  const cookieStore = await cookies();
  cookieStore.set(TENANT_COOKIE, tenantId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
  });
}

function safeParse(value: string) {
  try {
    return JSON.parse(value) as {
      userId: string;
      email: string;
      name: string;
      role: SessionUser["role"];
    };
  } catch {
    return null;
  }
}
