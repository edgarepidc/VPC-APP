"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getSessionUser } from "@/lib/auth/session";
import {
  meetingMinuteContentSchema,
  type MeetingMinuteContent,
  type MinuteProvider,
} from "@/lib/meeting-minute-types";
import { MINUTES_DETAIL, MINUTES_HUB } from "@/lib/dashboard-paths";
import { canWriteWorkspaceData } from "@/lib/workspace-access";
import { assertCanAccessProject } from "@/modules/memberships/project-access";
import {
  createMeetingMinute,
  deleteMeetingMinute,
  getMeetingMinuteById,
} from "@/modules/meeting-minutes/service";

function parseContent(raw: unknown): MeetingMinuteContent | null {
  const parsed = meetingMinuteContentSchema.safeParse(raw);
  return parsed.success ? parsed.data : null;
}

function parseMeetingDate(raw: string | undefined): Date | null {
  if (!raw?.trim()) return null;
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d;
}

export async function saveMeetingMinuteAction(input: {
  projectId: string;
  title: string;
  meetingDate?: string;
  content: MeetingMinuteContent;
  provider: MinuteProvider;
  model: string;
}) {
  const session = await getSessionUser();
  if (!session?.activeTenantId) redirect("/login");
  if (!canWriteWorkspaceData(session)) {
    return { ok: false as const, error: "No tienes permiso para guardar minutas." };
  }

  const projectId = input.projectId?.trim();
  const title = input.title?.trim();
  const content = parseContent(input.content);

  if (!projectId) return { ok: false as const, error: "Selecciona un subproyecto." };
  if (!title) return { ok: false as const, error: "Indica un título para la minuta." };
  if (!content) return { ok: false as const, error: "Contenido de minuta inválido." };
  if (input.provider !== "claude" && input.provider !== "deepseek") {
    return { ok: false as const, error: "Proveedor inválido." };
  }

  try {
    await assertCanAccessProject({
      tenantId: session.activeTenantId,
      userId: session.userId,
      role: session.role,
      projectId,
      isPlatformVisit: session.isPlatformVisit,
    });
  } catch (e) {
    return { ok: false as const, error: (e as Error).message };
  }

  try {
    const created = await createMeetingMinute({
      tenantId: session.activeTenantId,
      projectId,
      title,
      meetingDate: parseMeetingDate(input.meetingDate),
      content,
      provider: input.provider,
      model: input.model?.trim() || input.provider,
      createdBy: session.userId,
    });

    revalidatePath(MINUTES_HUB);
    revalidatePath(MINUTES_DETAIL(created.id));
    return { ok: true as const, id: created.id };
  } catch (e) {
    return { ok: false as const, error: (e as Error).message };
  }
}

export async function deleteMeetingMinuteAction(minuteId: string) {
  const session = await getSessionUser();
  if (!session?.activeTenantId) redirect("/login");
  if (!canWriteWorkspaceData(session)) {
    return { ok: false as const, error: "No tienes permiso para eliminar minutas." };
  }

  const id = minuteId?.trim();
  if (!id) return { ok: false as const, error: "Minuta no encontrada." };

  const existing = await getMeetingMinuteById(session.activeTenantId, id);
  if (!existing) return { ok: false as const, error: "Minuta no encontrada." };

  try {
    await assertCanAccessProject({
      tenantId: session.activeTenantId,
      userId: session.userId,
      role: session.role,
      projectId: existing.projectId,
      isPlatformVisit: session.isPlatformVisit,
    });
  } catch (e) {
    return { ok: false as const, error: (e as Error).message };
  }

  try {
    await deleteMeetingMinute(session.activeTenantId, id);
    revalidatePath(MINUTES_HUB);
    return { ok: true as const };
  } catch (e) {
    return { ok: false as const, error: (e as Error).message };
  }
}
