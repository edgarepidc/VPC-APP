import type { PermissionKey, RoleKey } from "@/lib/types";

const rolePermissions: Record<RoleKey, PermissionKey[]> = {
  owner: ["projects.read", "projects.write", "tasks.read", "tasks.write"],
  admin: ["projects.read", "projects.write", "tasks.read", "tasks.write"],
  manager: ["projects.read", "projects.write", "tasks.read", "tasks.write"],
  member: ["projects.read", "tasks.read"],
};

export function hasPermission(role: RoleKey, permission: PermissionKey) {
  return rolePermissions[role].includes(permission);
}

export function canManageMembers(role: RoleKey) {
  return role === "owner" || role === "admin";
}
