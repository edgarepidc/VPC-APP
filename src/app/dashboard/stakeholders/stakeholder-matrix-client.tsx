"use client";

import { useState } from "react";

import {
  type QuadrantId,
  QUADRANT_PLAYBOOK,
  getQuadrantId,
} from "@/lib/stakeholder-playbook";

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

export function StakeholderMatrixClient({
  stakeholders,
  projectFilterLabel,
  selectedId,
  onSelectId,
  canEdit = false,
  onEdit,
  onDelete,
}: Props) {
  const [exportNote, setExportNote] = useState<string | null>(null);

  const visible = stakeholders;

  const selected = visible.find((s) => s.id === selectedId) ?? null;
  const playbook = selected
    ? QUADRANT_PLAYBOOK[getQuadrantId(selected.influence, selected.interest)]
    : null;

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
          `- Cuadrante: ${q.fullLabel}`,
          `- Estrategia: ${q.strategy}`,
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

  return (
    <div className="sh-matrix-app flex min-h-[min(720px,calc(100vh-12rem))] flex-col overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm lg:flex-row">
      <div className="flex min-h-0 flex-1 flex-col bg-slate-50">
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
            <div className="hidden h-[18px] w-px bg-[#e8e6e1] sm:block" />
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
              Exportar
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
            <div className="flex flex-shrink-0 items-center justify-center py-2 pr-1">
              <span
                className="max-w-[2rem] text-center text-xs font-medium uppercase leading-snug tracking-wider text-slate-400"
                style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}
              >
                Influencia / poder
              </span>
            </div>
            <div className="flex min-w-0 flex-1 flex-col">
              <div className="relative flex-1 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-[0_4px_12px_rgba(0,0,0,0.07)]">
                <div className="pointer-events-none absolute inset-0 grid grid-cols-2 grid-rows-2">
                  <div
                    className="flex items-center justify-center border-b border-r border-dashed p-2 text-center"
                    style={{ background: qBg.q1, borderColor: qBorder.q1 }}
                  >
                    <span className="text-xs font-semibold uppercase leading-tight text-green-800 opacity-[0.18]">
                      Promotores
                      <br />
                      Jugadores clave
                    </span>
                  </div>
                  <div
                    className="flex items-center justify-center border-b border-dashed p-2 text-center"
                    style={{ background: qBg.q2, borderColor: qBorder.q2 }}
                  >
                    <span className="text-xs font-semibold uppercase leading-tight text-amber-800 opacity-[0.18]">
                      Latentes
                      <br />
                      Cumplidores
                    </span>
                  </div>
                  <div
                    className="flex items-center justify-center border-r border-dashed p-2 text-center"
                    style={{ background: qBg.q3, borderColor: qBorder.q3 }}
                  >
                    <span className="text-xs font-semibold uppercase leading-tight text-blue-800 opacity-[0.18]">
                      Defensores
                      <br />
                      Aliados
                    </span>
                  </div>
                  <div
                    className="flex items-center justify-center p-2 text-center"
                    style={{ background: qBg.q4, borderColor: qBorder.q4 }}
                  >
                    <span className="text-xs font-semibold uppercase leading-tight text-gray-600 opacity-[0.18]">
                      Espectadores
                    </span>
                  </div>
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
                          isSel ? "ring-[3px] ring-[#2563eb] ring-offset-2" : "",
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

      <aside className="flex w-full flex-shrink-0 flex-col border-t border-slate-200 bg-white lg:w-[320px] lg:border-l lg:border-t-0">
        <div className="border-b border-[#f0ede8] px-5 py-4">
          <p className="text-[12px] font-semibold uppercase tracking-wider text-slate-400">
            Playbook táctico
          </p>
          <p className="mt-0.5 text-sm font-medium text-slate-900">
            {selected ? selected.name : "Selecciona un interesado"}
          </p>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {!selected && (
            <div className="flex flex-col items-center justify-center gap-2.5 py-8 text-center text-slate-400">
              <div className="flex h-10 w-10 items-center justify-center rounded-[10px] border border-slate-200 bg-[#f2f1ee]">
                <svg
                  className="h-[18px] w-[18px] text-slate-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                >
                  <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              </div>
              <p className="max-w-[200px] text-sm leading-snug">
                <strong className="font-medium text-slate-500">Pulsa un punto</strong> en la matriz
                para ver estrategia y tácticas sugeridas.
              </p>
            </div>
          )}
          {selected && playbook && (
            <div className="flex flex-col gap-3.5">
              <div
                className="rounded-lg border p-3.5"
                style={{
                  background: qBg[playbook.id],
                  borderColor: qBorder[playbook.id],
                }}
              >
                <p className="text-[15px] font-semibold text-slate-900">{selected.name}</p>
                <p className="mt-0.5 text-[12px] text-slate-500">{selected.role || "Sin cargo"}</p>
                <p className="mt-2 text-xs text-slate-500">Subproyecto: {selected.projectName}</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <span className="inline-flex rounded-full bg-[#f2f1ee] px-2 py-0.5 font-mono text-[10.5px] text-slate-500">
                    Inf {selected.influence} · Int {selected.interest}
                  </span>
                  <span className="inline-flex rounded-full bg-white/80 px-2 py-0.5 text-xs font-medium text-[#15803d]">
                    {playbook.fullLabel}
                  </span>
                </div>
              </div>

              <div>
                <p className="mb-1.5 flex items-center gap-2 text-[10.5px] font-semibold uppercase tracking-wide text-slate-400">
                  Estrategia
                  <span className="h-px flex-1 bg-[#f0ede8]" />
                </p>
                <div className="rounded-md border border-slate-200 bg-[#f2f1ee] px-3 py-2.5 text-sm font-semibold text-slate-900">
                  {playbook.strategy}
                </div>
              </div>

              <div>
                <p className="mb-1.5 flex items-center gap-2 text-[10.5px] font-semibold uppercase tracking-wide text-slate-400">
                  Tácticas
                  <span className="h-px flex-1 bg-[#f0ede8]" />
                </p>
                <ul className="flex flex-col gap-1.5">
                  {playbook.tactics.map((t, i) => (
                    <li
                      key={i}
                      className="flex gap-2 rounded-md border border-[#f0ede8] bg-[#f2f1ee] px-2.5 py-2 text-[12px] leading-snug text-slate-600"
                    >
                      <span
                        className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-[#2563eb]"
                        aria-hidden
                      />
                      {t}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="flex items-center gap-2 rounded-md border border-slate-200 bg-[#f2f1ee] px-3 py-2">
                <span aria-hidden>{playbook.freqIcon}</span>
                <span className="text-[12px] text-slate-600">
                  Comunicación: <strong className="text-slate-900">{playbook.freq}</strong>
                </span>
              </div>

              {selected.observation ? (
                <div className="rounded-md border border-slate-200 bg-[#f2f1ee] px-2.5 py-2 text-[12px] italic leading-relaxed text-slate-600">
                  {selected.observation}
                </div>
              ) : (
                <p className="rounded-md border border-dashed border-amber-200 bg-amber-50/50 px-2.5 py-2 text-[12px] text-amber-800">
                  Sin observación registrada. Documenta acuerdos de comunicación aquí.
                </p>
              )}

              {canEdit && onEdit && onDelete ? (
                <div className="flex flex-wrap gap-2 border-t border-[#f0ede8] pt-3">
                  <button
                    type="button"
                    onClick={() => onEdit(selected)}
                    className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    onClick={() => onDelete(selected)}
                    className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50"
                  >
                    Eliminar
                  </button>
                </div>
              ) : null}
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}
