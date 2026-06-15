import { Buffer } from "node:buffer";

import JSZip from "jszip";
import mammoth from "mammoth";

import { MAX_TRANSCRIPT_CHARS } from "@/lib/meeting-minute-types";

export const MAX_DOCX_FILE_BYTES = 10 * 1024 * 1024;

export const DOCX_MIME =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

export const DOCX_ACCEPT =
  ".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document";

export type DocxExtractResult = {
  text: string;
  suggestedTitle: string | null;
  /** ISO date YYYY-MM-DD for input[type=date]. */
  suggestedMeetingDate: string | null;
};

const GENERIC_TITLES = new Set(
  [
    "document",
    "documento",
    "sin título",
    "untitled",
    "documento word",
    "word document",
  ].map((s) => s.toLowerCase()),
);

const MONTHS_ES: Record<string, number> = {
  enero: 1,
  febrero: 2,
  marzo: 3,
  abril: 4,
  mayo: 5,
  junio: 6,
  julio: 7,
  agosto: 8,
  septiembre: 9,
  setiembre: 9,
  octubre: 10,
  noviembre: 11,
  diciembre: 12,
};

function decodeXmlEntities(value: string): string {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

function readXmlElement(xml: string, localName: string): string | null {
  const re = new RegExp(
    `<(?:[\\w-]+:)?${localName}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/(?:[\\w-]+:)?${localName}>`,
    "i",
  );
  const match = xml.match(re);
  if (!match?.[1]) return null;
  const value = decodeXmlEntities(match[1].replace(/\s+/g, " ").trim());
  return value || null;
}

function toIsoDate(year: number, month: number, day: number): string | null {
  if (month < 1 || month > 12 || day < 1 || day > 31 || year < 1900 || year > 2100) {
    return null;
  }
  const d = new Date(Date.UTC(year, month - 1, day));
  if (
    d.getUTCFullYear() !== year ||
    d.getUTCMonth() !== month - 1 ||
    d.getUTCDate() !== day
  ) {
    return null;
  }
  const mm = String(month).padStart(2, "0");
  const dd = String(day).padStart(2, "0");
  return `${year}-${mm}-${dd}`;
}

function isoFromW3cDateTime(raw: string | null | undefined): string | null {
  if (!raw?.trim()) return null;
  const match = raw.trim().match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return null;
  return toIsoDate(Number(match[1]), Number(match[2]), Number(match[3]));
}

function parseDateFromTextLine(line: string): string | null {
  const trimmed = line.trim();
  if (!trimmed) return null;

  const iso = trimmed.match(/\b(20\d{2})-(\d{2})-(\d{2})\b/);
  if (iso) return toIsoDate(Number(iso[1]), Number(iso[2]), Number(iso[3]));

  const slash = trimmed.match(/\b(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})\b/);
  if (slash) {
    let day = Number(slash[1]);
    let month = Number(slash[2]);
    let year = Number(slash[3]);
    if (year < 100) year += 2000;
    if (month > 12 && day <= 12) [day, month] = [month, day];
    return toIsoDate(year, month, day);
  }

  const spanish = trimmed.match(
    /\b(\d{1,2})\s+de\s+(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|setiembre|octubre|noviembre|diciembre)\s+de\s+(20\d{2})\b/i,
  );
  if (spanish) {
    const month = MONTHS_ES[spanish[2].toLowerCase()];
    if (month) return toIsoDate(Number(spanish[3]), month, Number(spanish[1]));
  }

  return null;
}

function inferDateFromText(text: string): string | null {
  const lines = text.split(/\r?\n/).slice(0, 20);
  for (const line of lines) {
    const parsed = parseDateFromTextLine(line);
    if (parsed) return parsed;
  }
  return null;
}

function isUsefulTitle(value: string | null | undefined): value is string {
  if (!value?.trim()) return false;
  const normalized = value.trim().toLowerCase();
  if (normalized.length < 3) return false;
  if (GENERIC_TITLES.has(normalized)) return false;
  return true;
}

function titleFromFileName(fileName: string): string | null {
  const base = fileName.replace(/\.docx$/i, "").trim();
  if (!base || base.length < 3) return null;
  const cleaned = base.replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim();
  return cleaned.length >= 3 ? cleaned : null;
}

function inferTitleFromText(text: string): string | null {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  for (const line of lines.slice(0, 8)) {
    if (line.length > 200) continue;
    if (/^minuta\b/i.test(line) && line.length >= 8) return line;
    if (parseDateFromTextLine(line) && line.length <= 40) continue;
    if (line.length >= 8 && !/^página\s+\d+/i.test(line)) return line;
  }

  return null;
}

async function readDocxCoreProperties(buffer: ArrayBuffer): Promise<{
  title: string | null;
  created: string | null;
  modified: string | null;
}> {
  const zip = await JSZip.loadAsync(buffer);
  const coreFile = zip.file("docProps/core.xml");
  if (!coreFile) {
    return { title: null, created: null, modified: null };
  }

  const xml = await coreFile.async("string");
  return {
    title: readXmlElement(xml, "title"),
    created: readXmlElement(xml, "created"),
    modified: readXmlElement(xml, "modified"),
  };
}

function resolveSuggestedTitle(
  coreTitle: string | null,
  text: string,
  fileName: string,
): string | null {
  if (isUsefulTitle(coreTitle)) return coreTitle.trim();
  const fromText = inferTitleFromText(text);
  if (fromText) return fromText;
  return titleFromFileName(fileName);
}

function resolveSuggestedMeetingDate(
  coreCreated: string | null,
  coreModified: string | null,
  text: string,
): string | null {
  return (
    isoFromW3cDateTime(coreCreated) ??
    inferDateFromText(text) ??
    isoFromW3cDateTime(coreModified)
  );
}

export async function extractFromDocxBuffer(
  buffer: ArrayBuffer,
  fileName: string,
): Promise<DocxExtractResult> {
  const lower = fileName.toLowerCase();
  if (!lower.endsWith(".docx")) {
    throw new Error(
      "Solo se admiten archivos .docx (Word moderno). El formato .doc no está soportado.",
    );
  }

  if (buffer.byteLength > MAX_DOCX_FILE_BYTES) {
    throw new Error("El archivo supera el límite de 10 MB.");
  }

  const nodeBuffer = Buffer.from(buffer);
  const [mammothResult, core] = await Promise.all([
    mammoth.extractRawText({ buffer: nodeBuffer }),
    readDocxCoreProperties(buffer),
  ]);

  const text = mammothResult.value.trim();
  if (!text) {
    throw new Error("No se encontró texto legible en el documento.");
  }

  if (text.length > MAX_TRANSCRIPT_CHARS) {
    throw new Error(
      `El texto extraído supera el límite de ${MAX_TRANSCRIPT_CHARS.toLocaleString("es-MX")} caracteres.`,
    );
  }

  return {
    text,
    suggestedTitle: resolveSuggestedTitle(core.title, text, fileName),
    suggestedMeetingDate: resolveSuggestedMeetingDate(
      core.created,
      core.modified,
      text,
    ),
  };
}
