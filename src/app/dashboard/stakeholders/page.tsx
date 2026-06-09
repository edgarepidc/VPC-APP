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

import {
  dashCard,
  uiButtonPrimary,
  uiInput,
  uiLabel,
} from "@/lib/ui-classes";

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
    <main className="space-y-5">
      <section className="rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-lg font-semibold text-slate-900">
              Stakeholders
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              Matriz de poder e interés por proyecto.
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

      {canEdit ? (
        <details className={`${dashCard} group`}>
          <summary className="cursor-pointer list-none px-4 py-3 text-sm font-semibold text-slate-900 marker:content-none [&::-webkit-details-marker]:hidden">
            Agregar interesado
          </summary>
          <form action={createAction} className="grid gap-3 border-t border-slate-200 px-4 py-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className={uiLabel}>Proyecto</label>
              <select name="projectId" required className={`mt-1 ${uiInput}`}>
                <option value="">Seleccionar…</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={uiLabel}>Nombre</label>
              <input name="name" required placeholder="Ej. María González" className={`mt-1 ${uiInput}`} />
            </div>
            <div>
              <label className={uiLabel}>Cargo / rol</label>
              <input name="role" placeholder="Ej. Directora de TI" className={`mt-1 ${uiInput}`} />
            </div>
            <div>
              <label className={uiLabel}>Influencia (0–10)</label>
              <input name="influence" type="number" min={0} max={10} defaultValue={5} className={`mt-1 ${uiInput}`} />
            </div>
            <div>
              <label className={uiLabel}>Interés (0–10)</label>
              <input name="interest" type="number" min={0} max={10} defaultValue={5} className={`mt-1 ${uiInput}`} />
            </div>
            <div className="sm:col-span-2">
              <label className={uiLabel}>Observación (opcional)</label>
              <textarea name="observation" rows={3} className={`mt-1 ${uiInput}`} />
            </div>
            <div className="sm:col-span-2">
              <button type="submit" className={uiButtonPrimary.replace("w-full ", "w-auto ")}>
                Agregar al mapa
              </button>
            </div>
          </form>
        </details>
      ) : (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          Tu rol es solo lectura en este módulo.
        </p>
      )}

      <section className={`${dashCard} p-4`}>
        <h2 className="text-base font-semibold text-slate-900">Registro</h2>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left">
                <th className="pb-2 text-xs font-medium uppercase text-slate-500">
                  Proyecto
                </th>
                <th className="pb-2 text-xs font-medium uppercase text-slate-500">
                  Nombre
                </th>
                <th className="pb-2 text-xs font-medium uppercase text-slate-500">
                  Rol
                </th>
                <th className="pb-2 text-xs font-medium uppercase text-slate-500">
                  Inf.
                </th>
                <th className="pb-2 text-xs font-medium uppercase text-slate-500">
                  Int.
                </th>
                <th className="pb-2 text-xs font-medium uppercase text-slate-500">
                  Cuadrante
                </th>
                <th className="pb-2 text-xs font-medium uppercase text-slate-500">
                  Semáforo
                </th>
                <th className="pb-2 text-xs font-medium uppercase text-slate-500">
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
                    <td className="py-3 pr-2 font-medium text-slate-900">
                      {item.name}
                    </td>
                    <td className="py-3 pr-2 text-slate-600">
                      {item.role ?? "—"}
                    </td>
                    <td className="py-3 pr-2 font-mono text-[12px]">
                      {item.influence}
                    </td>
                    <td className="py-3 pr-2 font-mono text-[12px]">
                      {item.interest}
                    </td>
                    <td className="py-3 pr-2 text-slate-600">
                      {quadrantLabelFull(item.influence, item.interest)}
                    </td>
                    <td className="py-3 pr-2">
                      <span className={semaphore.className}>{semaphore.label}</span>
                    </td>
                    <td className="max-w-xs py-3 text-slate-600">
                      {item.observation ?? "—"}
                    </td>
                  </tr>
                );
              })}
              {stakeholders.length === 0 && (
                <tr>
                  <td
                    colSpan={8}
                    className="py-10 text-center font-mono text-[12px] text-slate-400"
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
