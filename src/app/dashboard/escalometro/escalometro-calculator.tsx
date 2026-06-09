"use client";

import { useMemo, useState } from "react";

import {
  ESCALATION_INDICATOR_IDS,
  ESCALATION_LEVEL_OPTIONS,
  evaluateEscalation,
  type EscalationEvaluation,
} from "@/lib/escalation-evaluate";
import { ESCALATION_INDICATOR_HELP } from "@/lib/escalation-indicators";
import { getEscalationTierBadge } from "@/lib/escalation-utils";
import type { EscalationIndicators } from "@/modules/escalations/service";
import { uiLabel } from "@/lib/ui-classes";

const tierPanelClass = {
  green: "border-emerald-200 bg-emerald-50",
  orange: "border-amber-200 bg-amber-50",
  red: "border-rose-200 bg-rose-50",
};

type EscalometroCalculatorProps = {
  onEvaluate: (values: EscalationIndicators, result: EscalationEvaluation) => void;
};

export function EscalometroCalculator({ onEvaluate }: EscalometroCalculatorProps) {
  const [values, setValues] = useState<EscalationIndicators>({});
  const [result, setResult] = useState<EscalationEvaluation | null>(null);

  const complete = ESCALATION_INDICATOR_IDS.every((id) => values[id]);

  function evaluate() {
    if (!complete) return;
    const evaluation = evaluateEscalation(values);
    setResult(evaluation);
    onEvaluate(values, evaluation);
  }

  const badge = result ? getEscalationTierBadge(result.tier) : null;

  const selectedCount = useMemo(
    () => ESCALATION_INDICATOR_IDS.filter((id) => values[id]).length,
    [values],
  );

  return (
    <div className="space-y-4 p-4">
      <div className="grid gap-3 md:grid-cols-2">
        {ESCALATION_INDICATOR_IDS.map((id) => {
          const help = ESCALATION_INDICATOR_HELP[id];
          return (
            <fieldset
              key={id}
              className="rounded-lg border border-slate-200 bg-white p-3"
            >
              <legend className="px-1 text-sm font-semibold text-slate-900">
                {help.label}
              </legend>
              <p className="mt-0.5 text-xs text-slate-500">{help.pmpDomain}</p>
              <div className="mt-2 space-y-1.5">
                {ESCALATION_LEVEL_OPTIONS[id].map((opt) => (
                  <label
                    key={opt.value}
                    className={`flex cursor-pointer items-start gap-2 rounded-md border px-2 py-1.5 text-xs ${
                      values[id] === opt.value
                        ? "border-slate-800 bg-slate-50"
                        : "border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    <input
                      type="radio"
                      name={`indicator-${id}`}
                      checked={values[id] === opt.value}
                      onChange={() => setValues((prev) => ({ ...prev, [id]: opt.value }))}
                      className="mt-0.5"
                    />
                    <span>{opt.label}</span>
                  </label>
                ))}
              </div>
            </fieldset>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={!complete}
          onClick={evaluate}
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
        >
          Evaluar
        </button>
        <span className="text-xs text-slate-500">
          {selectedCount}/{ESCALATION_INDICATOR_IDS.length} indicadores
        </span>
      </div>

      {result && badge ? (
        <div className={`rounded-xl border p-4 ${tierPanelClass[result.tier]}`}>
          <div className="flex flex-wrap items-center gap-2">
            <span className={badge.className}>{badge.label}</span>
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">
              {result.levelLabel}
            </span>
          </div>
          <h3 className="mt-2 text-base font-semibold text-slate-900">{result.title}</h3>
          <p className={`mt-3 ${uiLabel}`}>Acciones recomendadas</p>
          <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-slate-700">
            {result.actions.map((action) => (
              <li key={action}>{action}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
