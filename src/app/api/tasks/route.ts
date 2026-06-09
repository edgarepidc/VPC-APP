import { NextResponse } from "next/server";

import { getSessionUser } from "@/lib/auth/session";
import { getSessionProjectIdsFilter } from "@/lib/project-scope";
import { assertCanAccessProject } from "@/modules/memberships/project-access";
import { hasPermission } from "@/lib/rbac";
import { createTask, listTasksByTenant } from "@/modules/tasks/service";

export async function GET() {
  try {
    const session = await getSessionUser({ redirectOnDbFailure: false });
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    if (!hasPermission(session.role, "tasks.read")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const tenantId = session.activeTenantId;
    if (!tenantId) {
      return NextResponse.json(
        { error: "No tenant selected in current session." },
        { status: 400 },
      );
    }
    const restrictToProjectIds = await getSessionProjectIdsFilter(session, tenantId);
    return NextResponse.json({
      data: await listTasksByTenant(tenantId, { restrictToProjectIds }),
    });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getSessionUser({ redirectOnDbFailure: false });
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    if (!hasPermission(session.role, "tasks.write")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const tenantId = session.activeTenantId;
    if (!tenantId) {
      return NextResponse.json(
        { error: "No tenant selected in current session." },
        { status: 400 },
      );
    }
    const body = (await req.json()) as {
      projectId?: string;
      title?: string;
      dueDate?: string | null;
      assigneeUserId?: string | null;
    };
    if (!body.projectId || !body.title) {
      return NextResponse.json(
        { error: "projectId and title are required" },
        { status: 400 },
      );
    }

    const due =
      body.dueDate && String(body.dueDate).trim()
        ? new Date(String(body.dueDate))
        : undefined;
    if (due && Number.isNaN(due.getTime())) {
      return NextResponse.json({ error: "invalid dueDate" }, { status: 400 });
    }

    const assignee =
      body.assigneeUserId != null && String(body.assigneeUserId).trim()
        ? String(body.assigneeUserId).trim()
        : undefined;

    await assertCanAccessProject({
      tenantId,
      userId: session.userId,
      role: session.role,
      projectId: body.projectId,
      isPlatformVisit: session.isPlatformVisit,
    });

    const task = await createTask({
      tenantId,
      projectId: body.projectId,
      title: body.title,
      dueDate: due,
      assigneeUserId: assignee,
    });

    return NextResponse.json({ data: task }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}
