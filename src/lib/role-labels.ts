import type { RoleKey } from "@/lib/types";

/** Etiquetas para UI (perfiles de negocio). */
export const ROLE_LABELS: Record<RoleKey, string> = {
  admin: "Administrador",
  manager: "PM (gestor)",
  member: "Consultante (solo lectura)",
};

/** Etiqueta corta en menú lateral del dashboard. */
export const ROLE_SIDEBAR_LABELS: Record<RoleKey, string> = {
  admin: "Administrador",
  manager: "PM",
  member: "Miembro",
};

export function personInitialsFromName(name: string, email: string): string {
  const n = name?.trim();
  const source =
    n && n !== email ? n : email.split("@")[0]?.replace(/[._-]+/g, " ") ?? "?";
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    const a = parts[0][0];
    const b = parts[1][0];
    if (a && b) return `${a}${b}`.toUpperCase();
  }
  const w = parts[0] ?? "?";
  return w.slice(0, 2).toUpperCase();
}
