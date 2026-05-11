import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";

import {
  db,
  getDatabaseUrlDiagnostics,
  hintsForDatabaseUrl,
  normalizeDatabaseUrl,
} from "@/lib/db";

export const dynamic = "force-dynamic";

function redactDbErrorMessage(message: string): string {
  return message
    .replace(/postgresql:\/\/[^\s)]+/gi, "postgresql://***")
    .replace(/postgres:\/\/[^\s)]+/gi, "postgres://***");
}

/** Comprueba conexión Prisma → Postgres (sin datos sensibles). */
export async function GET() {
  const hasUrl = !!process.env.DATABASE_URL?.trim();
  if (!hasUrl) {
    return NextResponse.json({
      ok: false,
      hasDatabaseUrl: false,
      hint: "Define DATABASE_URL en Vercel (Production).",
    });
  }

  try {
    await db.$queryRaw`SELECT 1`;
    const raw = process.env.DATABASE_URL?.trim() ?? "";
    return NextResponse.json({
      ok: true,
      hasDatabaseUrl: true,
      effectiveUrlHasSslMode: /sslmode=/i.test(normalizeDatabaseUrl(raw)),
    });
  } catch (err) {
    const code =
      err instanceof Prisma.PrismaClientKnownRequestError
        ? err.code
        : err instanceof Prisma.PrismaClientInitializationError
          ? err.errorCode ?? "INIT"
          : "UNKNOWN";

    const raw = process.env.DATABASE_URL?.trim() ?? "";
    const diag = getDatabaseUrlDiagnostics(raw);
    const safeDiag = diag
      ? {
          host: diag.host,
          port: diag.port,
          username: diag.username,
          isDirectDbHost: diag.isDirectDbHost,
          poolerHost: diag.poolerHost,
          looksLikePlaceholderPassword: diag.looksLikePlaceholderPassword,
        }
      : null;

    const detail =
      err instanceof Error
        ? redactDbErrorMessage(err.message)
        : redactDbErrorMessage(String(err));

    const hints = diag ? hintsForDatabaseUrl(diag) : [];

    return NextResponse.json(
      {
        ok: false,
        hasDatabaseUrl: true,
        prismaCode: code,
        effectiveUrlHasSslMode: /sslmode=/i.test(normalizeDatabaseUrl(raw)),
        urlDiagnostics: safeDiag,
        detail,
        hints,
        note: "La app añade sslmode=require y pgbouncer=true si el puerto es 6543.",
      },
      { status: 503 },
    );
  }
}
