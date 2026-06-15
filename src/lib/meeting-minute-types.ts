import { z } from "zod";

export const MINUTE_PROVIDERS = ["claude", "deepseek"] as const;
export type MinuteProvider = (typeof MINUTE_PROVIDERS)[number];

export const MINUTE_PROVIDER_LABELS: Record<MinuteProvider, string> = {
  claude: "Claude Haiku 4.5",
  deepseek: "DeepSeek V3.2",
};

export const meetingMinuteContentSchema = z.object({
  summary: z.string().describe("Resumen ejecutivo de ideas y temas principales"),
  topics: z
    .array(
      z.object({
        title: z.string().describe("Título breve del punto tratado"),
        description: z
          .string()
          .describe("Descripción en párrafo del punto discutido en la reunión"),
      }),
    )
    .describe("Puntos tratados en la sesión"),
  actionItems: z
    .array(
      z.object({
        action: z.string().describe("Acción o acuerdo de seguimiento"),
        owner: z.string().describe("Responsable asignado o mencionado"),
        dueDate: z
          .string()
          .describe('Fecha límite o plazo; usar "Por definir" si no se mencionó'),
      }),
    )
    .describe("Acuerdos y tareas de seguimiento"),
});

export type MeetingMinuteContent = z.infer<typeof meetingMinuteContentSchema>;

export type MeetingMinuteRow = {
  id: string;
  tenantId: string;
  projectId: string;
  title: string;
  meetingDate: Date | null;
  content: MeetingMinuteContent;
  /** Markdown editable; si falta, se deriva de content. */
  markdown: string | null;
  provider: MinuteProvider;
  model: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  project: { id: string; name: string };
  authorName: string;
};

export function parseMeetingMinuteContent(raw: unknown): MeetingMinuteContent | null {
  const parsed = meetingMinuteContentSchema.safeParse(raw);
  return parsed.success ? parsed.data : null;
}

export const MAX_TRANSCRIPT_CHARS = 120_000;

export const DEFAULT_MINUTE_PROMPT =
  "Resuma las ideas y temas principales discutidos en la reunión. Adicionalmente, incluya los acuerdos y tareas de seguimiento dentro de una tabla con acción, responsable y fecha.";
