import { db } from "@/lib/db";
import { PlanLimitError, canCreateProject } from "@/modules/platform/limits";

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
  /** Solo para soporte interno; por defecto aplican límites del plan del tenant */
  bypassPlanLimits?: boolean;
}) {
  if (!input.bypassPlanLimits) {
    const check = await canCreateProject(input.tenantId);
    if (!check.ok) {
      throw new PlanLimitError(check.message);
    }
  }
  return db.project.create({
    data: {
      tenantId: input.tenantId,
      name: input.name,
      description: input.description,
      createdBy: input.createdBy,
    },
  });
}

export async function deleteProject(input: {
  tenantId: string;
  projectId: string;
}) {
  const result = await db.project.deleteMany({
    where: { id: input.projectId, tenantId: input.tenantId },
  });
  if (result.count === 0) {
    throw new Error("Proyecto no encontrado en esta organización.");
  }
}
