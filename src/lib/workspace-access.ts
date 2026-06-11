import type { SessionUser } from "@/lib/types";

import { hasPermission } from "./rbac";

/** Admin y PM (salvo solo lectura) pueden crear/editar entregables, riesgos, escalómetro, etc. */
export function canWriteWorkspaceData(session: SessionUser): boolean {
  if (session.isPlatformVisit) return true;
  if (session.role === "admin") return true;
  if (session.role === "member") return false;
  if (session.role === "manager") return !session.managerReadOnly;
  return hasPermission(session.role, "tasks.write");
}
