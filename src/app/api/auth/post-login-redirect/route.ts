import { NextResponse } from "next/server";

import { getSessionUser, setActiveTenant } from "@/lib/auth/session";
import { listTenantsForUser } from "@/modules/tenancy/service";

export const dynamic = "force-dynamic";

/**
 * Tras `signInWithPassword` en el cliente, el navegador ya tiene cookies de Supabase.
 * Esta ruta decide a dónde ir sin mostrar /select-tenant (super admin → /admin, etc.).
 */
export async function GET() {
  const session = await getSessionUser({ redirectOnDbFailure: false });
  if (!session) {
    return NextResponse.json({ path: "/login" }, { status: 401 });
  }

  if (session.isSuperAdmin) {
    return NextResponse.json({ path: "/admin" });
  }

  const tenants = await listTenantsForUser(session.userId);

  if (tenants.length === 1) {
    await setActiveTenant(tenants[0].id);
    return NextResponse.json({ path: "/dashboard/projects" });
  }

  return NextResponse.json({ path: "/select-tenant" });
}
