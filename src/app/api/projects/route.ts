import { NextResponse } from "next/server";

import { getSessionUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/rbac";
import { requireTenantId } from "@/lib/tenancy";
import { createProject, listProjectsByTenant } from "@/modules/projects/service";

export async function GET() {
  try {
    const session = await getSessionUser();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    if (!hasPermission(session.role, "projects.read")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const tenantId = await requireTenantId();
    return NextResponse.json({ data: listProjectsByTenant(tenantId) });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getSessionUser();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    if (!hasPermission(session.role, "projects.write")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const tenantId = await requireTenantId();
    const body = (await req.json()) as { name?: string; description?: string };
    if (!body.name) {
      return NextResponse.json({ error: "name is required" }, { status: 400 });
    }

    const project = createProject({
      tenantId,
      name: body.name,
      description: body.description ?? "",
      createdBy: session.userId,
    });

    return NextResponse.json({ data: project }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}
