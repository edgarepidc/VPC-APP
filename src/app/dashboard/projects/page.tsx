import { getSessionUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/rbac";
import { requireTenantId } from "@/lib/tenancy";
import { getProjectStatusBadge } from "@/lib/ui";
import { getTenantUsageSnapshot } from "@/modules/platform";
import { listProjectsByTenant } from "@/modules/projects/service";

export default async function ProjectsPage() {
  const session = await getSessionUser();
  if (!session) return null;

  const tenantId = await requireTenantId();
  const [items, usage] = await Promise.all([
    listProjectsByTenant(tenantId),
    getTenantUsageSnapshot(tenantId),
  ]);

  return (
    <main className="pmo-card p-6">
      <h1 className="pmo-title text-zinc-900">Proyectos</h1>
      <p className="mt-1 text-sm text-zinc-600">
        Scope actual por tenant: <span className="font-medium">{tenantId}</span>
      </p>
      {usage && (
        <p className="mt-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700">
          Plan <span className="font-semibold uppercase">{usage.plan}</span>:{" "}
          <span className="tabular-nums">
            {usage.projectCount}/{usage.limits.maxProjects}
          </span>{" "}
          proyectos usados.
        </p>
      )}
      <p className="mt-1 text-xs text-zinc-500">
        Permiso projects.write:{" "}
        {hasPermission(session.role, "projects.write") ? "si" : "no"}
      </p>
      <div className="mt-6 overflow-x-auto">
        <table className="pmo-table pmo-row-hover w-full min-w-[680px] text-sm">
          <thead>
            <tr className="border-b border-zinc-200 text-left text-zinc-500">
              <th>Proyecto</th>
              <th>Estado</th>
              <th>Descripcion</th>
            </tr>
          </thead>
          <tbody>
            {items.map((project) => {
              const statusBadge = getProjectStatusBadge(project.status);
              return (
                <tr key={project.id}>
                  <td className="font-medium text-zinc-900">{project.name}</td>
                  <td>
                    <span className={statusBadge.className}>{statusBadge.label}</span>
                  </td>
                  <td className="text-zinc-600">{project.description ?? "-"}</td>
                </tr>
              );
            })}
            {items.length === 0 && (
              <tr>
                <td colSpan={3} className="py-8 text-center text-zinc-500">
                  Aun no hay proyectos registrados para este tenant.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}
