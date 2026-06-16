"use client";

import { useState } from "react";

import {
  type QuadrantId,
  QUADRANT_PLAYBOOK,
  formatQuadrantTacticsForExport,
  getQuadrantId,
} from "@/lib/stakeholder-playbook";

import { StakeholderDetailPanel } from "./stakeholder-detail-panel";

export type MatrixStakeholder = {
  id: string;
  name: string;
  role: string | null;
  influence: number;
  interest: number;
  observation: string | null;
  projectId: string;
  projectName: string;
};

type Props = {
  stakeholders: MatrixStakeholder[];
  projectFilterLabel: string;
  selectedId: string | null;
  onSelectId: (id: string | null) => void;
  quadrantFilter?: QuadrantId | "";
  onQuadrantFilter?: (quadrant: QuadrantId | "") => void;
  canEdit?: boolean;
  onEdit?: (s: MatrixStakeholder) => void;
  onDelete?: (s: MatrixStakeholder) => void;
};

const qBg: Record<QuadrantId, string> = {
  q1: "rgba(22, 163, 74, 0.055)",
  q2: "rgba(234, 179, 8, 0.055)",
  q3: "rgba(59, 130, 246, 0.055)",
  q4: "rgba(156, 163, 175, 0.07)",
};

const qBorder: Record<QuadrantId, string> = {
  q1: "rgba(22, 163, 74, 0.15)",
  q2: "rgba(234, 179, 8, 0.18)",
  q3: "rgba(59, 130, 246, 0.15)",
  q4: "rgba(156, 163, 175, 0.18)",
};

const markerClass: Record<QuadrantId, string> = {
  q1: "bg-green-600 text-white",
  q2: "bg-amber-500 text-white",
  q3: "bg-blue-600 text-white",
  q4: "bg-slate-500 text-white",
};

function initials(name: string) {
  const p = name.trim().split(/\s+/).slice(0, 2);
  return p.map((w) => w[0]?.toUpperCase() ?? "").join("") || "?";
}

function QuadrantCell({
  quadrant,
  label,
  active,
  onClick,
}: {
  quadrant: QuadrantId;
  label: React.ReactNode;
  active: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center justify-center border-dashed p-2 text-center transition ${
        quadrant === "q1"
          ? "border-b border-r"
          : quadrant === "q2"
            ? "border-b"
            : quadrant === "q3"
              ? "border-r"
              : ""
      } ${onClick ? "cursor-pointer hover:brightness-95" : ""} ${active ? "ring-2 ring-inset ring-slate-700/40" : ""}`}
      style={{ background: qBg[quadrant], borderColor: qBorder[quadrant] }}
      title="Filtrar por este cuadrante"
    >
      <span className="text-xs font-semibold uppercase leading-tight opacity-[0.22]">{label}</span>
    </button>
  );
}

export function StakeholderMatrixClient({
  stakeholders,
  projectFilterLabel,
  selectedId,
  onSelectId,
  quadrantFilter = "",
  onQuadrantFilter,
  canEdit = false,
  onEdit,
  onDelete,
}: Props) {
  const [exportNote, setExportNote] = useState<string | null>(null);

  const visible = stakeholders;
  const selected = visible.find((s) => s.id === selectedId) ?? null;

  function exportMarkdown() {
    const lines = [
      "# Plan de comunicaciones — Interesados",
      "",
      ...visible.map((s) => {
        const q = QUADRANT_PLAYBOOK[getQuadrantId(s.influence, s.interest)];
        return [
          `## ${s.name}`,
          `- Subproyecto: ${s.projectName}`,
          `- Influencia: ${s.influence} · Interés: ${s.interest}`,
          `- Cuadrante: ${q.code} · ${q.fullLabel} (${q.positionHint})`,
          `- Estrategia: ${q.strategy}`,
          `- Por qué: ${q.strategyRationale}`,
          `- Comunicación: ${q.freq}`,
          `- Tácticas: ${formatQuadrantTacticsForExport(q.tactics)}`,
          s.observation ? `- Nota: ${s.observation}` : "",
          "",
        ]
          .filter(Boolean)
          .join("\n");
      }),
    ];
    void navigator.clipboard.writeText(lines.join("\n"));
    setExportNote("Plan copiado al portapapeles.");
    window.setTimeout(() => setExportNote(null), 4000);
  }

  function toggleQuadrant(q: QuadrantId) {
    if (!onQuadrantFilter) return;
    onQuadrantFilter(quadrantFilter === q ? "" : q);
  }

  return (
    <div className="flex min-h-[min(720px,calc(100vh-12rem))] flex-col overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm lg:flex-row">
      <div className="flex min-h-0 min-w-0 flex-1 flex-col bg-slate-50">
        <header className="flex flex-shrink-0 flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white px-5 py-3">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="flex h-[26px] w-[26px] items-center justify-center rounded-[7px] bg-slate-800">
                <svg
                  className="h-3.5 w-3.5 text-white"
                  viewBox="0 0 16 16"
                  fill="currentColor"
                  aria-hidden
                >
                  <circle cx="5" cy="5" r="2" />
                  <circle cx="11" cy="4" r="2" />
                  <circle cx="4" cy="11" r="2" />
                  <circle cx="11" cy="11" r="2" />
                </svg>
              </div>
              <span className="text-sm font-semibold tracking-tight text-slate-900">Matriz</span>
            </div>
            <div className="hidden h-[18px] w-px bg-slate-200 sm:block" />
            <div>
              <p className="text-sm text-slate-500">Alcance activo</p>
              <p className="mt-0.5 max-w-[220px] truncate text-sm font-medium text-slate-900">
                {projectFilterLabel}
              </p>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1">
            <button
              type="button"
              onClick={() => exportMarkdown()}
              className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-500 hover:bg-slate-50"
            >
              Plan MD
            </button>
            {exportNote ? (
              <span className="text-[10px] text-emerald-700">{exportNote}</span>
            ) : null}
          </div>
        </header>

        <div className="flex flex-1 flex-col gap-2.5 overflow-hidden p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Matriz poder × interés
            </span>
            <span className="rounded-full border border-slate-200 bg-white px-2.5 py-0.5 text-[12px] text-slate-400">
              Interesados:{" "}
              <strong className="font-semibold text-slate-500">{visible.length}</strong>
            </span>
          </div>

          <div className="flex min-h-[280px] flex-1 gap-0 sm:min-h-[340px]">
            <div className="flex shrink-0 items-center justify-center py-2 pr-1">
              <span
                className="max-w-[2rem] text-center text-xs font-medium uppercase leading-snug tracking-wider text-slate-400"
                style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}
              >
                Influencia / poder
              </span>
            </div>
            <div className="flex min-w-0 flex-1 flex-col">
              <div className="relative flex-1 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
                <div className="absolute inset-0 grid grid-cols-2 grid-rows-2">
                  <QuadrantCell
                    quadrant="q1"
                    label={
                      <>
                        Promotores
                        <br />
                        Jugadores clave
                      </>
                    }
                    active={quadrantFilter === "q1"}
                    onClick={onQuadrantFilter ? () => toggleQuadrant("q1") : undefined}
                  />
                  <QuadrantCell
                    quadrant="q2"
                    label={
                      <>
                        Latentes
                        <br />
                        Cumplidores
                      </>
                    }
                    active={quadrantFilter === "q2"}
                    onClick={onQuadrantFilter ? () => toggleQuadrant("q2") : undefined}
                  />
                  <QuadrantCell
                    quadrant="q3"
                    label={
                      <>
                        Defensores
                        <br />
                        Aliados
                      </>
                    }
                    active={quadrantFilter === "q3"}
                    onClick={onQuadrantFilter ? () => toggleQuadrant("q3") : undefined}
                  />
                  <QuadrantCell
                    quadrant="q4"
                    label="Espectadores"
                    active={quadrantFilter === "q4"}
                    onClick={onQuadrantFilter ? () => toggleQuadrant("q4") : undefined}
                  />
                </div>

                {visible.map((s) => {
                  const qid = getQuadrantId(s.influence, s.interest);
                  const left = `${(s.interest / 10) * 100}%`;
                  const top = `${(1 - s.influence / 10) * 100}%`;
                  const isSel = selectedId === s.id;
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => onSelectId(isSel ? null : s.id)}
                      className="absolute z-10 -translate-x-1/2 -translate-y-1/2 cursor-pointer transition-transform hover:z-20 hover:scale-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                      style={{ left, top }}
                      title={s.name}
                    >
                      <div
                        className={[
                          "flex h-[34px] w-[34px] items-center justify-center rounded-full border-2 border-white text-xs font-semibold shadow-sm",
                          markerClass[qid],
                          isSel ? "ring-[3px] ring-blue-600 ring-offset-2" : "",
                        ].join(" ")}
                      >
                        {initials(s.name)}
                      </div>
                      <span className="pointer-events-none absolute left-1/2 top-[calc(100%+4px)] max-w-[110px] -translate-x-1/2 truncate rounded border border-slate-200 bg-white px-1.5 py-0.5 text-[10.5px] font-medium text-slate-900 shadow-sm">
                        {s.name}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="mt-1 flex justify-between px-0.5">
                {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                  <span key={n} className="font-mono text-[10px] text-slate-400">
                    {n}
                  </span>
                ))}
              </div>
              <p className="pt-1 text-center text-xs font-medium uppercase tracking-wide text-slate-400">
                Interés / apoyo →
              </p>
            </div>
          </div>
        </div>
      </div>

      <StakeholderDetailPanel
        selected={selected}
        canEdit={canEdit}
        onEdit={onEdit}
        onDelete={onDelete}
        className="border-t lg:border-t-0"
      />
    </div>
  );
}
