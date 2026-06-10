export type RoleKey = "admin" | "manager" | "member";

export type PermissionKey =
  | "projects.read"
  | "projects.write"
  | "tasks.read"
  | "tasks.write";

export type SessionUser = {
  userId: string;
  email: string;
  name: string;
  activeTenantId: string | null;
  role: RoleKey;
  /** Acceso a /admin (plataforma). DB isSuperAdmin o PLATFORM_SUPERADMIN_EMAILS en Vercel. */
  isSuperAdmin: boolean;
  /** true si `User.isSuperAdmin` en Postgres (no incluye solo variables de entorno). */
  isSuperAdminFromDb: boolean;
  /** true si el correo está en PLATFORM_OWNER_EMAIL o PLATFORM_SUPERADMIN_EMAILS. */
  isSuperAdminFromEnv: boolean;
  /**
   * Superadmin entró con “Entrar al workspace” sin membresía en ese tenant.
   * Rol efectivo admin; útil para avisos de gobernanza en UI.
   */
  isPlatformVisit: boolean;
};

export type Tenant = {
  id: string;
  slug: string;
  name: string;
};

export type Project = {
  id: string;
  tenantId: string;
  name: string;
  description: string;
  createdBy: string;
};

export type Task = {
  id: string;
  tenantId: string;
  projectId: string;
  title: string;
  status: "todo" | "in_progress" | "done";
  assigneeUserId?: string;
};
