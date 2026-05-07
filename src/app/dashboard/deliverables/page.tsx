import { redirect } from "next/navigation";

import { getSessionUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/rbac";
import { requireTenantId } from "@/lib/tenancy";
import { getSemaphoreBadge } from "@/lib/ui";
import { createDeliverable, listDeliverablesByTenant } from "@/modules/deliverables/service";
import { listProjectsByTenant } from "@/modules/projects/service";

type DeliverablesPageProps = {
  searchParams: Promise<{ error?: string; ok?: string }>;
};

const statusOptions = [
  { value: "pending", label: "Pendiente" },
  { value: "review", label: "En revision" },
  { value: "approved", label: "Aprobado" },
  { value: "delivered", label: "Entregado" },
];

export default async function DeliverablesPage({ searchParams }: DeliverablesPageProps) {
  const params = await searchParams;
  const session = await getSessionUser();
  if (!session) redirect("/login");

  const tenantId = await requireTenantId();
  const canEdit = hasPermission(session.role, "tasks.write");
  const [projects, deliverables] = await Promise.all([
    listProjectsByTenant(tenantId),
    listDeliverablesByTenant(tenantId),
  ]);

  async function createAction(formData: FormData) {
    "use server";
    const current = await getSessionUser();
    if (!current?.activeTenantId) redirect("/login");
    if (!hasPermission(current.role, "tasks.write")) {
      redirect("/dashboard/deliverables?error=No+tienes+permiso+para+crear+entregables");
    }

    const title = String(formData.get("title") ?? "").trim();
    const projectId = String(formData.get("projectId") ?? "");
    const cell = String(formData.get("cell") ?? "").trim();
    const ownerName = String(formData.get("ownerName") ?? "").trim();
    const dueDateRaw = String(formData.get("dueDate") ?? "");
    const weightRaw = Number(formData.get("weight") ?? 10);
    const notes = String(formData.get("notes") ?? "").trim();

    if (!title || !projectId) {
      redirect("/dashboard/deliverables?error=Proyecto+y+titulo+son+obligatorios");
    }

    await createDeliverable({
      tenantId: current.activeTenantId,
      projectId,
      title,
      cell,
      ownerName,
      dueDate: dueDateRaw ? new Date(`${dueDateRaw}T00:00:00`) : undefined,
      weight: Number.isNaN(weightRaw) ? 10 : Math.max(1, Math.min(100, weightRaw)),
      notes,
    });

    redirect("/dashboard/deliverables?ok=Entregable+creado");
  }

  return (
    <main className="space-y-6">
      <section className="pmo-hero p-6">
        <h1 className="pmo-title">Tracker de entregables</h1>
        <p className="mt-1 text-sm text-slate-200">
          Modulo conectado a proyectos para gestionar celulas, due dates y estado.
        </p>
        {params.error && (
          <p className="mt-3 rounded-md border border-rose-200 bg-rose-50 p-2 text-sm text-rose-700">
            {params.error}
          </p>
        )}
        {params.ok && (
          <p className="mt-3 rounded-md border border-emerald-200 bg-emerald-50 p-2 text-sm text-emerald-700">
            {params.ok}
          </p>
        )}
      </section>

      <section className="pmo-card p-6">
        <h2 className="text-lg font-semibold text-zinc-900">Nuevo entregable</h2>
        {!canEdit ? (
          <p className="mt-3 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            Tu rol es solo lectura para este modulo.
          </p>
        ) : (
          <form action={createAction} className="mt-4 grid gap-3 sm:grid-cols-2">
            <select name="projectId" required className="pmo-select">
              <option value="">Selecciona proyecto</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
            <input
              name="title"
              required
              placeholder="Nombre del entregable"
              className="pmo-input"
            />
            <input
              name="cell"
              placeholder="Celula responsable"
              className="pmo-input"
            />
            <input
              name="ownerName"
              placeholder="Owner del entregable"
              className="pmo-input"
            />
            <input name="dueDate" type="date" className="pmo-input" />
            <input
              name="weight"
              type="number"
              defaultValue={10}
              min={1}
              max={100}
              className="pmo-input"
            />
            <textarea
              name="notes"
              placeholder="Notas"
              className="pmo-textarea min-h-24 sm:col-span-2"
            />
            <button
              type="submit"
              className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 sm:col-span-2"
            >
              Guardar entregable
            </button>
          </form>
        )}
      </section>

      <section className="pmo-card p-6">
        <h2 className="text-lg font-semibold text-zinc-900">Entregables del tenant</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="pmo-table pmo-row-hover w-full min-w-[760px] text-sm">
            <thead>
              <tr className="border-b border-zinc-200 text-left text-zinc-500">
                <th>Proyecto</th>
                <th>Entregable</th>
                <th>Celula</th>
                <th>Owner</th>
                <th>Peso</th>
                <th>Vence</th>
                <th>Estado</th>
                <th>Semaforo</th>
              </tr>
            </thead>
            <tbody>
              {deliverables.map((item) => {
                const semaphore = getSemaphoreBadge(
                  item.status === "delivered" || item.status === "approved"
                    ? 90
                    : item.status === "review"
                      ? 65
                      : 45,
                );
                return (
                  <tr key={item.id}>
                    <td>{item.project.name}</td>
                    <td className="font-medium text-zinc-900">{item.title}</td>
                    <td>{item.cell ?? "-"}</td>
                    <td>{item.ownerName ?? "-"}</td>
                    <td>{item.weight}%</td>
                    <td>
                      {item.dueDate ? new Date(item.dueDate).toLocaleDateString("es-MX") : "-"}
                    </td>
                    <td>
                      {
                        statusOptions.find((status) => status.value === item.status)?.label ??
                        item.status
                      }
                    </td>
                    <td>
                      <span className={semaphore.className}>{semaphore.label}</span>
                    </td>
                  </tr>
                );
              })}
              {deliverables.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-zinc-500">
                    Aun no hay entregables registrados para este tenant.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
