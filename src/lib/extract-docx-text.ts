import mammoth from "mammoth";

import { MAX_TRANSCRIPT_CHARS } from "@/lib/meeting-minute-types";

export const MAX_DOCX_FILE_BYTES = 10 * 1024 * 1024;

export const DOCX_MIME =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

export const DOCX_ACCEPT = ".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document";

export async function extractTextFromDocxBuffer(
  buffer: ArrayBuffer,
  fileName: string,
): Promise<string> {
  const lower = fileName.toLowerCase();
  if (!lower.endsWith(".docx")) {
    throw new Error("Solo se admiten archivos .docx (Word moderno). El formato .doc no está soportado.");
  }

  if (buffer.byteLength > MAX_DOCX_FILE_BYTES) {
    throw new Error("El archivo supera el límite de 10 MB.");
  }

  const result = await mammoth.extractRawText({ arrayBuffer: buffer });
  const text = result.value.trim();

  if (!text) {
    throw new Error("No se encontró texto legible en el documento.");
  }

  if (text.length > MAX_TRANSCRIPT_CHARS) {
    throw new Error(
      `El texto extraído supera el límite de ${MAX_TRANSCRIPT_CHARS.toLocaleString("es-MX")} caracteres.`,
    );
  }

  return text;
}
