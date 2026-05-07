import { NextResponse } from "next/server";

import { getSessionUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/rbac";
import { requireTenantId } from "@/lib/tenancy";
import { createTask, listTasksByTenant } from "@/modules/tasks/service";

export async function GET() {
  try {
    const session = await getSessionUser();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    if (!hasPermission(session.role, "tasks.read")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const tenantId = await requireTenantId();
    return NextResponse.json({ data: listTasksByTenant(tenantId) });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getSessionUser();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    if (!hasPermission(session.role, "tasks.write")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const tenantId = await requireTenantId();
    const body = (await req.json()) as { projectId?: string; title?: string };
    if (!body.projectId || !body.title) {
      return NextResponse.json(
        { error: "projectId and title are required" },
        { status: 400 },
      );
    }

    const task = createTask({
      tenantId,
      projectId: body.projectId,
      title: body.title,
    });

    return NextResponse.json({ data: task }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}
