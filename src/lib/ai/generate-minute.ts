import { anthropic } from "@ai-sdk/anthropic";
import { deepseek } from "@ai-sdk/deepseek";
import { generateText, Output } from "ai";

import {
  DEFAULT_MINUTE_PROMPT,
  meetingMinuteContentSchema,
  type MeetingMinuteContent,
  type MinuteProvider,
} from "@/lib/meeting-minute-types";

const MODEL_BY_PROVIDER: Record<MinuteProvider, { modelId: string; label: string }> = {
  claude: { modelId: "claude-sonnet-4-20250514", label: "claude-sonnet-4-20250514" },
  deepseek: { modelId: "deepseek-chat", label: "deepseek-chat" },
};

function resolveLanguageModel(provider: MinuteProvider) {
  const { modelId } = MODEL_BY_PROVIDER[provider];
  if (provider === "claude") {
    if (!process.env.ANTHROPIC_API_KEY?.trim()) {
      throw new Error("Falta ANTHROPIC_API_KEY en el entorno del servidor.");
    }
    return anthropic(modelId);
  }
  if (!process.env.DEEPSEEK_API_KEY?.trim()) {
    throw new Error("Falta DEEPSEEK_API_KEY en el entorno del servidor.");
  }
  return deepseek(modelId);
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
  const model = resolveLanguageModel(input.provider);
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
  return {
    claude: !!process.env.ANTHROPIC_API_KEY?.trim(),
    deepseek: !!process.env.DEEPSEEK_API_KEY?.trim(),
  };
}
