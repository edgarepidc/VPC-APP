import Link from "next/link";
import { redirect } from "next/navigation";

import { DashboardPageHeader } from "@/app/dashboard/_components/page-header";
import {
  dashAlertError,
  dashAlertOk,
  dashAlertWarn,
  dashCard,
  dashPage,
} from "@/lib/ui-classes";
import { PMO_DELIVERABLES, PMO_PROJECTS } from "@/lib/dashboard-paths";
import { getSessionUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/rbac";
import { getSessionProjectIdsFilter, listProjectsForSession } from "@/lib/project-scope";
import { requireTenantId } from "@/lib/tenancy";
import { normalizeDeliverableStatus } from "@/modules/deliverables/constants";
import { parseAcuses, parseActivityLog, parseSupportFiles } from "@/modules/deliverables/json";
import { listDeliverablesByTenant } from "@/modules/deliverables/service";

import { DeliverablesTracker, type DeliverableTrackerRow } from "./deliverables-tracker";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<{
    error?: string;
    ok?: string;
    id?: string;
    project?: string;
    q?: string;
    st?: string;
    phase?: string;
  }>;
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

function dateToIso(d: Date | null): string | null {
  if (!d) return null;
  return d.toISOString();
}

export default async function DeliverablesPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const session = await getSessionUser();
  if (!session) redirect("/login");

  const tenantId = await requireTenantId();
  const canEdit = hasPermission(session.role, "tasks.write");

  const projectIdsFilter = await getSessionProjectIdsFilter(session, tenantId);

  let deliverables: Awaited<ReturnType<typeof listDeliverablesByTenant>> = [];
  let projects: Awaited<ReturnType<typeof listProjectsForSession>> = [];
  let loadError: string | null = null;

  try {
    [deliverables, projects] = await Promise.all([
      listDeliverablesByTenant(tenantId, { restrictToProjectIds: projectIdsFilter }),
      listProjectsForSession(session, tenantId),
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
      <main className={dashPage}>
        <section className={`${dashCard} p-4`}>
          <h1 className="text-lg font-semibold text-slate-900">
            No se pudieron cargar los entregables
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            La consulta a la base de datos falló. Suele ocurrir cuando faltan migraciones Prisma
            en la misma base que usa Vercel.
          </p>
          {looksLikeSchema ? (
            <ul className="mt-3 list-inside list-disc space-y-1 text-sm text-slate-700">
              <li>Confirma que el workflow Database migrate esté verde en GitHub Actions.</li>
              <li>
                Verifica que <code className="text-xs">DATABASE_URL</code> en Vercel apunte a la
                misma instancia.
              </li>
            </ul>
          ) : (
            <p className="mt-3 font-mono text-xs text-slate-600">{loadError}</p>
          )}
        </section>
      </main>
    );
  }

  const rowsBase: DeliverableTrackerRow[] = deliverables.map((d) => ({
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
    weightManual: d.weightManual,
    supportUrl: d.supportUrl,
    supportFileUrl: d.supportFileUrl,
    supportFileName: d.supportFileName,
    supportFiles: parseSupportFiles(d.supportFiles, {
      url: d.supportFileUrl,
      name: d.supportFileName,
    }),
    deliveredAt: dateToIso(d.deliveredAt),
    createdAt: dateToIso(d.createdAt),
    dependsOnId: d.dependsOnId,
    dependsOnTitle: null,
    description: d.description,
    acceptanceCriteria: d.acceptanceCriteria,
    notes: d.notes,
    acuses: parseAcuses(d.acuses),
    activityLog: parseActivityLog(d.activityLog),
  }));

  const titleById = new Map(rowsBase.map((r) => [r.id, r.title]));
  const rows: DeliverableTrackerRow[] = rowsBase.map((r) => ({
    ...r,
    dependsOnTitle: r.dependsOnId ? titleById.get(r.dependsOnId) ?? null : null,
  }));

  const projectOptions = projects.map((p) => ({ id: p.id, name: p.name }));

  return (
    <main className={dashPage}>
      <DashboardPageHeader
        title="Entregables"
        description="Tracker de compromisos, estados y acuses por proyecto."
      >
        <Link
          href={PMO_DELIVERABLES}
          className="mt-2 inline-block text-sm font-medium text-slate-700 underline"
        >
          Ver resumen PMO de entregables
        </Link>
        {params.error && <p className={`mt-2 ${dashAlertError}`}>{params.error}</p>}
        {params.ok && <p className={`mt-2 ${dashAlertOk}`}>{params.ok}</p>}
      </DashboardPageHeader>

      {projects.length === 0 ? (
        <section className={`${dashCard} p-4`}>
          <p className="text-sm text-slate-700">
            No hay proyectos.{" "}
            <Link href={PMO_PROJECTS} className="font-medium underline">
              Crea un proyecto
            </Link>{" "}
            para registrar entregables.
          </p>
        </section>
      ) : (
        <DeliverablesTracker
          rows={rows}
          projects={projectOptions}
          canEdit={canEdit}
          initial={{
            id: params.id,
            project: params.project,
            q: params.q,
            st: params.st,
            phase: params.phase,
          }}
        />
      )}

      {!canEdit && projects.length > 0 ? (
        <p className={dashAlertWarn}>Tu rol solo permite ver el tracker.</p>
      ) : null}
    </main>
  );
}
