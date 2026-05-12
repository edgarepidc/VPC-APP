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
