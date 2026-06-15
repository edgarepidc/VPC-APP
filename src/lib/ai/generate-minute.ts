import { generateText, Output } from "ai";

import {
  DEFAULT_MINUTE_PROMPT,
  meetingMinuteContentSchema,
  type MeetingMinuteContent,
  type MinuteProvider,
} from "@/lib/meeting-minute-types";

/** Modelos vía Vercel AI Gateway (provider/model). */
const MODEL_BY_PROVIDER: Record<MinuteProvider, { gatewayModel: string; label: string }> = {
  claude: { gatewayModel: "anthropic/claude-sonnet-4.6", label: "anthropic/claude-sonnet-4.6" },
  deepseek: { gatewayModel: "deepseek/deepseek-chat", label: "deepseek/deepseek-chat" },
};

function isGatewayAuthReady(): boolean {
  return !!(
    process.env.AI_GATEWAY_API_KEY?.trim() ||
    process.env.VERCEL_OIDC_TOKEN?.trim() ||
    process.env.VERCEL === "1"
  );
}

function assertGatewayAuthReady() {
  if (!isGatewayAuthReady()) {
    throw new Error(
      "Falta AI Gateway: activa AI Gateway en Vercel o define AI_GATEWAY_API_KEY.",
    );
  }
}

function buildSystemPrompt() {
  return [
    "Eres un asistente experto en redacción de minutas de reuniones corporativas.",
    "Responde siempre en español, con tono profesional y claro.",
    "Extrae la información únicamente de la transcripción proporcionada; no inventes acuerdos ni responsables.",
    "Si un dato no aparece en la transcripción, indícalo explícitamente (p. ej. responsable o fecha «Por definir»).",
    "Para cada punto tratado, redacta un párrafo descriptivo (no viñetas sueltas).",
    "Incluye todos los acuerdos y tareas de seguimiento identificables.",
  ].join("\n");
}

function buildUserPrompt(transcript: string, customPrompt?: string) {
  const instruction = customPrompt?.trim() || DEFAULT_MINUTE_PROMPT;
  return [
    instruction,
    "",
    "Estructura esperada:",
    "1. Resumen ejecutivo de ideas y temas principales.",
    "2. Puntos tratados: cada uno con título y descripción en párrafo.",
    "3. Acuerdos y tareas: acción, responsable y fecha.",
    "",
    "--- TRANSCRIPCIÓN ---",
    transcript,
    "--- FIN TRANSCRIPCIÓN ---",
  ].join("\n");
}

export async function generateMeetingMinuteFromTranscript(input: {
  transcript: string;
  provider: MinuteProvider;
  customPrompt?: string;
}): Promise<{ content: MeetingMinuteContent; provider: MinuteProvider; model: string }> {
  assertGatewayAuthReady();
  const { gatewayModel, label } = MODEL_BY_PROVIDER[input.provider];

  const result = await generateText({
    model: gatewayModel,
    output: Output.object({ schema: meetingMinuteContentSchema }),
    system: buildSystemPrompt(),
    prompt: buildUserPrompt(input.transcript, input.customPrompt),
  });

  if (!result.output) {
    throw new Error("El modelo no devolvió una minuta estructurada. Intenta de nuevo.");
  }

  return {
    content: result.output,
    provider: input.provider,
    model: label,
  };
}

export function isMinuteAiConfigured(): { claude: boolean; deepseek: boolean } {
  const ready = isGatewayAuthReady();
  return { claude: ready, deepseek: ready };
}
