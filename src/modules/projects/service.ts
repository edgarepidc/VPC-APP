import { db } from "@/lib/db";
import { PlanLimitError, canCreateProject } from "@/modules/platform/limits";

export const PROJECT_STATUS_VALUES = [
  "active",
  "planning",
  "blocked",
  "done",
] as const;
export type ProjectStatusValue = (typeof PROJECT_STATUS_VALUES)[number];

export function normalizeProjectStatus(raw: string): ProjectStatusValue {
  const s = raw.trim().toLowerCase();
  if (["done", "completed", "cerrado"].includes(s)) return "done";
  if (["planning", "pendiente", "draft"].includes(s)) return "planning";
  if (["blocked", "at_risk", "at-risk", "cancelled", "cancelado"].includes(s)) {
    return "blocked";
  }
  if (["active", "on_track", "on-track", "en curso"].includes(s)) return "active";
  return PROJECT_STATUS_VALUES.includes(s as ProjectStatusValue)
    ? (s as ProjectStatusValue)
    : "active";
}

export async function listProjectsByTenant(
  tenantId: string,
  options?: { restrictToProjectIds?: string[]; activeOnly?: boolean },
) {
  const restrict = options?.restrictToProjectIds;
  const activeOnly = options?.activeOnly;
  return db.project.findMany({
    where: {
      tenantId,
      ...(restrict !== undefined ? { id: { in: restrict } } : {}),
      ...(activeOnly
        ? { status: { notIn: ["done", "blocked", "cancelled", "cancelado"] } }
        : {}),
    },
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

export async function updateProject(input: {
  tenantId: string;
  projectId: string;
  name: string;
  description: string;
  status: string;
}) {
  const name = input.name.trim();
  if (!name) {
    throw new Error("El nombre del proyecto no puede estar vacío.");
  }
  const description = input.description.trim();
  const status = normalizeProjectStatus(input.status);

  const result = await db.project.updateMany({
    where: { id: input.projectId, tenantId: input.tenantId },
    data: {
      name,
      description: description.length > 0 ? description : null,
      status,
    },
  });
  if (result.count === 0) {
    throw new Error("Proyecto no encontrado en esta organización.");
  }
}
