"use client";

import {
  type QuadrantId,
  QUADRANT_PLAYBOOK,
  getQuadrantId,
} from "@/lib/stakeholder-playbook";

import type { MatrixStakeholder } from "./stakeholder-matrix-client";

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

type Props = {
  selected: MatrixStakeholder | null;
  canEdit?: boolean;
  onEdit?: (s: MatrixStakeholder) => void;
  onDelete?: (s: MatrixStakeholder) => void;
  className?: string;
};

export function StakeholderDetailPanel({
  selected,
  canEdit = false,
  onEdit,
  onDelete,
  className = "",
}: Props) {
  const playbook = selected
    ? QUADRANT_PLAYBOOK[getQuadrantId(selected.influence, selected.interest)]
    : null;

  return (
    <aside
      className={`flex w-full flex-shrink-0 flex-col border-slate-200 bg-white lg:w-[320px] lg:border-l ${className}`}
    >
      <div className="sticky top-0 z-10 border-b border-slate-200 bg-white px-5 py-4">
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
            <div className="flex h-10 w-10 items-center justify-center rounded-[10px] border border-slate-200 bg-slate-100">
              <svg
                className="h-[18px] w-[18px] text-slate-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
                aria-hidden
              >
                <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            </div>
            <p className="max-w-[200px] text-sm leading-snug">
              Selecciona un interesado en la matriz o el registro para ver estrategia y tácticas.
            </p>
          </div>
        )}
        {selected && playbook ? (
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
                <span className="inline-flex rounded-full bg-slate-100 px-2 py-0.5 font-mono text-[10.5px] text-slate-500">
                  Inf {selected.influence} · Int {selected.interest}
                </span>
                <span className="inline-flex rounded-full bg-white/80 px-2 py-0.5 font-mono text-[10.5px] font-semibold text-slate-700">
                  {playbook.code}
                </span>
                <span className="inline-flex rounded-full bg-white/80 px-2 py-0.5 text-xs font-medium text-emerald-800">
                  {playbook.fullLabel}
                </span>
              </div>
              <p className="mt-2 text-[11px] leading-snug text-slate-500">{playbook.positionHint}</p>
            </div>

            <div>
              <p className="mb-1.5 flex items-center gap-2 text-[10.5px] font-semibold uppercase tracking-wide text-slate-400">
                Estrategia
                <span className="h-px flex-1 bg-slate-200" />
              </p>
              <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2.5">
                <p className="text-sm font-semibold text-slate-900">{playbook.strategy}</p>
                <p className="mt-1.5 text-[12px] leading-relaxed text-slate-600">
                  {playbook.strategyRationale}
                </p>
              </div>
            </div>

            <div>
              <p className="mb-1.5 flex items-center gap-2 text-[10.5px] font-semibold uppercase tracking-wide text-slate-400">
                Tácticas
                <span className="h-px flex-1 bg-slate-200" />
              </p>
              <ul className="flex flex-col gap-1.5">
                {playbook.tactics.map((t, i) => (
                  <li
                    key={i}
                    className="flex gap-2 rounded-md border border-slate-200 bg-slate-50 px-2.5 py-2 text-[12px] leading-snug text-slate-600"
                  >
                    <span
                      className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-600"
                      aria-hidden
                    />
                    {t}
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
              <span aria-hidden>{playbook.freqIcon}</span>
              <span className="text-[12px] text-slate-600">
                Comunicación: <strong className="text-slate-900">{playbook.freq}</strong>
              </span>
            </div>

            {selected.observation ? (
              <div className="rounded-md border border-slate-200 bg-slate-50 px-2.5 py-2 text-[12px] italic leading-relaxed text-slate-600">
                {selected.observation}
              </div>
            ) : (
              <p className="rounded-md border border-dashed border-amber-200 bg-amber-50/50 px-2.5 py-2 text-[12px] text-amber-800">
                Sin observación registrada. Documenta acuerdos de comunicación aquí.
              </p>
            )}

            {canEdit && onEdit && onDelete ? (
              <div className="flex flex-wrap gap-2 border-t border-slate-200 pt-3">
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
        ) : null}
      </div>
    </aside>
  );
}
