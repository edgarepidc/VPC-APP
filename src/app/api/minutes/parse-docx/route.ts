import { NextResponse } from "next/server";

import { extractFromDocxBuffer } from "@/lib/extract-docx-text";
import { getSessionUser } from "@/lib/auth/session";
import { canWriteWorkspaceData } from "@/lib/workspace-access";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const session = await getSessionUser({ redirectOnDbFailure: false });
    if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    if (!canWriteWorkspaceData(session)) {
      return NextResponse.json({ error: "Sin permiso para procesar archivos." }, { status: 403 });
    }

    const formData = await req.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Adjunta un archivo Word (.docx)." }, { status: 400 });
    }

    const extracted = await extractFromDocxBuffer(await file.arrayBuffer(), file.name);

    return NextResponse.json({
      data: {
        text: extracted.text,
        fileName: file.name,
        charCount: extracted.text.length,
        suggestedTitle: extracted.suggestedTitle,
        suggestedMeetingDate: extracted.suggestedMeetingDate,
      },
    });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}
