import { redirect } from "next/navigation";

import { getSessionUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/rbac";
import { requireTenantId } from "@/lib/tenancy";
import { getSemaphoreBadge } from "@/lib/ui";
import { listDeliverablesByTenant } from "@/modules/deliverables/service";
import { listProjectsByTenant } from "@/modules/projects/service";
import { createRisk, listRisksByTenant } from "@/modules/risks/service";

type RisksPageProps = {
  searchParams: Promise<{ error?: string; ok?: string }>;
};

function money(value: number) {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function score(probability: number, impact: number) {
  const impactLevel =
    impact <= 10000 ? 1 : impact <= 50000 ? 2 : impact <= 200000 ? 3 : impact <= 1000000 ? 4 : 5;
  const probabilityLevel = Math.max(1, Math.min(5, Math.ceil(probability / 20)));
  return impactLevel * probabilityLevel;
}

export default async function RisksPage({ searchParams }: RisksPageProps) {
  const params = await searchParams;
  const session = await getSessionUser();
  if (!session) redirect("/login");
  const tenantId = await requireTenantId();
  const canEdit = hasPermission(session.role, "tasks.write");

  const [projects, deliverables, risks] = await Promise.all([
    listProjectsByTenant(tenantId),
    listDeliverablesByTenant(tenantId),
    listRisksByTenant(tenantId),
  ]);

  async function createAction(formData: FormData) {
    "use server";
    const current = await getSessionUser();
    if (!current?.activeTenantId) redirect("/login");
    if (!hasPermission(current.role, "tasks.write")) {
      redirect("/dashboard/risks?error=No+tienes+permiso+para+crear+riesgos");
    }

    const title = String(formData.get("title") ?? "").trim();
    const category = String(formData.get("category") ?? "Tecnico").trim();
    const ownerName = String(formData.get("ownerName") ?? "").trim();
    const projectId = String(formData.get("projectId") ?? "");
    const deliverableId = String(formData.get("deliverableId") ?? "");
    const probability = Number(formData.get("probability") ?? 50);
    const residualProb = Number(formData.get("residualProb") ?? 20);
    const impactAmount = Number(formData.get("impactAmount") ?? 50000);
    const mitigation = String(formData.get("mitigation") ?? "").trim();
    const contingency = String(formData.get("contingency") ?? "").trim();
    const trigger = String(formData.get("trigger") ?? "").trim();
    const dueDateRaw = String(formData.get("dueDate") ?? "");

    if (!title || !ownerName || !projectId) {
      redirect("/dashboard/risks?error=Proyecto,+titulo+y+owner+son+obligatorios");
    }

    await createRisk({
      tenantId: current.activeTenantId,
      projectId,
      deliverableId: deliverableId || undefined,
      title,
      category,
      ownerName,
      probability: Math.max(1, Math.min(100, probability)),
      residualProb: Math.max(1, Math.min(100, residualProb)),
      impactAmount: Math.max(0, impactAmount),
      mitigation,
      contingency,
      trigger,
      dueDate: dueDateRaw ? new Date(`${dueDateRaw}T00:00:00`) : undefined,
    });

    redirect("/dashboard/risks?ok=Riesgo+registrado");
  }

  return (
    <main className="space-y-6">
      <section className="pmo-hero p-6">
        <h1 className="pmo-title">Risk Manager</h1>
        <p className="mt-1 text-sm text-slate-200">
          Registro de riesgos conectado a proyecto y entregable para trazabilidad end-to-end.
        </p>
        {params.error && <p className="mt-3 rounded-md border border-rose-200 bg-rose-50 p-2 text-sm text-rose-700">{params.error}</p>}
        {params.ok && <p className="mt-3 rounded-md border border-emerald-200 bg-emerald-50 p-2 text-sm text-emerald-700">{params.ok}</p>}
      </section>

      <section className="pmo-card p-6">
        <h2 className="text-lg font-semibold text-zinc-900">Nuevo riesgo</h2>
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
            <select name="deliverableId" className="pmo-select">
              <option value="">Entregable (opcional)</option>
              {deliverables.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.title}
                </option>
              ))}
            </select>
            <input name="title" required placeholder="Descripcion del riesgo" className="pmo-input sm:col-span-2" />
            <input name="ownerName" required placeholder="Owner del riesgo" className="pmo-input" />
            <input name="category" defaultValue="Tecnico" placeholder="Categoria" className="pmo-input" />
            <input name="probability" type="number" min={1} max={100} defaultValue={50} className="pmo-input" />
            <input name="residualProb" type="number" min={1} max={100} defaultValue={20} className="pmo-input" />
            <input name="impactAmount" type="number" min={0} defaultValue={50000} className="pmo-input" />
            <input name="dueDate" type="date" className="pmo-input" />
            <textarea name="mitigation" placeholder="Accion de mitigacion" className="pmo-textarea min-h-20 sm:col-span-2" />
            <textarea name="trigger" placeholder="Disparador plan B" className="pmo-textarea min-h-20 sm:col-span-2" />
            <textarea name="contingency" placeholder="Plan de contingencia" className="pmo-textarea min-h-20 sm:col-span-2" />
            <button type="submit" className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 sm:col-span-2">
              Registrar riesgo
            </button>
          </form>
        )}
      </section>

      <section className="pmo-card p-6">
        <h2 className="text-lg font-semibold text-zinc-900">Registro de riesgos</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="pmo-table pmo-row-hover w-full min-w-[980px] text-sm">
            <thead>
              <tr className="border-b border-zinc-200 text-left text-zinc-500">
                <th>Proyecto</th>
                <th>Riesgo</th>
                <th>Owner</th>
                <th>Prob.</th>
                <th>Prob. Resid.</th>
                <th>Impacto</th>
                <th>Score</th>
                <th>Semaforo</th>
                <th>VME</th>
                <th>Entregable</th>
              </tr>
            </thead>
            <tbody>
              {risks.map((risk) => {
                const riskScore = score(risk.residualProb, risk.impactAmount);
                const vme = (risk.residualProb / 100) * risk.impactAmount;
                const semaphore = getSemaphoreBadge(100 - (riskScore / 25) * 100);
                return (
                  <tr key={risk.id}>
                    <td>{risk.project.name}</td>
                    <td className="font-medium text-zinc-900">{risk.title}</td>
                    <td>{risk.ownerName}</td>
                    <td>{risk.probability}%</td>
                    <td>{risk.residualProb}%</td>
                    <td>{money(risk.impactAmount)}</td>
                    <td>{riskScore}/25</td>
                    <td>
                      <span className={semaphore.className}>{semaphore.label}</span>
                    </td>
                    <td>{money(vme)}</td>
                    <td>{risk.deliverable?.title ?? "-"}</td>
                  </tr>
                );
              })}
              {risks.length === 0 && (
                <tr>
                  <td colSpan={10} className="py-8 text-center text-zinc-500">
                    Aun no hay riesgos registrados para este tenant.
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
