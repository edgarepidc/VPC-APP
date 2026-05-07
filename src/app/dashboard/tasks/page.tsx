import { requireTenantId } from "@/lib/tenancy";
import { listTasksByTenant } from "@/modules/tasks/service";

export default async function TasksPage() {
  const tenantId = await requireTenantId();
  const items = await listTasksByTenant(tenantId);

  return (
    <main className="pmo-card p-6">
      <h1 className="pmo-title text-zinc-900">Tareas</h1>
      <p className="mt-1 text-sm text-zinc-600">
        Solo tareas del tenant activo: <span className="font-medium">{tenantId}</span>
      </p>
      <div className="mt-6 overflow-x-auto">
        <table className="pmo-table pmo-row-hover w-full min-w-[680px] text-sm">
          <thead>
            <tr className="border-b border-zinc-200 text-left text-zinc-500">
              <th>Tarea</th>
              <th>Estado</th>
              <th>Proyecto</th>
            </tr>
          </thead>
          <tbody>
            {items.map((task) => (
              <tr key={task.id}>
                <td className="font-medium text-zinc-900">{task.title}</td>
                <td>
                  <span className="pmo-badge">{task.status}</span>
                </td>
                <td className="text-zinc-600">{task.projectId}</td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr>
                <td colSpan={3} className="py-8 text-center text-zinc-500">
                  Aun no hay tareas registradas para este tenant.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}
