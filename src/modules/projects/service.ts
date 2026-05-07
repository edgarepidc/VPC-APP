import { db } from "@/lib/db";

export async function listProjectsByTenant(tenantId: string) {
  return db.project.findMany({
    where: { tenantId },
    orderBy: { createdAt: "desc" },
  });
}

export async function createProject(input: {
  tenantId: string;
  name: string;
  description: string;
  createdBy: string;
}) {
  return db.project.create({
    data: {
      tenantId: input.tenantId,
      name: input.name,
      description: input.description,
      createdBy: input.createdBy,
    },
  });
}
