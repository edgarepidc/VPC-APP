import { db } from "@/lib/db";
import { PlanLimitError, canCreateProject } from "@/modules/platform/limits";

export const PROJECT_STATUS_VALUES = [
  "active",
  "planning",
  "blocked",
  "done",
] as const;
export type ProjectStatusValue = (typeof PROJECT_STATUS_VALUES)[number];

export type ProjectRecord = {
  id: string;
  tenantId: string;
  name: string;
  description: string | null;
  status: string;
  createdBy: string;
  parentProjectId: string | null;
  sortOrder: number;
  createdAt: Date;
};

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

const projectSelect = {
  id: true,
  tenantId: true,
  name: true,
  description: true,
  status: true,
  createdBy: true,
  parentProjectId: true,
  sortOrder: true,
  createdAt: true,
} as const;

export async function listProjectsByTenant(
  tenantId: string,
  options?: {
    restrictToProjectIds?: string[];
    activeOnly?: boolean;
    /** Solo iniciativas (raíz). */
    initiativesOnly?: boolean;
    /** Solo subproyectos de una iniciativa. */
    parentProjectId?: string;
  },
) {
  const restrict = options?.restrictToProjectIds;
  const activeOnly = options?.activeOnly;
  return db.project.findMany({
    where: {
      tenantId,
      ...(restrict !== undefined ? { id: { in: restrict } } : {}),
      ...(options?.initiativesOnly ? { parentProjectId: null } : {}),
      ...(options?.parentProjectId !== undefined
        ? { parentProjectId: options.parentProjectId }
        : {}),
      ...(activeOnly
        ? { status: { notIn: ["done", "blocked", "cancelled", "cancelado"] } }
        : {}),
    },
    orderBy: [{ parentProjectId: "asc" }, { sortOrder: "asc" }, { name: "asc" }],
    select: projectSelect,
  });
}

export async function countInitiativesByTenant(tenantId: string): Promise<number> {
  return db.project.count({
    where: { tenantId, parentProjectId: null },
  });
}

export async function createProject(input: {
  tenantId: string;
  name: string;
  description: string;
  createdBy: string;
  parentProjectId?: string | null;
  sortOrder?: number;
  /** Solo aplica al crear iniciativa (sin padre). */
  bypassPlanLimits?: boolean;
}) {
  const parentProjectId = input.parentProjectId?.trim() || null;

  if (parentProjectId) {
    const parent = await db.project.findFirst({
      where: { id: parentProjectId, tenantId: input.tenantId, parentProjectId: null },
      select: { id: true },
    });
    if (!parent) {
      throw new Error("La iniciativa padre no existe o no es una iniciativa válida.");
    }
  } else if (!input.bypassPlanLimits) {
    const check = await canCreateProject(input.tenantId);
    if (!check.ok) {
      throw new PlanLimitError(check.message);
    }
  }

  return db.project.create({
    data: {
      tenantId: input.tenantId,
      name: input.name.trim(),
      description: input.description.trim() || null,
      createdBy: input.createdBy,
      parentProjectId,
      sortOrder: input.sortOrder ?? 0,
    },
    select: projectSelect,
  });
}

/** Alias explícito para UI. */
export async function createInitiative(
  input: Omit<Parameters<typeof createProject>[0], "parentProjectId">,
) {
  return createProject({ ...input, parentProjectId: null });
}

export async function createSubproject(input: {
  tenantId: string;
  parentProjectId: string;
  name: string;
  description?: string;
  createdBy: string;
  sortOrder?: number;
}) {
  return createProject({
    tenantId: input.tenantId,
    name: input.name,
    description: input.description ?? "",
    createdBy: input.createdBy,
    parentProjectId: input.parentProjectId,
    sortOrder: input.sortOrder,
    bypassPlanLimits: true,
  });
}

export async function getProjectById(tenantId: string, projectId: string) {
  return db.project.findFirst({
    where: { id: projectId, tenantId },
    select: projectSelect,
  });
}

export async function listSubprojectsByInitiative(tenantId: string, initiativeId: string) {
  return listProjectsByTenant(tenantId, { parentProjectId: initiativeId });
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
  sortOrder?: number;
}) {
  const name = input.name.trim();
  if (!name) {
    throw new Error("El nombre no puede estar vacío.");
  }
  const description = input.description.trim();
  const status = normalizeProjectStatus(input.status);

  const result = await db.project.updateMany({
    where: { id: input.projectId, tenantId: input.tenantId },
    data: {
      name,
      description: description.length > 0 ? description : null,
      status,
      ...(typeof input.sortOrder === "number" ? { sortOrder: input.sortOrder } : {}),
    },
  });
  if (result.count === 0) {
    throw new Error("Proyecto no encontrado en esta organización.");
  }
}

export async function listAllProjectsForTenant(tenantId: string) {
  return db.project.findMany({
    where: { tenantId },
    orderBy: [{ parentProjectId: "asc" }, { sortOrder: "asc" }, { name: "asc" }],
    select: { id: true, name: true, parentProjectId: true, sortOrder: true, status: true },
  });
}
