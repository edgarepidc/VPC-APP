import { redirect } from "next/navigation";

import { getSessionUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/rbac";
import { quadrantLabelFull } from "@/lib/stakeholder-playbook";
import { getSemaphoreBadge } from "@/lib/ui";
import { requireTenantId } from "@/lib/tenancy";
import { listProjectsByTenant } from "@/modules/projects/service";
import {
  createStakeholder,
  listStakeholdersByTenant,
} from "@/modules/stakeholders/service";

import { StakeholderMatrixClient } from "./stakeholder-matrix-client";

type StakeholdersPageProps = {
  searchParams: Promise<{ error?: string; ok?: string }>;
};

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

  const matrixItems = stakeholders.map((item) => ({
    id: item.id,
    name: item.name,
    role: item.role,
    influence: item.influence,
    interest: item.interest,
    observation: item.observation,
    projectId: item.projectId,
    projectName: item.project.name,
  }));

  return (
    <main className="space-y-6">
      <section className="rounded-xl border border-[#e8e6e1] bg-white px-5 py-4 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-lg font-semibold tracking-tight text-[#1a1916]">
              StakeMap — Matriz de interesados
            </h1>
            <p className="mt-1 text-[13px] text-[#6b6860]">
              Mapa poder × interés y playbook táctico alineado a tu prototipo.
            </p>
          </div>
        </div>
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

      <StakeholderMatrixClient
        stakeholders={matrixItems}
        projectNames={projects.map((p) => ({ id: p.id, name: p.name }))}
      />

      <section className="rounded-xl border border-[#e8e6e1] bg-white p-6 shadow-sm">
        <h2 className="text-[15px] font-semibold text-[#1a1916]">
          Agregar interesado
        </h2>
        <p className="mt-1 text-[13px] text-[#6b6860]">
          Los valores de influencia e interés (0–10) posicionan el punto en la
          matriz.
        </p>
        {!canEdit ? (
          <p className="mt-3 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            Tu rol es solo lectura en este módulo (consultante).
          </p>
        ) : (
          <form action={createAction} className="mt-5 grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="mb-1.5 block text-[11.5px] font-semibold text-[#57534e]">
                Proyecto *
              </label>
              <select
                name="projectId"
                required
                className="w-full rounded-md border border-[#e8e6e1] bg-white px-3 py-2 text-[13px] text-[#1a1916] outline-none transition focus:border-[#2563eb] focus:ring-[3px] focus:ring-[#eff4ff]"
              >
                <option value="">Seleccionar…</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-[11.5px] font-semibold text-[#57534e]">
                Nombre *
              </label>
              <input
                name="name"
                required
                placeholder="Ej. María González"
                className="w-full rounded-md border border-[#e8e6e1] px-3 py-2 text-[13px] outline-none focus:border-[#2563eb] focus:ring-[3px] focus:ring-[#eff4ff]"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-[11.5px] font-semibold text-[#57534e]">
                Cargo / rol
              </label>
              <input
                name="role"
                placeholder="Ej. Directora de TI"
                className="w-full rounded-md border border-[#e8e6e1] px-3 py-2 text-[13px] outline-none focus:border-[#2563eb] focus:ring-[3px] focus:ring-[#eff4ff]"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-[11.5px] font-semibold text-[#57534e]">
                Influencia (0–10)
              </label>
              <input
                name="influence"
                type="number"
                min={0}
                max={10}
                defaultValue={5}
                className="w-full rounded-md border border-[#e8e6e1] px-3 py-2 font-mono text-[13px] outline-none focus:border-[#2563eb] focus:ring-[3px] focus:ring-[#eff4ff]"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-[11.5px] font-semibold text-[#57534e]">
                Interés (0–10)
              </label>
              <input
                name="interest"
                type="number"
                min={0}
                max={10}
                defaultValue={5}
                className="w-full rounded-md border border-[#e8e6e1] px-3 py-2 font-mono text-[13px] outline-none focus:border-[#2563eb] focus:ring-[3px] focus:ring-[#eff4ff]"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1.5 block text-[11.5px] font-semibold text-[#57534e]">
                Observación (opcional)
              </label>
              <textarea
                name="observation"
                placeholder="Contexto relevante sobre este interesado…"
                rows={3}
                className="w-full resize-y rounded-md border border-[#e8e6e1] px-3 py-2 text-[13px] outline-none focus:border-[#2563eb] focus:ring-[3px] focus:ring-[#eff4ff]"
              />
            </div>
            <div className="sm:col-span-2">
              <button
                type="submit"
                className="rounded-md bg-[#1a1916] px-4 py-2.5 text-[13px] font-medium text-white hover:bg-[#2d2c29]"
              >
                Agregar al mapa
              </button>
            </div>
          </form>
        )}
      </section>

      <section className="rounded-xl border border-[#e8e6e1] bg-white p-6 shadow-sm">
        <h2 className="text-[15px] font-semibold text-[#1a1916]">
          Registro detallado
        </h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[900px] border-collapse text-[13px]">
            <thead>
              <tr className="border-b border-[#e8e6e1] text-left">
                <th className="pb-2 font-mono text-[10px] font-medium uppercase tracking-wide text-[#a09d98]">
                  Proyecto
                </th>
                <th className="pb-2 font-mono text-[10px] font-medium uppercase tracking-wide text-[#a09d98]">
                  Nombre
                </th>
                <th className="pb-2 font-mono text-[10px] font-medium uppercase tracking-wide text-[#a09d98]">
                  Rol
                </th>
                <th className="pb-2 font-mono text-[10px] font-medium uppercase tracking-wide text-[#a09d98]">
                  Inf.
                </th>
                <th className="pb-2 font-mono text-[10px] font-medium uppercase tracking-wide text-[#a09d98]">
                  Int.
                </th>
                <th className="pb-2 font-mono text-[10px] font-medium uppercase tracking-wide text-[#a09d98]">
                  Cuadrante
                </th>
                <th className="pb-2 font-mono text-[10px] font-medium uppercase tracking-wide text-[#a09d98]">
                  Semáforo
                </th>
                <th className="pb-2 font-mono text-[10px] font-medium uppercase tracking-wide text-[#a09d98]">
                  Observación
                </th>
              </tr>
            </thead>
            <tbody>
              {stakeholders.map((item) => {
                const influenceInterestAvg =
                  ((item.influence + item.interest) / 20) * 100;
                const semaphore = getSemaphoreBadge(influenceInterestAvg);
                return (
                  <tr
                    key={item.id}
                    className="border-b border-[#f0ede8] transition hover:bg-[#f7f6f3]"
                  >
                    <td className="py-3 pr-2">{item.project.name}</td>
                    <td className="py-3 pr-2 font-medium text-[#1a1916]">
                      {item.name}
                    </td>
                    <td className="py-3 pr-2 text-[#57534e]">
                      {item.role ?? "—"}
                    </td>
                    <td className="py-3 pr-2 font-mono text-[12px]">
                      {item.influence}
                    </td>
                    <td className="py-3 pr-2 font-mono text-[12px]">
                      {item.interest}
                    </td>
                    <td className="py-3 pr-2 text-[#57534e]">
                      {quadrantLabelFull(item.influence, item.interest)}
                    </td>
                    <td className="py-3 pr-2">
                      <span className={semaphore.className}>{semaphore.label}</span>
                    </td>
                    <td className="max-w-xs py-3 text-[#57534e]">
                      {item.observation ?? "—"}
                    </td>
                  </tr>
                );
              })}
              {stakeholders.length === 0 && (
                <tr>
                  <td
                    colSpan={8}
                    className="py-10 text-center font-mono text-[12px] text-[#a09d98]"
                  >
                    Aún no hay interesados. Usa el formulario para agregar el
                    primero.
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
