import Link from "next/link";
import { redirect } from "next/navigation";

import { DashboardSectionShell } from "@/app/dashboard/_components/section-shell";
import {
  dashAlertError,
  dashAlertOk,
  dashAlertWarn,
  dashCard,
  dashPage,
} from "@/lib/ui-classes";
import { PMO_PROJECTS } from "@/lib/dashboard-paths";
import { getSessionUser } from "@/lib/auth/session";
import { canWriteWorkspaceData } from "@/lib/workspace-access";
import { getProjectHierarchyForSession, getSessionProjectIdsFilter } from "@/lib/project-scope";
import {
  initiativeNameFor,
  projectDisplayLabel,
  workScopeProjectIds,
} from "@/lib/project-hierarchy";
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
  const canEdit = canWriteWorkspaceData(session);

  const projectIdsFilter = await getSessionProjectIdsFilter(session, tenantId);

  let deliverables: Awaited<ReturnType<typeof listDeliverablesByTenant>> = [];
  let projects: Awaited<ReturnType<typeof getProjectHierarchyForSession>>["projects"] = [];
  let projectGroups: Awaited<ReturnType<typeof getProjectHierarchyForSession>>["groups"] = [];
  let loadError: string | null = null;

  try {
    const [deliverablesResult, hierarchyResult] = await Promise.all([
      listDeliverablesByTenant(tenantId, { restrictToProjectIds: projectIdsFilter }),
      getProjectHierarchyForSession(session, tenantId),
    ]);
    deliverables = deliverablesResult;
    projects = hierarchyResult.projects;
    projectGroups = hierarchyResult.groups;
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
    projectName: projectDisplayLabel(
      {
        id: d.projectId,
        name: d.project.name,
        parentProjectId: projects.find((p) => p.id === d.projectId)?.parentProjectId ?? null,
      },
      initiativeNameFor(projects, d.projectId),
    ),
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

  const workIds = new Set(workScopeProjectIds(projects));
  const projectOptions = projects
    .filter((p) => workIds.has(p.id))
    .map((p) => ({
      id: p.id,
      name: projectDisplayLabel(p, initiativeNameFor(projects, p.id)),
    }));

  return (
    <main className={dashPage}>
      <DashboardSectionShell
        eyebrow="Entregables"
        title="Tracker de compromisos"
        titleAs="h1"
      >
        {params.error ? (
          <p className={`mx-4 mt-4 ${dashAlertError}`}>{params.error}</p>
        ) : null}
        {params.ok ? <p className={`mx-4 mt-4 ${dashAlertOk}`}>{params.ok}</p> : null}
        {projects.length === 0 ? (
          <div className="p-4">
            <p className="text-sm text-slate-700">
              No hay iniciativas.{" "}
              <Link href={PMO_PROJECTS} className="font-medium underline">
                Crea una iniciativa
              </Link>{" "}
              para registrar entregables.
            </p>
          </div>
        ) : (
          <DeliverablesTracker
            rows={rows}
            projects={projectOptions}
            projectGroups={projectGroups}
            projectHierarchy={projects}
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
          <p className={`mx-4 mb-4 ${dashAlertWarn}`}>Tu rol solo permite ver el tracker.</p>
        ) : null}
      </DashboardSectionShell>
    </main>
  );
}
