import type { MeetingMinuteContent } from "@/lib/meeting-minute-types";

function escapeTableCell(value: string): string {
  return value.replace(/\|/g, "\\|").replace(/\n/g, " ").trim();
}

export function contentToMarkdown(
  content: MeetingMinuteContent,
  title?: string,
): string {
  const lines: string[] = [];

  if (title?.trim()) {
    lines.push(`# ${title.trim()}`, "");
  }

  lines.push("## Resumen", "", content.summary.trim(), "");

  if (content.topics.length > 0) {
    lines.push("## Puntos tratados", "");
    for (const topic of content.topics) {
      lines.push(`### ${topic.title.trim()}`, "", topic.description.trim(), "");
    }
  }

  lines.push("## Acuerdos y tareas de seguimiento", "");

  if (content.actionItems.length === 0) {
    lines.push("_No se identificaron acuerdos en la sesión._", "");
  } else {
    lines.push("| Acción | Responsable | Fecha |");
    lines.push("| --- | --- | --- |");
    for (const item of content.actionItems) {
      lines.push(
        `| ${escapeTableCell(item.action)} | ${escapeTableCell(item.owner)} | ${escapeTableCell(item.dueDate)} |`,
      );
    }
    lines.push("");
  }

  return lines.join("\n").trim();
}

export function resolveMeetingMinuteMarkdown(input: {
  markdown?: string | null;
  content: MeetingMinuteContent;
  title: string;
}): string {
  if (input.markdown?.trim()) return input.markdown.trim();
  return contentToMarkdown(input.content, input.title);
}
