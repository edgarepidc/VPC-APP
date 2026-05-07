import { getSessionUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/rbac";
import { requireTenantId } from "@/lib/tenancy";
import { listProjectsByTenant } from "@/modules/projects/service";

export default async function ProjectsPage() {
  const session = await getSessionUser();
  if (!session) return null;

  const tenantId = await requireTenantId();
  const items = listProjectsByTenant(tenantId);

  return (
    <main className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
      <h1 className="text-2xl font-semibold text-zinc-900">Proyectos</h1>
      <p className="mt-1 text-sm text-zinc-600">
        Scope actual por tenant: <span className="font-medium">{tenantId}</span>
      </p>
      <p className="mt-1 text-xs text-zinc-500">
        Permiso projects.write:{" "}
        {hasPermission(session.role, "projects.write") ? "si" : "no"}
      </p>
      <ul className="mt-6 space-y-3">
        {items.map((project) => (
          <li key={project.id} className="rounded-md border border-zinc-200 p-3">
            <p className="font-medium text-zinc-900">{project.name}</p>
            <p className="text-sm text-zinc-600">{project.description}</p>
          </li>
        ))}
      </ul>
    </main>
  );
}
