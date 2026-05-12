import Link from "next/link";
import { redirect } from "next/navigation";

import { getSessionUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/rbac";
import { requireTenantId } from "@/lib/tenancy";
import { normalizeDeliverableStatus } from "@/modules/deliverables/constants";
import { parseAcuses, parseActivityLog } from "@/modules/deliverables/json";
import { listDeliverablesByTenant } from "@/modules/deliverables/service";
import { listProjectsByTenant } from "@/modules/projects/service";

import { DeliverablesTracker, type DeliverableTrackerRow } from "./deliverables-tracker";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<{ error?: string; ok?: string }>;
};

function displayEntId(id: string): string {
  return `ENT-${id.replace(/-/g, "").slice(0, 6).toUpperCase()}`;
}

function dueToYmd(d: Date | null): string | null {
  if (!d) return null;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export default async function DeliverablesPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const session = await getSessionUser();
  if (!session) redirect("/login");

  const tenantId = await requireTenantId();
  const canEdit = hasPermission(session.role, "tasks.write");

  const [deliverables, projects] = await Promise.all([
    listDeliverablesByTenant(tenantId),
    listProjectsByTenant(tenantId),
  ]);

  const rows: DeliverableTrackerRow[] = deliverables.map((d) => ({
    id: d.id,
    displayId: displayEntId(d.id),
    title: d.title,
    projectId: d.projectId,
    projectName: d.project.name,
    phase: d.cell,
    ownerName: d.ownerName,
    clientName: d.clientName,
    dueDate: dueToYmd(d.dueDate),
    status: normalizeDeliverableStatus(d.status),
    weight: d.weight,
    description: d.description,
    acceptanceCriteria: d.acceptanceCriteria,
    notes: d.notes,
    acuses: parseAcuses(d.acuses),
    activityLog: parseActivityLog(d.activityLog),
  }));

  const projectOptions = projects.map((p) => ({ id: p.id, name: p.name }));

  return (
    <main className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
        <Link href="/dashboard/pmo" className="font-medium text-zinc-600 underline">
          ← Volver al tablero PMO
        </Link>
      </div>

      {params.error && (
        <p className="rounded-md border border-rose-200 bg-rose-50 p-2 text-sm text-rose-800">
          {params.error}
        </p>
      )}
      {params.ok && (
        <p className="rounded-md border border-emerald-200 bg-emerald-50 p-2 text-sm text-emerald-800">
          {params.ok}
        </p>
      )}

      {projects.length === 0 ? (
        <section className="pmo-card p-6">
          <p className="text-sm text-zinc-700">
            No hay proyectos.{" "}
            <Link href="/dashboard/projects" className="font-medium underline">
              Crea un proyecto
            </Link>{" "}
            para registrar entregables.
          </p>
        </section>
      ) : (
        <DeliverablesTracker rows={rows} projects={projectOptions} canEdit={canEdit} />
      )}

      {!canEdit && projects.length > 0 ? (
        <p className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          Tu rol solo permite ver el tracker; no puedes crear ni editar entregables.
        </p>
      ) : null}
    </main>
  );
}
