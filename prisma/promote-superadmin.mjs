/**
 * Marca un usuario como superadmin en Postgres (plataforma).
 *
 *   BOOTSTRAP_USER_EMAIL=tu@correo.com DATABASE_URL=... node prisma/promote-superadmin.mjs
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const email = (process.env.BOOTSTRAP_USER_EMAIL ?? "").trim().toLowerCase();

async function main() {
  if (!email) {
    console.error("Define BOOTSTRAP_USER_EMAIL.");
    process.exit(1);
  }
  const u = await prisma.user.updateMany({
    where: { email },
    data: { isSuperAdmin: true },
  });
  if (u.count === 0) {
    console.error(`No hay User con email ${email}. Registrate en la app primero.`);
    process.exit(1);
  }
  console.log(`OK: ${email} es superadmin (isSuperAdmin=true).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
