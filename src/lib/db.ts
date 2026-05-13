import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

/**
 * Supabase Postgres exige TLS. Sin sslmode=require Prisma suele fallar en Vercel.
 * Pooler transaccional (puerto 6543): Prisma necesita pgbouncer=true.
 *
 * En *.pooler.supabase.com el Session pooler (puerto 5432) comparte ~15 conexiones
 * para todo el proyecto; Prisma por defecto abre más por proceso y Vercel ejecuta
 * muchas funciones en paralelo → EMAXCONNSESSION. Forzamos connection_limit=1
 * salvo que ya venga en la URL; lo ideal en producción es DATABASE_URL con
 * Transaction pooler (puerto 6543).
 */
export function normalizeDatabaseUrl(raw: string): string {
  let url = raw.trim();
  if (!/sslmode=/i.test(url)) {
    url = url.includes("?") ? `${url}&sslmode=require` : `${url}?sslmode=require`;
  }
  if (url.includes(":6543") && !/pgbouncer=/i.test(url)) {
    url += "&pgbouncer=true";
  }
  if (/\.pooler\.supabase\.com/i.test(url) && !/connection_limit=/i.test(url)) {
    url += "&connection_limit=1";
  }
  return url;
}

export type DatabaseUrlDiagnostics = {
  host: string | null;
  port: string;
  username: string | null;
  /** db.*.supabase.co:5432 — en Vercel (IPv4) suele fallar; usar pooler. */
  isDirectDbHost: boolean;
  /** Host *.pooler.supabase.com */
  poolerHost: boolean;
  looksLikePlaceholderPassword: boolean;
};

/** Metadatos seguros de DATABASE_URL (sin contraseña). */
export function getDatabaseUrlDiagnostics(
  raw: string,
): DatabaseUrlDiagnostics | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  const looksLikePlaceholderPassword =
    /\[YOUR-PASSWORD\]/i.test(trimmed) ||
    /:YOUR-PASSWORD@/i.test(trimmed) ||
    /\[PASSWORD\]/i.test(trimmed);

  try {
    const u = new URL(trimmed.replace(/^postgresql:/i, "http:"));
    const host = u.hostname || null;
    const port = u.port || "5432";
    const username = u.username ? decodeURIComponent(u.username) : null;
    const isDirectDbHost =
      host !== null &&
      /^db\.[^.]+\.supabase\.co$/i.test(host) &&
      port === "5432";
    const poolerHost =
      host !== null && /\.pooler\.supabase\.com$/i.test(host);
    return {
      host,
      port,
      username,
      isDirectDbHost,
      poolerHost,
      looksLikePlaceholderPassword,
    };
  } catch {
    return {
      host: null,
      port: "?",
      username: null,
      isDirectDbHost: false,
      poolerHost: false,
      looksLikePlaceholderPassword,
    };
  }
}

export function hintsForDatabaseUrl(d: DatabaseUrlDiagnostics): string[] {
  const hints: string[] = [];
  if (d.looksLikePlaceholderPassword) {
    hints.push(
      "La URL parece incluir el texto de ejemplo de la contraseña; reemplázalo por la contraseña real de Database en Supabase (o resetea la contraseña).",
    );
  }
  if (d.isDirectDbHost) {
    hints.push(
      "Estás usando el host directo db.*.supabase.co:5432. En Vercel (IPv4) suele no conectar; en Supabase copia la URI del Session pooler (host *.pooler.supabase.com).",
    );
  }
  if (d.poolerHost && d.port === "6543" && d.username === "postgres") {
    hints.push(
      "En el pooler transaccional (puerto 6543) el usuario suele ser postgres.TU_PROJECT_REF, no solo postgres. Copia la cadena exacta del asistente de conexión de Supabase.",
    );
  }
  if (d.poolerHost && d.port === "5432") {
    hints.push(
      "Puerto 5432 en el pooler = modo sesión (pocas conexiones simultáneas para todo el proyecto; con Vercel+Prisma suele agotarse). Preferible: en Supabase copia la URI «Transaction pooler» (puerto 6543) como DATABASE_URL.",
    );
  }
  if (!d.poolerHost && d.host?.includes("supabase") && d.port === "5432") {
    hints.push(
      "Si sigue fallando, prueba el host *.pooler.supabase.com (Session o Transaction pooler) en lugar del host directo db.*.",
    );
  }
  return hints;
}

const databaseUrl = process.env.DATABASE_URL?.trim();

function createPrismaClient(): PrismaClient {
  return new PrismaClient({
    ...(databaseUrl
      ? {
          datasources: {
            db: { url: normalizeDatabaseUrl(databaseUrl) },
          },
        }
      : {}),
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
}

export const db = globalForPrisma.prisma ?? createPrismaClient();
globalForPrisma.prisma = db;
