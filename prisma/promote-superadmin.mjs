/**
 * Marca usuarios como superadmin en Postgres (plataforma /admin).
 *
 * El usuario debe existir ya en la tabla `User` (suele crearse al iniciar sesión la primera vez).
 *
 * Un correo:
 *   BOOTSTRAP_USER_EMAIL=correo@dominio.com DATABASE_URL=... node prisma/promote-superadmin.mjs
 *
 * Varios (coma o punto y coma):
 *   BOOTSTRAP_USER_EMAILS="a@x.com,b@y.com" DATABASE_URL=... node prisma/promote-superadmin.mjs
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function parseEmails() {
  const multi = process.env.BOOTSTRAP_USER_EMAILS?.trim();
  if (multi) {
    return multi
      .split(/[,;]/)
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);
  }
  const one = (process.env.BOOTSTRAP_USER_EMAIL ?? "").trim().toLowerCase();
  return one ? [one] : [];
}

async function main() {
  const emails = parseEmails();
  if (emails.length === 0) {
    console.error(
      "Define BOOTSTRAP_USER_EMAIL o BOOTSTRAP_USER_EMAILS (lista separada por coma).",
    );
    process.exit(1);
  }

  let failures = 0;
  for (const email of emails) {
    const u = await prisma.user.updateMany({
      where: { email },
      data: { isSuperAdmin: true },
    });
    if (u.count === 0) {
      console.error(
        `[fallo] No hay fila User con email ${email}. Debe iniciar sesión al menos una vez en la app.`,
      );
      failures += 1;
    } else {
      console.log(`OK: ${email} -> isSuperAdmin=true`);
    }
  }

  if (failures > 0) {
    process.exit(1);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
