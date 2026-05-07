import { redirect } from "next/navigation";

import { getSessionUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/rbac";
import { requireTenantId } from "@/lib/tenancy";
import { getSemaphoreBadge } from "@/lib/ui";
import { listProjectsByTenant } from "@/modules/projects/service";
import {
  createStakeholder,
  listStakeholdersByTenant,
} from "@/modules/stakeholders/service";

type StakeholdersPageProps = {
  searchParams: Promise<{ error?: string; ok?: string }>;
};

function quadrant(influence: number, interest: number) {
  if (influence >= 5 && interest < 5) return "Promotor";
  if (influence >= 5 && interest >= 5) return "Latente";
  if (influence < 5 && interest < 5) return "Defensor";
  return "Espectador";
}

export default async function StakeholdersPage({
  searchParams,
}: StakeholdersPageProps) {
  const params = await searchParams;
  const session = await getSessionUser();
  if (!session) redirect("/login");
  const tenantId = await requireTenantId();
  const canEdit = hasPermission(session.role, "tasks.write");

  const [projects, stakeholders] = await Promise.all([
    listProjectsByTenant(tenantId),
    listStakeholdersByTenant(tenantId),
  ]);

  async function createAction(formData: FormData) {
    "use server";
    const current = await getSessionUser();
    if (!current?.activeTenantId) redirect("/login");
    if (!hasPermission(current.role, "tasks.write")) {
      redirect("/dashboard/stakeholders?error=No+tienes+permiso+para+crear+interesados");
    }

    const projectId = String(formData.get("projectId") ?? "");
    const name = String(formData.get("name") ?? "").trim();
    const role = String(formData.get("role") ?? "").trim();
    const influence = Number(formData.get("influence") ?? 5);
    const interest = Number(formData.get("interest") ?? 5);
    const observation = String(formData.get("observation") ?? "").trim();

    if (!projectId || !name) {
      redirect("/dashboard/stakeholders?error=Proyecto+y+nombre+son+obligatorios");
    }

    await createStakeholder({
      tenantId: current.activeTenantId,
      projectId,
      name,
      role,
      influence: Math.max(0, Math.min(10, influence)),
      interest: Math.max(0, Math.min(10, interest)),
      observation,
    });

    redirect("/dashboard/stakeholders?ok=Interesado+registrado");
  }

  return (
    <main className="space-y-6">
      <section className="pmo-hero p-6">
        <h1 className="pmo-title">
          Stakeholder Matrix
        </h1>
        <p className="mt-1 text-sm text-slate-200">
          Mapa de interesados por proyecto para definir estrategia de gestion.
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
        <h2 className="text-lg font-semibold text-zinc-900">Nuevo interesado</h2>
        {!canEdit ? (
          <p className="mt-3 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            Tu rol es solo lectura para este modulo.
          </p>
        ) : (
          <form action={createAction} className="mt-4 grid gap-3 sm:grid-cols-2">
            <select name="projectId" required className="pmo-select">
              <option value="">Proyecto</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
            <input
              name="name"
              required
              placeholder="Nombre del interesado"
              className="pmo-input"
            />
            <input
              name="role"
              placeholder="Cargo o rol"
              className="pmo-input"
            />
            <input
              name="influence"
              type="number"
              min={0}
              max={10}
              defaultValue={5}
              className="pmo-input"
            />
            <input
              name="interest"
              type="number"
              min={0}
              max={10}
              defaultValue={5}
              className="pmo-input"
            />
            <textarea
              name="observation"
              placeholder="Observacion"
              className="pmo-textarea min-h-24 sm:col-span-2"
            />
            <button
              type="submit"
              className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 sm:col-span-2"
            >
              Guardar interesado
            </button>
          </form>
        )}
      </section>

      <section className="pmo-card p-6">
        <h2 className="text-lg font-semibold text-zinc-900">
          Registro de interesados
        </h2>
        <div className="mt-4 overflow-x-auto">
          <table className="pmo-table pmo-row-hover w-full min-w-[900px] text-sm">
            <thead>
              <tr className="border-b border-zinc-200 text-left text-zinc-500">
                <th>Proyecto</th>
                <th>Nombre</th>
                <th>Rol</th>
                <th>Influencia</th>
                <th>Interes</th>
                <th>Cuadrante</th>
                <th>Semaforo</th>
                <th>Observacion</th>
              </tr>
            </thead>
            <tbody>
              {stakeholders.map((item) => {
                const influenceInterestAvg = ((item.influence + item.interest) / 20) * 100;
                const semaphore = getSemaphoreBadge(influenceInterestAvg);
                return (
                  <tr key={item.id}>
                    <td>{item.project.name}</td>
                    <td className="font-medium text-zinc-900">{item.name}</td>
                    <td>{item.role ?? "-"}</td>
                    <td>{item.influence}</td>
                    <td>{item.interest}</td>
                    <td>{quadrant(item.influence, item.interest)}</td>
                    <td>
                      <span className={semaphore.className}>{semaphore.label}</span>
                    </td>
                    <td>{item.observation ?? "-"}</td>
                  </tr>
                );
              })}
              {stakeholders.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-zinc-500">
                    Aun no hay interesados registrados para este tenant.
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
