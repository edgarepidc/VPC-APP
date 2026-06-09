import type { RoleKey } from "@/lib/types";

/** Etiquetas para UI (perfiles de negocio). */
export const ROLE_LABELS: Record<RoleKey, string> = {
  admin: "Administrador",
  manager: "PM (gestor)",
  member: "Consultante (solo lectura)",
};
