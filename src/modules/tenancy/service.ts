import { db } from "@/lib/db";

export async function listTenantsForUser(userId: string) {
  const memberships = await db.membership.findMany({
    where: { userId, status: "active" },
    select: {
      tenant: {
        select: {
          id: true,
          name: true,
          slug: true,
        },
      },
    },
    orderBy: { tenant: { name: "asc" } },
  });

  return memberships.map((item) => item.tenant);
}
