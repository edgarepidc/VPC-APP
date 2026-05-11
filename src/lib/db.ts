import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

/**
 * Supabase Postgres exige TLS. Sin sslmode=require Prisma suele fallar en Vercel.
 * Pooler transaccional (puerto 6543): Prisma necesita pgbouncer=true.
 */
export function normalizeDatabaseUrl(raw: string): string {
  let url = raw.trim();
  if (!/sslmode=/i.test(url)) {
    url = url.includes("?") ? `${url}&sslmode=require` : `${url}?sslmode=require`;
  }
  if (url.includes(":6543") && !/pgbouncer=/i.test(url)) {
    url += "&pgbouncer=true";
  }
  return url;
}

const databaseUrl = process.env.DATABASE_URL?.trim();

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    ...(databaseUrl
      ? {
          datasources: {
            db: { url: normalizeDatabaseUrl(databaseUrl) },
          },
        }
      : {}),
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
}
