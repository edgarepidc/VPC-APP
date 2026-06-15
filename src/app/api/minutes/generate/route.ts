import { NextResponse } from "next/server";

import { generateMeetingMinuteFromTranscript } from "@/lib/ai/generate-minute";
import { getSessionUser } from "@/lib/auth/session";
import {
  MAX_TRANSCRIPT_CHARS,
  MINUTE_PROVIDERS,
  type MinuteProvider,
} from "@/lib/meeting-minute-types";
import { assertCanAccessProject } from "@/modules/memberships/project-access";
import { canWriteWorkspaceData } from "@/lib/workspace-access";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

type GenerateBody = {
  transcript?: string;
  provider?: string;
  projectId?: string;
  customPrompt?: string;
};

export async function POST(req: Request) {
  try {
    const session = await getSessionUser({ redirectOnDbFailure: false });
    if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    if (!canWriteWorkspaceData(session)) {
      return NextResponse.json({ error: "Sin permiso para generar minutas." }, { status: 403 });
    }

    const tenantId = session.activeTenantId;
    if (!tenantId) {
      return NextResponse.json({ error: "No hay tenant activo en la sesión." }, { status: 400 });
    }

    const body = (await req.json()) as GenerateBody;
    const transcript = body.transcript?.trim() ?? "";
    const projectId = body.projectId?.trim() ?? "";
    const provider = body.provider as MinuteProvider;

    if (!projectId) {
      return NextResponse.json({ error: "Selecciona un subproyecto." }, { status: 400 });
    }

    if (!transcript) {
      return NextResponse.json(
        { error: "Adjunta un archivo Word o pega la transcripción de la reunión." },
        { status: 400 },
      );
    }

    if (transcript.length > MAX_TRANSCRIPT_CHARS) {
      return NextResponse.json(
        {
          error: `La transcripción supera el límite de ${MAX_TRANSCRIPT_CHARS.toLocaleString("es-MX")} caracteres.`,
        },
        { status: 400 },
      );
    }

    if (!MINUTE_PROVIDERS.includes(provider)) {
      return NextResponse.json({ error: "Proveedor de IA inválido." }, { status: 400 });
    }

    try {
      await assertCanAccessProject({
        tenantId,
        userId: session.userId,
        role: session.role,
        projectId,
        isPlatformVisit: session.isPlatformVisit,
      });
    } catch (e) {
      return NextResponse.json({ error: (e as Error).message }, { status: 403 });
    }

    const generated = await generateMeetingMinuteFromTranscript({
      transcript,
      provider,
      customPrompt: body.customPrompt,
    });

    return NextResponse.json({
      data: {
        content: generated.content,
        provider: generated.provider,
        model: generated.model,
      },
    });
  } catch (error) {
    const message = (error as Error).message || "Error al generar la minuta.";
    const status = message.includes("AI Gateway") || message.includes("API_KEY") ? 503 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
