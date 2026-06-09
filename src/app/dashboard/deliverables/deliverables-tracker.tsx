"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import {
  DELIVERABLE_STATUSES,
  DELIVERABLE_STATUS_LABEL,
  isDeliverableDoneStatus,
  normalizeDeliverableStatus,
  type DeliverableStatus,
} from "@/modules/deliverables/constants";
import type { DeliverableAcuse, DeliverableLogEntry } from "@/modules/deliverables/json";

import {
  addDeliverableAcuseAction,
  createDeliverableAction,
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
  description: string | null;
  acceptanceCriteria: string | null;
  notes: string | null;
  acuses: DeliverableAcuse[];
  activityLog: DeliverableLogEntry[];
};

type Props = {
  rows: DeliverableTrackerRow[];
  projects: DeliverableTrackerProject[];
  canEdit: boolean;
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

function calcWeighted(rows: DeliverableTrackerRow[]) {
  const totalPeso = rows.reduce((a, d) => a + (d.weight > 0 ? d.weight : 1), 0);
  const donePeso = rows
    .filter((d) => isDeliverableDoneStatus(d.status))
    .reduce((a, d) => a + (d.weight > 0 ? d.weight : 1), 0);
  const inProgPeso = rows
    .filter((d) => normalizeDeliverableStatus(d.status) === "review")
    .reduce((a, d) => a + (d.weight > 0 ? d.weight : 1), 0);
  const pct = totalPeso ? Math.round((donePeso / totalPeso) * 100) : 0;
  const pctInProg = totalPeso ? Math.round((inProgPeso / totalPeso) * 100) : 0;
  const maxPeso = Math.max(...rows.map((d) => (d.weight > 0 ? d.weight : 1)), 1);
  return { totalPeso, donePeso, inProgPeso, pct, pctInProg, maxPeso };
}

function progressBarColor(pct: number): string {
  if (pct === 100) return "#1e293b";
  if (pct >= 70) return "#639922";
  if (pct >= 40) return "#BA7517";
  return "#E24B4A";
}

export function DeliverablesTracker({ rows, projects, canEdit }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [q, setQ] = useState("");
  const [st, setSt] = useState("");
  const [phase, setPhase] = useState("");
  const [sort, setSort] = useState<"fecha" | "peso" | "estado" | "fase">("fecha");
  const [panel, setPanel] = useState<"closed" | "detail" | "create">("closed");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const phases = useMemo(() => {
    const set = new Set<string>();
    for (const r of rows) {
      if (r.phase?.trim()) set.add(r.phase.trim());
    }
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [rows]);

  const filtered = useMemo(() => {
    const ql = q.trim().toLowerCase();
    let list = rows.filter((d) => {
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
  }, [rows, q, st, phase, sort]);

  const { totalPeso, donePeso, pct, pctInProg, maxPeso } = useMemo(
    () => calcWeighted(rows),
    [rows],
  );
  const remPct = Math.max(0, 100 - pct - pctInProg);
  const barC = progressBarColor(pct);

  const total = rows.length;
  const comp = rows.filter((d) => isDeliverableDoneStatus(d.status)).length;
  const pend = rows.filter((d) => {
    const s = normalizeDeliverableStatus(d.status);
    return s === "pending" || s === "review";
  }).length;
  const venc = rows.filter((d) => {
    const df = daysFromDue(d.dueDate, d.status);
    return df !== null && df < 0;
  }).length;
  const acPend = rows.reduce((a, d) => a + d.acuses.filter((ac) => !ac.ok).length, 0);

  const selected = selectedId ? rows.find((r) => r.id === selectedId) : undefined;

  function run(fn: () => Promise<void>) {
    startTransition(async () => {
      try {
        await fn();
        router.refresh();
      } catch (e) {
        alert(e instanceof Error ? e.message : "Error");
      }
    });
  }

  function openDetail(id: string) {
    if (selectedId === id && panel === "detail") {
      setPanel("closed");
      setSelectedId(null);
      return;
    }
    setSelectedId(id);
    setPanel("detail");
  }

  function exportCsv() {
    const hdr = [
      "ID",
      "Nombre",
      "Proyecto",
      "Fase",
      "Responsable",
      "Cliente",
      "Fecha compromiso",
      "Estado",
      "Peso",
      "% del total",
      "Acuses OK",
      "Total acuses",
      "Criterios",
      "Notas",
    ];
    const lines = [hdr.join(",")];
    for (const d of rows) {
      const share = totalPeso
        ? Math.round(((d.weight > 0 ? d.weight : 1) / totalPeso) * 100)
        : 0;
      const ok = d.acuses.filter((a) => a.ok).length;
      lines.push(
        [
          d.displayId,
          `"${d.title.replace(/"/g, "'")}"`,
          `"${d.projectName.replace(/"/g, "'")}"`,
          d.phase ?? "",
          d.ownerName ?? "",
          d.clientName ?? "",
          toDateInput(d.dueDate),
          DELIVERABLE_STATUS_LABEL[normalizeDeliverableStatus(d.status)],
          d.weight,
          `${share}%`,
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
                {donePeso} de {totalPeso} pts completados
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white px-[18px] py-3.5">
            <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
              <div>
                <div className="text-xs font-semibold">Avance ponderado por esfuerzo</div>
                <div className="mt-0.5 text-xs text-slate-500">
                  El porcentaje refleja el <strong className="text-slate-900">peso relativo</strong>{" "}
                  de cada entregable, no el conteo simple.
                </div>
              </div>
              <div className="text-right">
                <div className="text-lg font-semibold tabular-nums leading-none" style={{ color: barC }}>
                  {pct}%
                </div>
                <div className="text-xs text-slate-500">
                  {donePeso} / {totalPeso} pts completados
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
                Peso: días, story points u otra unidad consistente
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
              <option value="peso">Mayor peso / esfuerzo</option>
              <option value="estado">Estado</option>
              <option value="fase">Fase</option>
            </select>
            <div className="hidden flex-1 sm:block" />
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
                    <th className="w-[110px] whitespace-nowrap px-3 py-2" title="Peso relativo">
                      Peso
                    </th>
                    <th className="w-[108px] whitespace-nowrap px-3 py-2">Acuse cliente</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((d) => {
                    const stKey = normalizeDeliverableStatus(d.status);
                    const wp = Math.round(((d.weight > 0 ? d.weight : 1) / maxPeso) * 100);
                    return (
                      <tr
                        key={d.id}
                        onClick={() => openDetail(d.id)}
                        className={`cursor-pointer border-b border-slate-200 last:border-b-0 hover:bg-[#f7f5f1] ${
                          selectedId === d.id && panel === "detail"
                            ? "bg-slate-100 hover:bg-slate-100"
                            : ""
                        } ${pending ? "opacity-60" : ""}`}
                      >
                        <td className="px-3 py-2.5 font-mono text-xs text-slate-400">
                          {d.displayId}
                        </td>
                        <td className="px-3 py-2.5 text-xs text-slate-500">{d.projectName}</td>
                        <td className="px-3 py-2.5 text-sm font-medium leading-snug">{d.title}</td>
                        <td className="px-3 py-2.5 text-xs text-slate-500">{d.phase || "—"}</td>
                        <td className="px-3 py-2.5 text-xs text-slate-500">
                          {d.ownerName || "—"}
                        </td>
                        <td className="px-3 py-2.5 text-xs">
                          <span>{formatCommitment(d.dueDate)}</span>
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
                                style={{ width: `${wp}%` }}
                              />
                            </div>
                            <span className="text-xs font-medium text-slate-500">
                              {d.weight > 0 ? d.weight : 1}
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
          className={`shrink-0 overflow-y-auto border-slate-200 bg-white transition-[width] duration-200 ease-out lg:border-l ${
            panel !== "closed" ? "w-full min-w-0 lg:w-[430px] lg:min-w-[430px]" : "w-0 min-w-0 overflow-hidden lg:w-0"
          }`}
        >
          {panel === "detail" && selected ? (
            <DetailPanel
              row={selected}
              projects={projects}
              phaseOptions={phases}
              canEdit={canEdit}
              totalPeso={totalPeso}
              onClose={() => {
                setPanel("closed");
                setSelectedId(null);
              }}
              run={run}
            />
          ) : null}
          {panel === "create" && canEdit ? (
            <CreatePanel
              projects={projects}
              phaseOptions={phases}
              onClose={() => setPanel("closed")}
              run={run}
            />
          ) : null}
        </aside>
      </div>
    </div>
  );
}

function DetailPanel({
  row,
  projects,
  phaseOptions,
  canEdit,
  totalPeso,
  onClose,
  run,
}: {
  row: DeliverableTrackerRow;
  projects: DeliverableTrackerProject[];
  phaseOptions: string[];
  canEdit: boolean;
  totalPeso: number;
  onClose: () => void;
  run: (fn: () => Promise<void>) => void;
}) {
  const stKey = normalizeDeliverableStatus(row.status);
  const myPct = totalPeso
    ? Math.round(((row.weight > 0 ? row.weight : 1) / totalPeso) * 100)
    : 0;
  const [acName, setAcName] = useState("");
  const [acRole, setAcRole] = useState("");

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
          projects={projects}
          phaseOptions={phaseOptions}
          myPct={myPct}
          run={run}
        />
      ) : (
        <ReadOnlyDetail row={row} myPct={myPct} />
      )}

      {canEdit ? (
        <>
          <div className="mb-3.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Cambiar estado
          </div>
          <div className="mb-3.5 flex flex-wrap gap-1">
            {DELIVERABLE_STATUSES.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() =>
                  run(async () => {
                    await setDeliverableStatusAction(row.id, s);
                  })
                }
                className={`rounded-full border border-black/[0.17] px-3 py-1 text-xs font-medium text-slate-500 hover:bg-[#f7f5f1] ${
                  stKey === s ? statusBtnActive[s] : "bg-white"
                }`}
              >
                {DELIVERABLE_STATUS_LABEL[s]}
              </button>
            ))}
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

function ReadOnlyDetail({ row, myPct }: { row: DeliverableTrackerRow; myPct: number }) {
  return (
    <>
      <div
        className="mb-3.5 flex items-center gap-2 rounded-lg px-3 py-2.5"
        style={{ background: ACCENT_L }}
      >
        <div className="min-w-0 flex-1">
          <div className="text-xs font-semibold" style={{ color: ACCENT_D }}>
            Peso / esfuerzo
          </div>
          <div className="text-xs opacity-80" style={{ color: ACCENT_D }}>
            Representa el <strong>{myPct}%</strong> del avance total
          </div>
        </div>
        <span className="text-lg font-bold tabular-nums" style={{ color: ACCENT_D }}>
          {row.weight}
        </span>
      </div>
      <Field label="Descripción" value={row.description} />
      <Field label="Criterios de aceptación" value={row.acceptanceCriteria} />
      <Field label="Cliente / destinatario" value={row.clientName} />
      <Field label="Notas" value={row.notes} />
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
  projects,
  phaseOptions,
  myPct,
  run,
}: {
  row: DeliverableTrackerRow;
  projects: DeliverableTrackerProject[];
  phaseOptions: string[];
  myPct: number;
  run: (fn: () => Promise<void>) => void;
}) {
  const [projectId, setProjectId] = useState(row.projectId);
  const [title, setTitle] = useState(row.title);
  const [phase, setPhase] = useState(row.phase ?? "");
  const [ownerName, setOwnerName] = useState(row.ownerName ?? "");
  const [clientName, setClientName] = useState(row.clientName ?? "");
  const [dueDate, setDueDate] = useState(toDateInput(row.dueDate) || "");
  const [weight, setWeight] = useState(String(row.weight));
  const [description, setDescription] = useState(row.description ?? "");
  const [acceptanceCriteria, setAcceptanceCriteria] = useState(row.acceptanceCriteria ?? "");
  const [notes, setNotes] = useState(row.notes ?? "");

  return (
    <>
      <div
        className="mb-3.5 flex items-center gap-2 rounded-lg px-3 py-2.5"
        style={{ background: ACCENT_L }}
      >
        <div className="min-w-0 flex-1">
          <div className="text-xs font-semibold" style={{ color: ACCENT_D }}>
            Peso / esfuerzo de este entregable
          </div>
          <div className="text-xs opacity-80" style={{ color: ACCENT_D }}>
            Representa el <strong>{myPct}%</strong> del avance total del proyecto
          </div>
        </div>
        <input
          type="number"
          min={1}
          max={999}
          value={weight}
          onChange={(e) => setWeight(e.target.value)}
          className="h-9 w-[72px] rounded-lg border text-center text-base font-bold outline-none"
          style={{ borderColor: ACCENT, color: ACCENT_D, background: "white" }}
        />
      </div>

      <div className="mb-3 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
            Proyecto
          </label>
          <select
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
            className="h-9 w-full rounded-lg border border-black/[0.17] bg-white px-2 text-sm"
          >
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
        <div className="sm:col-span-2">
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
            Nombre del entregable
          </label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="h-9 w-full rounded-lg border border-black/[0.17] px-2 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
            Fase
          </label>
          <input
            value={phase}
            onChange={(e) => setPhase(e.target.value)}
            className="h-9 w-full rounded-lg border border-black/[0.17] px-2 text-sm"
            list="phase-dl-edit"
          />
          <datalist id="phase-dl-edit">
            {phaseOptions.map((f) => (
              <option key={f} value={f} />
            ))}
          </datalist>
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
            Responsable
          </label>
          <input
            value={ownerName}
            onChange={(e) => setOwnerName(e.target.value)}
            className="h-9 w-full rounded-lg border border-black/[0.17] px-2 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
            Cliente / destinatario
          </label>
          <input
            value={clientName}
            onChange={(e) => setClientName(e.target.value)}
            className="h-9 w-full rounded-lg border border-black/[0.17] px-2 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
            Fecha compromiso
          </label>
          <input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="h-9 w-full rounded-lg border border-black/[0.17] px-2 text-sm"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
            Descripción
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="w-full resize-y rounded-lg border border-black/[0.17] px-2 py-2 text-sm"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
            Criterios de aceptación
          </label>
          <textarea
            value={acceptanceCriteria}
            onChange={(e) => setAcceptanceCriteria(e.target.value)}
            rows={3}
            className="w-full resize-y rounded-lg border border-black/[0.17] px-2 py-2 text-sm"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
            Notas
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className="w-full resize-y rounded-lg border border-black/[0.17] px-2 py-2 text-sm"
          />
        </div>
      </div>

      <button
        type="button"
        onClick={() =>
          run(async () => {
            const w = Math.max(1, Math.min(999, Math.round(Number(weight) || 1)));
            await updateDeliverableDetailAction({
              id: row.id,
              projectId,
              title,
              phase,
              ownerName,
              clientName,
              dueDate,
              weight: w,
              description,
              acceptanceCriteria,
              notes,
            });
          })
        }
        className="mb-4 w-full rounded-lg border border-[var(--accent)] bg-[var(--accent)] py-2 text-sm font-medium text-white hover:bg-[var(--accent-d)]"
      >
        Guardar cambios
      </button>
    </>
  );
}

function CreatePanel({
  projects,
  phaseOptions,
  onClose,
  run,
}: {
  projects: DeliverableTrackerProject[];
  phaseOptions: string[];
  onClose: () => void;
  run: (fn: () => Promise<void>) => void;
}) {
  const [projectId, setProjectId] = useState(projects[0]?.id ?? "");
  const [title, setTitle] = useState("");
  const [phase, setPhase] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [clientName, setClientName] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [status, setStatus] = useState<DeliverableStatus>("pending");
  const [weight, setWeight] = useState("5");
  const [description, setDescription] = useState("");
  const [acceptanceCriteria, setAcceptanceCriteria] = useState("");

  return (
    <div className="w-full min-w-[min(100vw,430px)] max-w-full p-[18px] lg:w-[430px]">
      <div className="mb-4 flex items-start justify-between gap-2 border-b border-slate-200 pb-3">
        <div>
          <div className="text-xs text-slate-500">Gestión del alcance · PMBOK</div>
          <div className="text-sm font-semibold">Nuevo entregable</div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-black/[0.17] text-xs hover:bg-[#f7f5f1]"
        >
          ✕
        </button>
      </div>

      <div className="mb-3.5 rounded-lg border border-slate-200 bg-[#f7f5f1] p-2.5 text-xs leading-relaxed text-slate-500">
        El <strong className="text-slate-900">peso / esfuerzo</strong> define cuánto contribuye este
        entregable al avance global. Usa días, story points u otra unidad — lo que importa es la
        proporción entre entregables.
      </div>

      <div
        className="mb-4 flex items-center gap-2 rounded-lg px-3 py-2.5"
        style={{ background: ACCENT_L }}
      >
        <div className="min-w-0 flex-1">
          <div className="text-xs font-semibold" style={{ color: ACCENT_D }}>
            Peso / esfuerzo
          </div>
          <div className="text-xs opacity-80" style={{ color: ACCENT_D }}>
            Unidad de medida consistente con el resto
          </div>
        </div>
        <input
          type="number"
          min={1}
          max={999}
          value={weight}
          onChange={(e) => setWeight(e.target.value)}
          className="h-9 w-[72px] rounded-lg border text-center text-base font-bold outline-none"
          style={{ borderColor: ACCENT, color: ACCENT_D, background: "white" }}
        />
      </div>

      <div className="mb-3 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
            Proyecto
          </label>
          <select
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
            className="h-9 w-full rounded-lg border border-black/[0.17] bg-white px-2 text-sm"
          >
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
        <div className="sm:col-span-2">
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
            Nombre del entregable
          </label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ej. Informe de pruebas"
            className="h-9 w-full rounded-lg border border-black/[0.17] px-2 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
            Fase del proyecto
          </label>
          <input
            value={phase}
            onChange={(e) => setPhase(e.target.value)}
            placeholder="Ej. Desarrollo"
            list="phase-dl-create"
            className="h-9 w-full rounded-lg border border-black/[0.17] px-2 text-sm"
          />
          <datalist id="phase-dl-create">
            {phaseOptions.map((f) => (
              <option key={f} value={f} />
            ))}
          </datalist>
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
            Responsable
          </label>
          <input
            value={ownerName}
            onChange={(e) => setOwnerName(e.target.value)}
            placeholder="Nombre o equipo"
            className="h-9 w-full rounded-lg border border-black/[0.17] px-2 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
            Cliente / destinatario
          </label>
          <input
            value={clientName}
            onChange={(e) => setClientName(e.target.value)}
            placeholder="Quien aprueba"
            className="h-9 w-full rounded-lg border border-black/[0.17] px-2 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
            Fecha compromiso
          </label>
          <input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="h-9 w-full rounded-lg border border-black/[0.17] px-2 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
            Estado inicial
          </label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as DeliverableStatus)}
            className="h-9 w-full rounded-lg border border-black/[0.17] bg-white px-2 text-sm"
          >
            {DELIVERABLE_STATUSES.map((s) => (
              <option key={s} value={s}>
                {DELIVERABLE_STATUS_LABEL[s]}
              </option>
            ))}
          </select>
        </div>
        <div className="sm:col-span-2">
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
            Descripción
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            placeholder="¿Qué incluye este entregable?"
            className="w-full resize-y rounded-lg border border-black/[0.17] px-2 py-2 text-sm"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
            Criterios de aceptación
          </label>
          <textarea
            value={acceptanceCriteria}
            onChange={(e) => setAcceptanceCriteria(e.target.value)}
            rows={3}
            placeholder="Condiciones para aprobarlo"
            className="w-full resize-y rounded-lg border border-black/[0.17] px-2 py-2 text-sm"
          />
        </div>
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() =>
            run(async () => {
              if (!title.trim() || !ownerName.trim() || !dueDate) {
                alert("Nombre, responsable y fecha compromiso son obligatorios.");
                return;
              }
              const w = Math.max(1, Math.min(999, Math.round(Number(weight) || 5)));
              await createDeliverableAction({
                projectId,
                title: title.trim(),
                phase: phase.trim(),
                ownerName: ownerName.trim(),
                clientName: clientName.trim(),
                dueDate,
                status,
                weight: w,
                description: description.trim(),
                acceptanceCriteria: acceptanceCriteria.trim(),
              });
              onClose();
            })
          }
          className="flex-1 rounded-lg border border-[var(--accent)] bg-[var(--accent)] py-2 text-sm font-medium text-white hover:bg-[var(--accent-d)]"
        >
          Registrar entregable
        </button>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg border border-black/[0.17] bg-white px-3 py-2 text-sm hover:bg-[#f7f5f1]"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}
