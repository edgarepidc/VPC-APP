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

  let deliverables: Awaited<ReturnType<typeof listDeliverablesByTenant>> = [];
  let projects: Awaited<ReturnType<typeof listProjectsByTenant>> = [];
  let loadError: string | null = null;

  try {
    [deliverables, projects] = await Promise.all([
      listDeliverablesByTenant(tenantId),
      listProjectsByTenant(tenantId),
    ]);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[deliverables/page]", msg);
    loadError = msg;
  }

  if (loadError) {
    const looksLikeSchema =
      /column|does not exist|P2022|no such column/i.test(loadError) ||
      /Unknown arg|Unknown field/i.test(loadError);
    return (
      <main className="space-y-4">
        <section className="pmo-card p-6">
          <h1 className="text-lg font-semibold text-zinc-900">No se pudieron cargar los entregables</h1>
          <p className="mt-2 text-sm text-zinc-600">
            La app ya está desplegada, pero la consulta a la base de datos falló. Suele pasar cuando{" "}
            <strong>falta aplicar migraciones Prisma</strong> en la misma base que usa Vercel
            (columnas nuevas del tracker).
          </p>
          {looksLikeSchema ? (
            <ul className="mt-4 list-inside list-disc space-y-2 text-sm text-zinc-700">
              <li>
                En GitHub → <strong>Actions</strong> → workflow <strong>Database migrate</strong>:
                confirma que el último run sea verde (secreto <code className="rounded bg-zinc-100 px-1">DATABASE_URL</code>{" "}
                apuntando a <strong>esta misma</strong> base que Vercel).
              </li>
              <li>
                En Vercel → proyecto → <strong>Settings → Environment Variables</strong>:{" "}
                <code className="rounded bg-zinc-100 px-1">DATABASE_URL</code> debe ser la misma instancia
                donde aplicaste migraciones.
              </li>
              <li>
                Alternativa: en Supabase → <strong>SQL Editor</strong>, ejecuta el SQL de{" "}
                <code className="rounded bg-zinc-100 px-1 text-xs">
                  prisma/migrations/20260513100000_deliverable_tracker_fields/migration.sql
                </code>{" "}
                (y la de tareas si aún no:{" "}
                <code className="rounded bg-zinc-100 px-1 text-xs">
                  20260512120000_task_assignee_fk
                </code>
                ).
              </li>
            </ul>
          ) : null}
          <details className="mt-4 rounded-md border border-zinc-200 bg-zinc-50 p-3">
            <summary className="cursor-pointer text-sm font-medium text-zinc-800">
              Detalle técnico (para soporte / logs)
            </summary>
            <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap break-all text-xs text-zinc-700">
              {loadError}
            </pre>
          </details>
          <p className="mt-4 text-sm">
            <Link href="/dashboard/pmo" className="font-medium text-zinc-700 underline">
              ← Volver al tablero PMO
            </Link>
          </p>
        </section>
      </main>
    );
  }

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
