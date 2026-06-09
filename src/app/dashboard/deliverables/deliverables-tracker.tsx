"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";

import {
  DELIVERABLE_STATUSES,
  DELIVERABLE_STATUS_LABEL,
  isDeliverableDoneStatus,
  normalizeDeliverableStatus,
  type DeliverableStatus,
} from "@/modules/deliverables/constants";
import type { DeliverableAcuse, DeliverableLogEntry, DeliverableSupportFile } from "@/modules/deliverables/json";
import {
  clampWeight,
  computeProjectProgress,
  TARGET_SUM,
} from "@/lib/deliverable-weight-utils";
import { uiInput, uiLabel, dashAlertError, dashAlertOk } from "@/lib/ui-classes";

import { CreateDeliverableModal } from "./create-deliverable-modal";
import {
  buildConsolidatedActionItems,
  computeScopeCompliance,
  formatDeliveredAt,
  isDeliverableBlocked,
  projectWeightAssigned,
} from "./deliverable-utils";
import { approveNeedsAcuseConfirm, statusBlockReason } from "./deliverable-status-rules";
import { DeliverableSupportFields } from "./deliverable-support-fields";
import { DeliverableTemplateModal } from "./deliverable-template-modal";
import { DeliverableWeightField } from "./deliverable-weight-field";
import { DeliverablesActionQueue } from "./deliverables-action-queue";
import { DeliverablesTimeline } from "./deliverables-timeline";
import {
  addDeliverableAcuseAction,
  deleteDeliverableAction,
  removeDeliverableAcuseAction,
  setDeliverableStatusAction,
  toggleDeliverableAcuseAction,
  updateDeliverableDetailAction,
} from "./actions";

const ACCENT = "#1e293b";
const ACCENT_D = "#0f172a";
const ACCENT_L = "#f1f5f9";

export type DeliverableTrackerProject = { id: string; name: string };

export type DeliverableTrackerRow = {
  id: string;
  displayId: string;
  title: string;
  projectId: string;
  projectName: string;
  phase: string | null;
  ownerName: string | null;
  clientName: string | null;
  dueDate: string | null;
  status: string;
  weight: number;
  weightManual: boolean;
  supportUrl: string | null;
  supportFileUrl: string | null;
  supportFileName: string | null;
  supportFiles: DeliverableSupportFile[];
  deliveredAt: string | null;
  createdAt: string | null;
  dependsOnId: string | null;
  dependsOnTitle: string | null;
  description: string | null;
  acceptanceCriteria: string | null;
  notes: string | null;
  acuses: DeliverableAcuse[];
  activityLog: DeliverableLogEntry[];
};

type TrackerInitial = {
  id?: string;
  project?: string;
  q?: string;
  st?: string;
  phase?: string;
};

type Props = {
  rows: DeliverableTrackerRow[];
  projects: DeliverableTrackerProject[];
  canEdit: boolean;
  initial?: TrackerInitial;
};

const pillClass: Record<DeliverableStatus, string> = {
  pending: "bg-[#F1EFE8] text-slate-700",
  review: "bg-[#E6F1FB] text-[#0C447C]",
  approved: "bg-[#EAF3DE] text-[#27500A]",
  rejected: "bg-[#FCEBEB] text-[#791F1F]",
  delivered: "bg-slate-100 text-slate-800",
};

const statusBtnActive: Record<DeliverableStatus, string> = {
  pending: "bg-[#F1EFE8] text-slate-700 border-[#B4B2A9]",
  review: "bg-[#E6F1FB] text-[#0C447C] border-[#85B7EB]",
  approved: "bg-[#EAF3DE] text-[#27500A] border-[#97C459]",
  rejected: "bg-[#FCEBEB] text-[#791F1F] border-[#F09595]",
  delivered: "bg-slate-100 text-slate-800 border-slate-300",
};

function todayStart(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function parseYmd(s: string | null): Date | null {
  if (!s?.trim()) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  if (!m) return null;
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

function daysFromDue(due: string | null, status: string): number | null {
  if (isDeliverableDoneStatus(status)) return null;
  const d = parseYmd(due);
  if (!d) return null;
  return Math.round((d.getTime() - todayStart().getTime()) / 86400000);
}

function formatCommitment(due: string | null): string {
  if (!due) return "—";
  const d = parseYmd(due);
  if (!d || Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function toDateInput(due: string | null): string {
  if (!due) return "";
  const m = /^(\d{4}-\d{2}-\d{2})/.exec(due);
  return m ? m[1] : "";
}

function formatLogAt(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("es-MX", { day: "2-digit", month: "short" });
}

function dayChip(due: string | null, status: string) {
  const df = daysFromDue(due, status);
  if (df === null) return null;
  if (df < 0)
    return (
      <span className="ml-1 inline-block rounded-full bg-[#FCEBEB] px-1.5 py-0.5 text-xs font-medium text-[#791F1F]">
        {Math.abs(df)}d vencido
      </span>
    );
  if (df === 0)
    return (
      <span className="ml-1 inline-block rounded-full bg-[#FAEEDA] px-1.5 py-0.5 text-xs font-medium text-[#633806]">
        hoy
      </span>
    );
  if (df <= 5)
    return (
      <span className="ml-1 inline-block rounded-full bg-[#FAEEDA] px-1.5 py-0.5 text-xs font-medium text-[#633806]">
        {df}d
      </span>
    );
  return (
    <span className="ml-1 inline-block rounded-full bg-[#EAF3DE] px-1.5 py-0.5 text-xs font-medium text-[#27500A]">
      {df}d
    </span>
  );
}

function acuseMini(acuses: DeliverableAcuse[]) {
  if (acuses.length === 0)
    return <span className="text-xs text-slate-400">Sin acuses</span>;
  const ok = acuses.filter((a) => a.ok).length;
  const tot = acuses.length;
  const c = ok === tot ? "#27500A" : ok > 0 ? "#633806" : "#791F1F";
  return (
    <span className="text-xs">
      <span className="font-semibold" style={{ color: c }}>
        {ok}/{tot}
      </span>
      <span className="text-slate-400"> confirmados</span>
    </span>
  );
}

function calcPortfolioProgress(rows: DeliverableTrackerRow[]) {
  const byProject = new Map<string, DeliverableTrackerRow[]>();
  for (const row of rows) {
    const list = byProject.get(row.projectId) ?? [];
    list.push(row);
    byProject.set(row.projectId, list);
  }

  if (byProject.size === 0) {
    return { pct: 0, pctInProg: 0, doneWeight: 0, totalWeight: 0, projectCount: 0 };
  }

  let pctSum = 0;
  let inProgSum = 0;
  let doneSum = 0;
  for (const [, projectRows] of byProject) {
    const stats = computeProjectProgress(projectRows);
    pctSum += stats.pct;
    inProgSum += stats.pctInProg;
    doneSum += stats.doneWeight;
  }

  const projectCount = byProject.size;
  return {
    pct: Math.round(pctSum / projectCount),
    pctInProg: Math.round(inProgSum / projectCount),
    doneWeight: doneSum,
    totalWeight: projectCount * TARGET_SUM,
    projectCount,
  };
}

function progressBarColor(pct: number): string {
  if (pct === 100) return "#1e293b";
  if (pct >= 70) return "#639922";
  if (pct >= 40) return "#BA7517";
  return "#E24B4A";
}

export function DeliverablesTracker({ rows, projects, canEdit, initial }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const rowRefs = useRef<Map<string, HTMLTableRowElement>>(new Map());
  const [pending, startTransition] = useTransition();
  const [flash, setFlash] = useState<{ type: "ok" | "error"; message: string } | null>(null);
  const [q, setQ] = useState(initial?.q ?? "");
  const [st, setSt] = useState(initial?.st ?? "");
  const [phase, setPhase] = useState(initial?.phase ?? "");
  const [projectFilter, setProjectFilter] = useState(initial?.project ?? "");
  const [sort, setSort] = useState<"fecha" | "peso" | "estado" | "fase">("fecha");
  const [panel, setPanel] = useState<"closed" | "detail" | "create" | "template">("closed");
  const [selectedId, setSelectedId] = useState<string | null>(initial?.id ?? null);
  const [focusId, setFocusId] = useState<string | null>(initial?.id ?? null);

  const scopeRows = useMemo(
    () => (projectFilter ? rows.filter((r) => r.projectId === projectFilter) : rows),
    [rows, projectFilter],
  );

  const rowById = useMemo(() => new Map(rows.map((r) => [r.id, r])), [rows]);

  const actionItems = useMemo(
    () => buildConsolidatedActionItems(scopeRows, rowById),
    [scopeRows, rowById],
  );

  const compliance = useMemo(() => computeScopeCompliance(scopeRows), [scopeRows]);

  function syncUrl(patch: Record<string, string | null>) {
    const p = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(patch)) {
      if (value) p.set(key, value);
      else p.delete(key);
    }
    const qs = p.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  const phases = useMemo(() => {
    const set = new Set<string>();
    for (const r of scopeRows) {
      if (r.phase?.trim()) set.add(r.phase.trim());
    }
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [scopeRows]);

  const filtered = useMemo(() => {
    const ql = q.trim().toLowerCase();
    let list = scopeRows.filter((d) => {
      const hay =
        !ql ||
        d.title.toLowerCase().includes(ql) ||
        (d.ownerName ?? "").toLowerCase().includes(ql) ||
        (d.phase ?? "").toLowerCase().includes(ql) ||
        (d.clientName ?? "").toLowerCase().includes(ql) ||
        d.projectName.toLowerCase().includes(ql);
      const stOk = !st || normalizeDeliverableStatus(d.status) === st;
      const phOk = !phase || (d.phase ?? "") === phase;
      return hay && stOk && phOk;
    });
    list = [...list].sort((a, b) => {
      if (sort === "fecha") {
        const da = parseYmd(a.dueDate)?.getTime() ?? 0;
        const db = parseYmd(b.dueDate)?.getTime() ?? 0;
        return da - db;
      }
      if (sort === "peso") return (b.weight || 1) - (a.weight || 1);
      if (sort === "estado")
        return (
          DELIVERABLE_STATUSES.indexOf(normalizeDeliverableStatus(a.status)) -
          DELIVERABLE_STATUSES.indexOf(normalizeDeliverableStatus(b.status))
        );
      return (a.phase ?? "").localeCompare(b.phase ?? "");
    });
    return list;
  }, [scopeRows, q, st, phase, sort]);

  const { pct, pctInProg, doneWeight, totalWeight, projectCount } = useMemo(
    () => calcPortfolioProgress(scopeRows),
    [scopeRows],
  );
  const remPct = Math.max(0, 100 - pct - pctInProg);
  const barC = progressBarColor(pct);

  const total = scopeRows.length;
  const comp = scopeRows.filter((d) => isDeliverableDoneStatus(d.status)).length;
  const pend = scopeRows.filter((d) => {
    const s = normalizeDeliverableStatus(d.status);
    return s === "pending" || s === "review";
  }).length;
  const venc = scopeRows.filter((d) => {
    const df = daysFromDue(d.dueDate, d.status);
    return df !== null && df < 0;
  }).length;
  const acPend = scopeRows.reduce((a, d) => a + d.acuses.filter((ac) => !ac.ok).length, 0);

  const weightAssigned = projectFilter ? projectWeightAssigned(scopeRows, projectFilter) : null;

  const selected = selectedId ? rows.find((r) => r.id === selectedId) : undefined;

  function run(fn: () => Promise<string | void>, okMessage = "Cambios guardados.") {
    startTransition(async () => {
      try {
        const custom = await fn();
        router.refresh();
        setFlash({
          type: "ok",
          message: typeof custom === "string" ? custom : okMessage,
        });
      } catch (e) {
        setFlash({
          type: "error",
          message: e instanceof Error ? e.message : "Error al guardar.",
        });
      }
    });
  }

  useEffect(() => {
    if (initial?.id && rows.some((r) => r.id === initial.id)) {
      setPanel("detail");
      setSelectedId(initial.id);
      setFocusId(initial.id);
    }
  }, [initial?.id, rows]);

  useEffect(() => {
    syncUrl({
      project: projectFilter || null,
      q: q.trim() || null,
      st: st || null,
      phase: phase || null,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- sync filters only
  }, [projectFilter, q, st, phase]);

  function focusDeliverable(id: string, openPanel = false) {
    setFocusId(id);
    if (openPanel) {
      setSelectedId(id);
      setPanel("detail");
    }
    requestAnimationFrame(() => {
      rowRefs.current.get(id)?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    });
  }

  function closeDetail() {
    setPanel("closed");
    setSelectedId(null);
    setFocusId(null);
    syncUrl({ id: null });
  }

  function openDetail(id: string) {
    if (selectedId === id && panel === "detail") {
      closeDetail();
      return;
    }
    focusDeliverable(id, true);
    syncUrl({ id });
  }

  useEffect(() => {
    if (focusId) {
      rowRefs.current.get(focusId)?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [focusId]);

  function exportCsv() {
    const hdr = [
      "ID",
      "Nombre",
      "Proyecto",
      "Fase",
      "Responsable",
      "Cliente",
      "Fecha compromiso",
      "Fecha entrega",
      "Estado",
      "Peso %",
      "Depende de",
      "Enlace soporte",
      "PDFs",
      "Acuses OK",
      "Total acuses",
      "Criterios",
      "Notas",
    ];
    const lines = [hdr.join(",")];
    for (const d of filtered) {
      const ok = d.acuses.filter((a) => a.ok).length;
      const pdfs = d.supportFiles.map((f) => f.name).join("; ");
      lines.push(
        [
          d.displayId,
          `"${d.title.replace(/"/g, "'")}"`,
          `"${d.projectName.replace(/"/g, "'")}"`,
          d.phase ?? "",
          d.ownerName ?? "",
          d.clientName ?? "",
          toDateInput(d.dueDate),
          formatDeliveredAt(d.deliveredAt) ?? "",
          DELIVERABLE_STATUS_LABEL[normalizeDeliverableStatus(d.status)],
          `${d.weight}%`,
          `"${(d.dependsOnTitle ?? "").replace(/"/g, "'")}"`,
          d.supportUrl ?? "",
          `"${pdfs.replace(/"/g, "'")}"`,
          ok,
          d.acuses.length,
          `"${(d.acceptanceCriteria ?? "").replace(/"/g, "'")}"`,
          `"${(d.notes ?? "").replace(/"/g, "'")}"`,
        ].join(","),
      );
    }
    const blob = new Blob(["\uFEFF" + lines.join("\n")], {
      type: "text/csv;charset=utf-8",
    });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "tracker-entregables.csv";
    a.click();
    URL.revokeObjectURL(a.href);
  }

  return (
    <div
      className="flex min-h-0 flex-col rounded-lg border border-slate-200 bg-white text-slate-900"
      style={
        {
          ["--accent" as string]: ACCENT,
          ["--accent-d" as string]: ACCENT_D,
          ["--accent-l" as string]: ACCENT_L,
        } as React.CSSProperties
      }
    >
      <div className="flex flex-1 flex-col overflow-hidden lg:flex-row">
        <div className="min-w-0 flex-1 space-y-4 overflow-y-auto p-4 pb-10">
          {flash ? (
            <div
              className={`flex items-start justify-between gap-2 rounded-lg px-3 py-2 text-sm ${
                flash.type === "ok" ? dashAlertOk : dashAlertError
              }`}
            >
              <span>{flash.message}</span>
              <button
                type="button"
                onClick={() => setFlash(null)}
                className="shrink-0 text-xs opacity-70 hover:opacity-100"
              >
                ✕
              </button>
            </div>
          ) : null}
          <div className="grid grid-cols-[repeat(auto-fit,minmax(110px,1fr))] gap-2">
            <div className="rounded-lg border border-slate-200 bg-white px-3.5 py-2.5">
              <div className="mb-0.5 text-xs text-slate-500">Total entregables</div>
              <div className="text-lg font-semibold tabular-nums leading-none">{total}</div>
              <div className="mt-0.5 text-xs text-slate-400">registrados</div>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white px-3.5 py-2.5">
              <div className="mb-0.5 text-xs text-slate-500">Completados</div>
              <div className="text-lg font-semibold tabular-nums leading-none text-[#27500A]">{comp}</div>
              <div className="mt-0.5 text-xs text-slate-400">aprobados / entregados</div>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white px-3.5 py-2.5">
              <div className="mb-0.5 text-xs text-slate-500">En proceso</div>
              <div className="text-lg font-semibold tabular-nums leading-none">{pend}</div>
              <div className="mt-0.5 text-xs text-slate-400">pendiente o revisión</div>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white px-3.5 py-2.5">
              <div className="mb-0.5 text-xs text-slate-500">Vencidos</div>
              <div
                className="text-lg font-semibold tabular-nums leading-none"
                style={{ color: venc > 0 ? "#791F1F" : undefined }}
              >
                {venc}
              </div>
              <div className="mt-0.5 text-xs text-slate-400">fuera de fecha</div>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white px-3.5 py-2.5">
              <div className="mb-0.5 text-xs text-slate-500">Acuses pendientes</div>
              <div
                className="text-lg font-semibold tabular-nums leading-none"
                style={{ color: acPend > 0 ? "#633806" : undefined }}
              >
                {acPend}
              </div>
              <div className="mt-0.5 text-xs text-slate-400">sin confirmar</div>
            </div>
            <div
              className="rounded-lg border-2 px-3.5 py-2.5"
              style={{ borderColor: ACCENT_L, background: "white" }}
            >
              <div className="mb-0.5 text-xs text-slate-500">Avance ponderado</div>
              <div className="text-lg font-semibold tabular-nums leading-none" style={{ color: ACCENT }}>
                {pct}%
              </div>
              <div className="mt-0.5 text-xs text-slate-400">
                {projectCount} proyecto{projectCount !== 1 ? "s" : ""} · media ponderada
              </div>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white px-3.5 py-2.5">
              <div className="mb-0.5 text-xs text-slate-500">A tiempo</div>
              <div className="text-lg font-semibold tabular-nums leading-none text-[#27500A]">
                {compliance.onTimePct !== null ? `${compliance.onTimePct}%` : "—"}
              </div>
              <div className="mt-0.5 text-xs text-slate-400">
                {compliance.closedCount > 0
                  ? `${compliance.closedCount} cerrados con fecha`
                  : "sin cierres medibles"}
              </div>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white px-3.5 py-2.5">
              <div className="mb-0.5 text-xs text-slate-500">Lead time medio</div>
              <div className="text-lg font-semibold tabular-nums leading-none">
                {compliance.avgLeadDays !== null ? `${compliance.avgLeadDays}d` : "—"}
              </div>
              <div className="mt-0.5 text-xs text-slate-400">registro → entrega</div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <label className="text-xs font-medium text-slate-600">Proyecto</label>
            <select
              value={projectFilter}
              onChange={(e) => {
                setProjectFilter(e.target.value);
                setFocusId(null);
              }}
              className="h-[34px] rounded-lg border border-black/[0.17] bg-white px-2.5 text-sm outline-none focus:border-[var(--accent)]"
            >
              <option value="">Todos los proyectos</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            {weightAssigned !== null ? (
              <span
                className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                  weightAssigned === TARGET_SUM
                    ? "bg-emerald-50 text-emerald-800"
                    : "bg-amber-50 text-amber-900"
                }`}
              >
                Peso asignado: {weightAssigned}/{TARGET_SUM}%
              </span>
            ) : null}
          </div>

          <DeliverablesActionQueue
            items={actionItems}
            activeId={focusId}
            onSelect={(id) => focusDeliverable(id, true)}
          />

          <div className="min-w-0 overflow-x-auto overflow-y-visible">
            <DeliverablesTimeline
              rows={filtered}
              focusId={focusId}
              onFocusChange={setFocusId}
              onSelect={(id) => openDetail(id)}
              showDependencies={!!projectFilter}
            />
          </div>

          <div className="rounded-lg border border-slate-200 bg-white px-[18px] py-3.5">
            <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
              <div>
                <div className="text-xs font-semibold">Avance ponderado por esfuerzo</div>
                <div className="mt-0.5 text-xs text-slate-500">
                  Cada proyecto reparte <strong className="text-slate-900">100%</strong> entre sus
                  entregables según complejidad.
                </div>
              </div>
              <div className="text-right">
                <div className="text-lg font-semibold tabular-nums leading-none" style={{ color: barC }}>
                  {pct}%
                </div>
                <div className="text-xs text-slate-500">
                  Media de avance por proyecto ({doneWeight}% completado en total)
                </div>
              </div>
            </div>
            <div className="mb-2.5 h-3 overflow-hidden rounded-md bg-[#f7f5f1]">
              <div className="flex h-full overflow-hidden rounded-md">
                <div
                  className="h-full transition-[width] duration-500"
                  style={{ width: `${pct}%`, background: barC }}
                />
                <div
                  className="h-full transition-[width] duration-500"
                  style={{ width: `${pctInProg}%`, background: "#B5D4F4" }}
                />
                <div
                  className="h-full bg-[#f7f5f1]"
                  style={{ width: `${remPct}%` }}
                />
              </div>
            </div>
            <div className="flex flex-wrap gap-3.5 text-xs text-slate-500">
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 shrink-0 rounded-sm" style={{ background: barC }} />
                Completado ({pct}%)
              </div>
              {pctInProg > 0 ? (
                <div className="flex items-center gap-1.5">
                  <span className="h-2 w-2 shrink-0 rounded-sm bg-[#85B7EB]" />
                  En revisión ({pctInProg}%)
                </div>
              ) : null}
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 shrink-0 rounded-sm bg-[#D3D1C7]" />
                Pendiente ({remPct}%)
              </div>
              <span className="ml-auto text-xs text-slate-400">
                {totalWeight > 0 ? `${totalWeight}% asignado en cartera` : "Sin entregables"}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <input
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar entregable…"
              className="h-9 w-[200px] max-w-full rounded-lg border border-slate-300 bg-white px-2.5 text-sm text-slate-900 outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-100"
            />
            <select
              value={st}
              onChange={(e) => setSt(e.target.value)}
              className="h-[34px] rounded-lg border border-black/[0.17] bg-white px-2.5 text-sm outline-none focus:border-[var(--accent)]"
            >
              <option value="">Todos los estados</option>
              {DELIVERABLE_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {DELIVERABLE_STATUS_LABEL[s]}
                </option>
              ))}
            </select>
            <select
              value={phase}
              onChange={(e) => setPhase(e.target.value)}
              className="h-[34px] rounded-lg border border-black/[0.17] bg-white px-2.5 text-sm outline-none focus:border-[var(--accent)]"
            >
              <option value="">Todas las fases</option>
              {phases.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as typeof sort)}
              className="h-[34px] rounded-lg border border-black/[0.17] bg-white px-2.5 text-sm outline-none focus:border-[var(--accent)]"
            >
              <option value="fecha">Fecha compromiso</option>
              <option value="peso">Mayor % de avance</option>
              <option value="estado">Estado</option>
              <option value="fase">Fase</option>
            </select>
            <div className="hidden flex-1 sm:block" />
            {canEdit ? (
              <button
                type="button"
                onClick={() => {
                  setPanel("template");
                  setSelectedId(null);
                }}
                className="h-[34px] whitespace-nowrap rounded-lg border border-slate-300 bg-white px-3.5 text-xs font-medium hover:bg-slate-50"
              >
                Plantilla
              </button>
            ) : null}
            {canEdit ? (
              <button
                type="button"
                onClick={() => {
                  setPanel("create");
                  setSelectedId(null);
                }}
                className="h-[34px] whitespace-nowrap rounded-lg border border-[var(--accent)] bg-[var(--accent)] px-3.5 text-xs font-medium text-white hover:bg-[var(--accent-d)]"
              >
                + Nuevo entregable
              </button>
            ) : null}
            <button
              type="button"
              onClick={exportCsv}
              className="h-[34px] whitespace-nowrap rounded-lg border border-black/[0.17] bg-white px-3.5 text-xs font-medium hover:bg-[#f7f5f1]"
            >
              CSV
            </button>
          </div>

          <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-[#f7f5f1] text-left text-xs font-medium text-slate-500">
                    <th className="w-[72px] whitespace-nowrap px-3 py-2">ID</th>
                    <th className="w-[120px] whitespace-nowrap px-3 py-2">Proyecto</th>
                    <th className="px-3 py-2">Entregable</th>
                    <th className="w-[84px] whitespace-nowrap px-3 py-2">Fase</th>
                    <th className="w-[108px] whitespace-nowrap px-3 py-2">Responsable</th>
                    <th className="w-[140px] whitespace-nowrap px-3 py-2">Fecha compromiso</th>
                    <th className="w-[100px] whitespace-nowrap px-3 py-2">Estado</th>
                    <th className="w-[110px] whitespace-nowrap px-3 py-2" title="% del avance del proyecto">
                      % avance
                    </th>
                    <th className="w-[108px] whitespace-nowrap px-3 py-2">Acuse cliente</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((d) => {
                    const stKey = normalizeDeliverableStatus(d.status);
                    const isFocused = focusId === d.id || (selectedId === d.id && panel === "detail");
                    const blocked = isDeliverableBlocked(d, rowById);
                    return (
                      <tr
                        key={d.id}
                        ref={(el) => {
                          if (el) rowRefs.current.set(d.id, el);
                          else rowRefs.current.delete(d.id);
                        }}
                        onClick={() => openDetail(d.id)}
                        onMouseEnter={() => setFocusId(d.id)}
                        className={`cursor-pointer border-b border-slate-200 last:border-b-0 hover:bg-[#f7f5f1] ${
                          isFocused ? "bg-slate-100 ring-1 ring-inset ring-slate-400 hover:bg-slate-100" : ""
                        } ${pending ? "opacity-60" : ""}`}
                      >
                        <td className="px-3 py-2.5 font-mono text-xs text-slate-400">
                          {d.displayId}
                        </td>
                        <td className="px-3 py-2.5 text-xs text-slate-500">{d.projectName}</td>
                        <td className="px-3 py-2.5 text-sm font-medium leading-snug">
                          <span className="inline-flex items-center gap-1">
                            {blocked ? (
                              <span className="text-xs" title="Bloqueado por dependencia">
                                🔒
                              </span>
                            ) : null}
                            {d.title}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-xs text-slate-500">{d.phase || "—"}</td>
                        <td className="px-3 py-2.5 text-xs text-slate-500">
                          {d.ownerName || "—"}
                        </td>
                        <td className="px-3 py-2.5 text-xs">
                          <div>{formatCommitment(d.dueDate)}</div>
                          {d.deliveredAt ? (
                            <div className="mt-0.5 text-[10px] text-emerald-700">
                              Entregado: {formatDeliveredAt(d.deliveredAt) ?? "—"}
                            </div>
                          ) : null}
                          {dayChip(d.dueDate, d.status)}
                        </td>
                        <td className="px-3 py-2.5">
                          <span
                            className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${pillClass[stKey]}`}
                          >
                            {DELIVERABLE_STATUS_LABEL[stKey]}
                          </span>
                        </td>
                        <td className="px-3 py-2.5">
                          <div className="flex items-center gap-1.5">
                            <div className="inline-block h-[5px] w-[60px] overflow-hidden rounded-sm bg-[#f7f5f1]">
                              <div
                                className="h-full rounded-sm bg-[#AFA9EC]"
                                style={{ width: `${clampWeight(d.weight)}%` }}
                              />
                            </div>
                            <span className="text-xs font-medium text-slate-700">
                              {clampWeight(d.weight)}%
                              {d.weightManual ? (
                                <span className="ml-0.5 text-slate-400" title="Ajustado manualmente">
                                  ●
                                </span>
                              ) : null}
                            </span>
                          </div>
                        </td>
                        <td className="px-3 py-2.5">{acuseMini(d.acuses)}</td>
                      </tr>
                    );
                  })}
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-3 py-8 text-center text-sm text-slate-400">
                        No hay entregables que coincidan
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <aside
          className={`hidden shrink-0 overflow-y-auto border-slate-200 bg-white transition-[width] duration-200 ease-out lg:block lg:border-l ${
            panel === "detail" ? "w-0 min-w-0 overflow-hidden lg:w-[430px] lg:min-w-[430px]" : "w-0 min-w-0 overflow-hidden lg:w-0"
          }`}
        >
          {panel === "detail" && selected ? (
            <DetailPanel
              row={selected}
              allRows={rows}
              rowById={rowById}
              projects={projects}
              phaseOptions={phases}
              canEdit={canEdit}
              onClose={closeDetail}
              run={run}
            />
          ) : null}
        </aside>
      </div>

      {panel === "detail" && selected ? (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button
            type="button"
            className="dash-drawer-backdrop absolute inset-0 bg-black/40"
            aria-label="Cerrar detalle"
            onClick={closeDetail}
          />
          <div className="dash-bottom-sheet absolute bottom-0 left-0 right-0 max-h-[min(88dvh,720px)] overflow-y-auto rounded-t-2xl border border-slate-200 bg-white shadow-2xl">
            <DetailPanel
              row={selected}
              allRows={rows}
              rowById={rowById}
              projects={projects}
              phaseOptions={phases}
              canEdit={canEdit}
              onClose={closeDetail}
              run={run}
            />
          </div>
        </div>
      ) : null}

      {panel === "create" && canEdit ? (
        <CreateDeliverableModal
          allRows={rows}
          projects={projects}
          phaseOptions={phases}
          defaultProjectId={projectFilter || undefined}
          onClose={() => setPanel("closed")}
          run={run}
        />
      ) : null}
      {panel === "template" && canEdit ? (
        <DeliverableTemplateModal
          projects={projects}
          defaultProjectId={projectFilter || undefined}
          onClose={() => setPanel("closed")}
          run={run}
        />
      ) : null}
    </div>
  );
}

function DetailPanel({
  row,
  allRows,
  rowById,
  projects,
  phaseOptions,
  canEdit,
  onClose,
  run,
}: {
  row: DeliverableTrackerRow;
  allRows: DeliverableTrackerRow[];
  rowById: Map<string, DeliverableTrackerRow>;
  projects: DeliverableTrackerProject[];
  phaseOptions: string[];
  canEdit: boolean;
  onClose: () => void;
  run: (fn: () => Promise<string | void>, okMessage?: string) => void;
}) {
  const stKey = normalizeDeliverableStatus(row.status);
  const projectRows = allRows.filter((r) => r.projectId === row.projectId);
  const [acName, setAcName] = useState("");
  const [acRole, setAcRole] = useState("");

  function changeStatus(target: DeliverableStatus) {
    if (stKey === target) return;
    const block = statusBlockReason(row, target, rowById);
    if (block) {
      run(async () => {
        throw new Error(block);
      });
      return;
    }
    if (target === "rejected") {
      const reason = window.prompt("Motivo del rechazo (obligatorio):");
      if (!reason?.trim()) return;
      run(async () => {
        await setDeliverableStatusAction(row.id, target, reason.trim());
      }, "Estado actualizado.");
      return;
    }
    if (target === "approved" && approveNeedsAcuseConfirm(row)) {
      if (!window.confirm("Hay acuses pendientes. ¿Aprobar de todos modos?")) return;
    }
    run(async () => {
      await setDeliverableStatusAction(row.id, target);
    }, "Estado actualizado.");
  }

  return (
    <div className="w-full min-w-[min(100vw,430px)] max-w-full p-[18px] lg:w-[430px]">
      <div className="mb-4 flex items-start justify-between gap-2 border-b border-slate-200 pb-3">
        <div>
          <div className="text-xs text-slate-500">
            {row.displayId} · {row.phase || "—"} · {row.ownerName || "—"}
          </div>
          <div className="mt-0.5 text-sm font-semibold leading-snug">{row.title}</div>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${pillClass[stKey]}`}>
              {DELIVERABLE_STATUS_LABEL[stKey]}
            </span>
            <span className="text-xs text-slate-500">
              Compromiso: {formatCommitment(row.dueDate)}
            </span>
            {row.deliveredAt ? (
              <span className="text-xs text-emerald-700">
                Entregado: {formatDeliveredAt(row.deliveredAt) ?? "—"}
              </span>
            ) : null}
            {row.dependsOnTitle ? (
              <span className="text-xs text-slate-500">Dep.: {row.dependsOnTitle}</span>
            ) : null}
            {dayChip(row.dueDate, row.status)}
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-black/[0.17] text-xs hover:bg-[#f7f5f1]"
        >
          ✕
        </button>
      </div>

      {canEdit ? (
        <DetailEditForm
          key={row.id}
          row={row}
          projectRows={projectRows}
          allRows={allRows}
          projects={projects}
          phaseOptions={phaseOptions}
          run={run}
        />
      ) : (
        <ReadOnlyDetail row={row} />
      )}

      {canEdit ? (
        <>
          <div className="mb-3.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Cambiar estado
          </div>
          <div className="mb-3.5 flex flex-wrap gap-1">
            {DELIVERABLE_STATUSES.map((s) => {
              const block = statusBlockReason(row, s, rowById);
              const disabled = Boolean(block && stKey !== s);
              return (
                <button
                  key={s}
                  type="button"
                  disabled={disabled}
                  title={disabled ? (block ?? undefined) : undefined}
                  onClick={() => changeStatus(s)}
                  className={`rounded-full border border-black/[0.17] px-3 py-1 text-xs font-medium text-slate-500 hover:bg-[#f7f5f1] disabled:cursor-not-allowed disabled:opacity-40 ${
                    stKey === s ? statusBtnActive[s] : "bg-white"
                  }`}
                >
                  {DELIVERABLE_STATUS_LABEL[s]}
                </button>
              );
            })}
          </div>
        </>
      ) : null}

      <div className="mb-3.5 rounded-lg border border-slate-200 p-3">
        <div className="mb-2.5 text-xs font-semibold">Acuse del cliente / stakeholders</div>
        {row.acuses.length === 0 ? (
          <div className="py-1 text-xs text-slate-400">Sin acuses registrados</div>
        ) : (
          row.acuses.map((ac, i) => (
            <div
              key={`${ac.name}-${i}`}
              className="flex items-start gap-2 border-b border-slate-200 py-1.5 last:border-b-0"
            >
              <button
                type="button"
                disabled={!canEdit}
                onClick={() =>
                  run(async () => {
                    await toggleDeliverableAcuseAction(row.id, i);
                  })
                }
                className={`mt-0.5 flex h-[17px] w-[17px] shrink-0 items-center justify-center rounded border-[1.5px] ${
                  ac.ok
                    ? "border-[#97C459] bg-[#EAF3DE]"
                    : "border-black/[0.17] bg-white"
                } ${canEdit ? "cursor-pointer" : "cursor-default opacity-60"}`}
              >
                {ac.ok ? (
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden>
                    <path
                      d="M2 5l2.2 2.5L8 3"
                      stroke="#27500A"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                ) : null}
              </button>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-medium">{ac.name}</div>
                <div className="text-xs text-slate-500">{ac.role}</div>
                {ac.ok && ac.confirmedAt ? (
                  <div className="mt-0.5 text-xs text-slate-400">
                    Confirmado: {ac.confirmedAt}
                  </div>
                ) : null}
              </div>
              {canEdit ? (
                <button
                  type="button"
                  onClick={() =>
                    run(async () => {
                      await removeDeliverableAcuseAction(row.id, i);
                    })
                  }
                  className="shrink-0 rounded border border-slate-200 px-1.5 py-0.5 text-xs text-slate-400 hover:bg-[#f7f5f1]"
                >
                  ✕
                </button>
              ) : null}
            </div>
          ))
        )}
        {canEdit ? (
          <div className="mt-2 flex flex-wrap gap-1.5">
            <input
              value={acName}
              onChange={(e) => setAcName(e.target.value)}
              placeholder="Nombre"
              className="h-[30px] min-w-[80px] flex-1 max-w-[130px] rounded-lg border border-black/[0.17] px-2 text-xs"
            />
            <input
              value={acRole}
              onChange={(e) => setAcRole(e.target.value)}
              placeholder="Rol"
              className="h-[30px] min-w-[80px] max-w-[100px] rounded-lg border border-black/[0.17] px-2 text-xs"
            />
            <button
              type="button"
              onClick={() =>
                run(async () => {
                  await addDeliverableAcuseAction(row.id, acName, acRole);
                  setAcName("");
                  setAcRole("");
                })
              }
              className="h-[30px] rounded-lg border border-black/[0.17] bg-white px-2.5 text-xs font-medium hover:bg-[#f7f5f1]"
            >
              + Agregar
            </button>
          </div>
        ) : null}
      </div>

      <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
        Historial de actividad
      </div>
      <div className="mb-4 space-y-0">
        {row.activityLog.length === 0 ? (
          <p className="text-xs text-slate-400">Sin movimientos.</p>
        ) : (
          [...row.activityLog].reverse().map((h, i) => (
            <div
              key={`${h.at}-${i}`}
              className="flex gap-2 border-b border-slate-200 py-1.5 last:border-b-0"
            >
              <span
                className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full"
                style={{ background: h.color ?? "#888780" }}
              />
              <span className="w-14 shrink-0 whitespace-nowrap text-xs text-slate-400">
                {formatLogAt(h.at)}
              </span>
              <span className="text-xs leading-snug text-slate-500">{h.text}</span>
            </div>
          ))
        )}
      </div>

      {canEdit ? (
        <button
          type="button"
          onClick={() => {
            if (!confirm("¿Eliminar este entregable?")) return;
            run(async () => {
              await deleteDeliverableAction(row.id);
              onClose();
            });
          }}
          className="w-full rounded-lg border border-[#F09595] py-2 text-xs font-medium text-[#791F1F] hover:bg-[#FCEBEB]"
        >
          Eliminar entregable
        </button>
      ) : null}
    </div>
  );
}

function ReadOnlyDetail({ row }: { row: DeliverableTrackerRow }) {
  return (
    <>
      <div className="mb-3.5 rounded-lg border border-slate-200 bg-slate-50 p-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Participación en el avance
        </p>
        <p className="mt-1 text-2xl font-semibold tabular-nums text-slate-900">{row.weight}%</p>
      </div>
      <Field label="Descripción" value={row.description} />
      <Field label="Criterios de aceptación" value={row.acceptanceCriteria} />
      <Field label="Cliente / destinatario" value={row.clientName} />
      <Field label="Notas" value={row.notes} />
      {row.dependsOnTitle ? (
        <Field label="Depende de" value={row.dependsOnTitle} />
      ) : null}
      {row.deliveredAt ? (
        <Field label="Fecha de entrega" value={formatDeliveredAt(row.deliveredAt)} />
      ) : null}
      {row.supportUrl || row.supportFiles.length > 0 ? (
        <div className="mb-3">
          <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Soporte documental
          </div>
          <div className="flex flex-wrap gap-2 text-sm">
            {row.supportUrl ? (
              <a
                href={row.supportUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-slate-800 underline"
              >
                Abrir ubicación
              </a>
            ) : null}
            {row.supportFiles.map((file) => (
              <a
                key={file.url}
                href={file.url}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-slate-800 underline"
              >
                {file.name}
              </a>
            ))}
          </div>
        </div>
      ) : null}
    </>
  );
}

function Field({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="mb-3">
      <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </div>
      <div className="text-sm leading-relaxed text-slate-900">{value?.trim() || "—"}</div>
    </div>
  );
}

function DetailEditForm({
  row,
  projectRows,
  allRows,
  projects,
  phaseOptions,
  run,
}: {
  row: DeliverableTrackerRow;
  projectRows: DeliverableTrackerRow[];
  allRows: DeliverableTrackerRow[];
  projects: DeliverableTrackerProject[];
  phaseOptions: string[];
  run: (fn: () => Promise<string | void>, okMessage?: string) => void;
}) {
  const router = useRouter();
  const [projectId, setProjectId] = useState(row.projectId);
  const [title, setTitle] = useState(row.title);
  const [phase, setPhase] = useState(row.phase ?? "");
  const [ownerName, setOwnerName] = useState(row.ownerName ?? "");
  const [clientName, setClientName] = useState(row.clientName ?? "");
  const [dueDate, setDueDate] = useState(toDateInput(row.dueDate) || "");
  const [weight, setWeight] = useState(row.weight);
  const [description, setDescription] = useState(row.description ?? "");
  const [acceptanceCriteria, setAcceptanceCriteria] = useState(row.acceptanceCriteria ?? "");
  const [notes, setNotes] = useState(row.notes ?? "");
  const [supportUrl, setSupportUrl] = useState(row.supportUrl ?? "");
  const [dependsOnId, setDependsOnId] = useState(row.dependsOnId ?? "");

  const dependencyOptions = allRows.filter(
    (r) => r.projectId === projectId && r.id !== row.id,
  );

  const rowsForWeight =
    projectId === row.projectId
      ? projectRows
      : [
          ...allRows.filter((r) => r.projectId === projectId && r.id !== row.id),
          { ...row, projectId, weight, weightManual: true },
        ];

  return (
    <>
      <DeliverableWeightField
        value={weight}
        onChange={setWeight}
        projectRows={rowsForWeight}
        currentId={row.id}
      />

      <div className="mb-3 mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className={uiLabel}>Proyecto</label>
          <select
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
            className={`${uiInput} mt-1`}
          >
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
        <div className="sm:col-span-2">
          <label className={uiLabel}>Nombre del entregable</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className={`${uiInput} mt-1`}
          />
        </div>
        <div>
          <label className={uiLabel}>Fase</label>
          <input
            value={phase}
            onChange={(e) => setPhase(e.target.value)}
            className={`${uiInput} mt-1`}
            list="phase-dl-edit"
          />
          <datalist id="phase-dl-edit">
            {phaseOptions.map((f) => (
              <option key={f} value={f} />
            ))}
          </datalist>
        </div>
        <div>
          <label className={uiLabel}>Responsable</label>
          <input
            value={ownerName}
            onChange={(e) => setOwnerName(e.target.value)}
            className={`${uiInput} mt-1`}
          />
        </div>
        <div>
          <label className={uiLabel}>Cliente / destinatario</label>
          <input
            value={clientName}
            onChange={(e) => setClientName(e.target.value)}
            className={`${uiInput} mt-1`}
          />
        </div>
        <div>
          <label className={uiLabel}>Fecha compromiso</label>
          <input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className={`${uiInput} mt-1`}
          />
        </div>
        <div className="sm:col-span-2">
          <label className={uiLabel}>Depende de</label>
          <select
            value={dependsOnId}
            onChange={(e) => setDependsOnId(e.target.value)}
            className={`${uiInput} mt-1`}
          >
            <option value="">Sin dependencia</option>
            {dependencyOptions.map((r) => (
              <option key={r.id} value={r.id}>
                {r.title}
              </option>
            ))}
          </select>
        </div>
        <div className="sm:col-span-2">
          <label className={uiLabel}>Descripción</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className={`${uiInput} mt-1 resize-y`}
          />
        </div>
        <div className="sm:col-span-2">
          <label className={uiLabel}>Criterios de aceptación</label>
          <textarea
            value={acceptanceCriteria}
            onChange={(e) => setAcceptanceCriteria(e.target.value)}
            rows={3}
            className={`${uiInput} mt-1 resize-y`}
          />
        </div>
        <div className="sm:col-span-2">
          <label className={uiLabel}>Notas</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className={`${uiInput} mt-1 resize-y`}
          />
        </div>
      </div>

      <DeliverableSupportFields
        deliverableId={row.id}
        supportUrl={supportUrl}
        onSupportUrlChange={setSupportUrl}
        supportFiles={row.supportFiles}
        canEdit
        onUploadComplete={() => router.refresh()}
      />

      <button
        type="button"
        onClick={() =>
          run(async () => {
            await updateDeliverableDetailAction({
              id: row.id,
              projectId,
              title,
              phase,
              ownerName,
              clientName,
              dueDate,
              weight: clampWeight(weight),
              description,
              acceptanceCriteria,
              notes,
              supportUrl,
              dependsOnId: dependsOnId || null,
            });
          })
        }
        className="mb-4 mt-4 w-full rounded-lg border border-[var(--accent)] bg-[var(--accent)] py-2 text-sm font-medium text-white hover:bg-[var(--accent-d)]"
      >
        Guardar cambios
      </button>
    </>
  );
}
