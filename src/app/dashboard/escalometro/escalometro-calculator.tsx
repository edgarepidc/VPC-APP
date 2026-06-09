"use client";

import { useMemo, useState, type ReactNode } from "react";

import { FieldHint } from "@/app/dashboard/_components/field-hint";
import {
  ESCALATION_INDICATOR_IDS,
  ESCALATION_LEVEL_OPTIONS,
  evaluateEscalation,
  type EscalationEvaluation,
  type IndicatorLevel,
} from "@/lib/escalation-evaluate";
import {
  ESCALATION_INDICATOR_HELP,
  getIndicatorLevelLabel,
  type EscalationIndicatorKey,
} from "@/lib/escalation-indicators";
import type { EscalationIndicators } from "@/modules/escalations/service";

const INDICATOR_ICONS: Record<EscalationIndicatorKey, ReactNode> = {
  budget: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>
  ),
  schedule: (
    <>
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </>
  ),
  team: (
    <>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
    </>
  ),
  scope: <path d="M22 12h-4l-3 9-6-18-3 9H2" />,
  stakeholders: <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />,
  impact: (
    <>
      <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <path d="M12 9v4M12 17h.01" />
    </>
  ),
};

const levelBadgeClass: Record<IndicatorLevel, string> = {
  low: "bg-[#f0f7f4] text-[#2d6a4f]",
  medium: "bg-[#fef6ee] text-[#b5530a]",
  high: "bg-[#fef2f2] text-[#9b1c1c]",
};

const resultPanelClass = {
  green: {
    header: "border-[#b7dece] bg-[#f0f7f4]",
    dot: "bg-[#2d6a4f]",
    title: "text-[#2d6a4f]",
    level: "border border-[#b7dece] bg-[#f0f7f4] text-[#2d6a4f]",
  },
  orange: {
    header: "border-[#f8c99c] bg-[#fef6ee]",
    dot: "bg-[#b5530a]",
    title: "text-[#b5530a]",
    level: "border border-[#f8c99c] bg-[#fef6ee] text-[#b5530a]",
  },
  red: {
    header: "border-[#fca5a5] bg-[#fef2f2]",
    dot: "bg-[#9b1c1c]",
    title: "text-[#9b1c1c]",
    level: "border border-[#fca5a5] bg-[#fef2f2] text-[#9b1c1c]",
  },
};

function IndicatorIcon({ id }: { id: EscalationIndicatorKey }) {
  return (
    <span className="flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-md border border-slate-200 bg-slate-50">
      <svg
        viewBox="0 0 24 24"
        className="h-3 w-3 stroke-slate-500"
        fill="none"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        {INDICATOR_ICONS[id]}
      </svg>
    </span>
  );
}

type EscalometroCalculatorProps = {
  onEvaluate: (values: EscalationIndicators, result: EscalationEvaluation) => void;
};

export function EscalometroCalculator({ onEvaluate }: EscalometroCalculatorProps) {
  const [values, setValues] = useState<EscalationIndicators>({});
  const [result, setResult] = useState<EscalationEvaluation | null>(null);

  const complete = ESCALATION_INDICATOR_IDS.every((id) => values[id]);

  const selectedCount = useMemo(
    () => ESCALATION_INDICATOR_IDS.filter((id) => values[id]).length,
    [values],
  );

  function evaluate() {
    if (!complete) return;
    const evaluation = evaluateEscalation(values);
    setResult(evaluation);
    onEvaluate(values, evaluation);
  }

  const panel = result ? resultPanelClass[result.tier] : null;

  return (
    <div className="space-y-6 p-4 sm:p-5">
      <div className="grid gap-3.5 sm:grid-cols-2 xl:grid-cols-3">
        {ESCALATION_INDICATOR_IDS.map((id) => {
          const help = ESCALATION_INDICATOR_HELP[id];
          const level = values[id];
          return (
            <div
              key={id}
              className="rounded-[10px] border border-slate-200 bg-white p-5 shadow-sm transition focus-within:border-slate-300 focus-within:shadow-md"
            >
              <div className="mb-3 flex items-start justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2">
                  <IndicatorIcon id={id} />
                  <span className="text-[11.5px] font-semibold uppercase tracking-[0.08em] text-slate-600">
                    {help.label}
                  </span>
                </div>
                <FieldHint
                  text={`${help.pmpDomain}. ${help.summary} ${help.evaluate}`}
                />
              </div>

              <div className="relative">
                <select
                  value={level ?? ""}
                  onChange={(e) => {
                    const v = e.target.value as IndicatorLevel | "";
                    setValues((prev) => {
                      const next = { ...prev };
                      if (v) next[id] = v;
                      else delete next[id];
                      return next;
                    });
                    setResult(null);
                  }}
                  className="w-full appearance-none rounded-[7px] border border-slate-200 bg-slate-50 py-2.5 pl-3 pr-9 text-[13.5px] text-slate-900 outline-none transition hover:border-slate-300 focus:border-slate-800 focus:bg-white"
                >
                  <option value="">Selecciona nivel…</option>
                  {ESCALATION_LEVEL_OPTIONS[id].map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <span
                  className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 border-x-[4px] border-t-[5px] border-x-transparent border-t-slate-400"
                  aria-hidden
                />
              </div>

              {level ? (
                <span
                  className={`mt-2.5 inline-flex items-center gap-1.5 rounded px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.06em] ${levelBadgeClass[level]}`}
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-current" />
                  {getIndicatorLevelLabel(level)}
                </span>
              ) : null}
            </div>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={!complete}
          onClick={evaluate}
          className="inline-flex items-center gap-2 rounded-[10px] bg-slate-800 px-6 py-3 text-sm font-medium text-white transition hover:opacity-90 active:scale-[0.98] disabled:opacity-50"
        >
          <svg
            viewBox="0 0 24 24"
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
          </svg>
          Evaluar proyecto
        </button>
        <span className="text-xs text-slate-500">
          {selectedCount}/{ESCALATION_INDICATOR_IDS.length} indicadores completos
        </span>
      </div>

      {result && panel ? (
        <div
          className="overflow-hidden rounded-[10px] border-[1.5px] border-slate-200 bg-white shadow-sm"
          role="region"
          aria-live="polite"
        >
          <div
            className={`flex flex-wrap items-center gap-4 border-b px-6 py-5 sm:px-7 ${panel.header}`}
          >
            <span className={`h-3.5 w-3.5 shrink-0 rounded-full ${panel.dot}`} />
            <span className={`text-[15px] font-semibold tracking-tight ${panel.title}`}>
              {result.title}
            </span>
            <span
              className={`ml-auto rounded-[5px] px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.1em] sm:ml-0 ${panel.level}`}
            >
              {result.levelLabel}
            </span>
          </div>
          <div className="px-6 py-5 sm:px-7">
            <h3 className="text-[11.5px] font-semibold uppercase tracking-[0.08em] text-slate-400">
              Acciones recomendadas
            </h3>
            <ul className="mt-3 space-y-2">
              {result.actions.map((action) => (
                <li key={action} className="flex items-start gap-2.5 text-sm leading-relaxed text-slate-900">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-slate-400" />
                  {action}
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : null}
    </div>
  );
}
