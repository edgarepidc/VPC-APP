import { requireTenantId } from "@/lib/tenancy";
import { listTasksByTenant } from "@/modules/tasks/service";

export default async function TasksPage() {
  const tenantId = await requireTenantId();
  const items = listTasksByTenant(tenantId);

  return (
    <main className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
      <h1 className="text-2xl font-semibold text-zinc-900">Tareas</h1>
      <p className="mt-1 text-sm text-zinc-600">
        Solo tareas del tenant activo: <span className="font-medium">{tenantId}</span>
      </p>
      <ul className="mt-6 space-y-3">
        {items.map((task) => (
          <li key={task.id} className="rounded-md border border-zinc-200 p-3">
            <p className="font-medium text-zinc-900">{task.title}</p>
            <p className="text-sm text-zinc-600">Estado: {task.status}</p>
            <p className="text-xs text-zinc-500">Proyecto: {task.projectId}</p>
          </li>
        ))}
      </ul>
    </main>
  );
}
