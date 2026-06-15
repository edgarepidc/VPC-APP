import { createGateway, generateText, Output } from "ai";

import {
  DEFAULT_MINUTE_PROMPT,
  meetingMinuteContentSchema,
  type MeetingMinuteContent,
  type MinuteProvider,
} from "@/lib/meeting-minute-types";

/** Modelos compatibles con créditos gratuitos de AI Gateway ($5/mes). */
const MODEL_BY_PROVIDER: Record<MinuteProvider, { gatewayModel: string; label: string }> = {
  claude: {
    gatewayModel: "anthropic/claude-haiku-4.5",
    label: "anthropic/claude-haiku-4.5",
  },
  deepseek: {
    gatewayModel: "deepseek/deepseek-v3.2",
    label: "deepseek/deepseek-v3.2",
  },
};

function isGatewayConfigured(): boolean {
  return !!process.env.AI_GATEWAY_API_KEY?.trim();
}

function assertGatewayConfigured() {
  if (!isGatewayConfigured()) {
    throw new Error(
      "Falta AI_GATEWAY_API_KEY en Vercel. Crea una clave en AI Gateway y redeploya el proyecto.",
    );
  }
}

function getGatewayModel(provider: MinuteProvider) {
  assertGatewayConfigured();
  const apiKey = process.env.AI_GATEWAY_API_KEY!.trim();
  const gateway = createGateway({ apiKey });
  const { gatewayModel } = MODEL_BY_PROVIDER[provider];
  return gateway(gatewayModel);
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
  const model = getGatewayModel(input.provider);
  const { label } = MODEL_BY_PROVIDER[input.provider];

  const result = await generateText({
    model,
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
  const ready = isGatewayConfigured();
  return { claude: ready, deepseek: ready };
}
