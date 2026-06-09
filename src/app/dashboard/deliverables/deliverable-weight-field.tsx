"use client";

import { useMemo } from "react";

import {
  clampWeight,
  projectWeightBudget,
  redistributeWeightChange,
} from "@/lib/deliverable-weight-utils";
import { uiInput, uiLabel } from "@/lib/ui-classes";

import type { DeliverableTrackerRow } from "./deliverables-tracker";

export function DeliverableWeightField({
  value,
  onChange,
  projectRows,
  currentId,
  compact = false,
}: {
  value: number;
  onChange: (next: number) => void;
  projectRows: DeliverableTrackerRow[];
  currentId?: string;
  compact?: boolean;
}) {
  const safeValue = clampWeight(value);
  const budget = projectWeightBudget(
    projectRows.map((r) => ({
      id: r.id,
      weight: r.id === currentId ? safeValue : r.weight,
      weightManual: r.weightManual,
    })),
    currentId,
  );

  const preview = useMemo(() => {
    if (!currentId) return null;
    const base = projectRows.map((r) => ({
      id: r.id,
      weight: r.weight,
      weightManual: r.weightManual,
    }));
    return redistributeWeightChange(base, currentId, safeValue).filter((r) => r.id !== currentId);
  }, [currentId, projectRows, safeValue]);

  return (
    <div
      className={`rounded-lg border border-slate-200 bg-slate-50 ${compact ? "p-2.5" : "p-3"}`}
    >
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className={uiLabel}>% del avance del proyecto</p>
          {!compact ? (
            <p className="mt-1 text-xs text-slate-500">
              Los entregables sin ajuste manual absorben el resto hasta completar 100%.
            </p>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          <input
            type="number"
            min={1}
            max={100}
            value={safeValue}
            onChange={(e) => onChange(clampWeight(Number(e.target.value) || 1))}
            className={`${uiInput} h-9 w-16 text-center text-base font-semibold tabular-nums`}
          />
          <span className="text-sm font-medium text-slate-600">%</span>
        </div>
      </div>
      <input
        type="range"
        min={1}
        max={100}
        value={safeValue}
        onChange={(e) => onChange(clampWeight(Number(e.target.value)))}
        className="mt-3 w-full accent-slate-800"
        aria-label="Porcentaje del avance del proyecto"
      />
      <div className="mt-2 flex flex-wrap gap-3 text-xs text-slate-500">
        <span>Asignado: {budget.assigned + (currentId ? 0 : safeValue)}%</span>
        <span>Disponible: {budget.available}%</span>
      </div>
      {preview && preview.some((r) => r.weightManual === false) ? (
        <ul className="mt-2 space-y-0.5 border-t border-slate-200 pt-2 text-xs text-slate-600">
          {preview
            .filter((r) => {
              const prev = projectRows.find((row) => row.id === r.id);
              return prev && prev.weight !== r.weight;
            })
            .slice(0, 4)
            .map((r) => {
              const prev = projectRows.find((row) => row.id === r.id);
              return (
                <li key={r.id}>
                  {prev?.title ?? "Entregable"}: {prev?.weight}% → {r.weight}%
                </li>
              );
            })}
        </ul>
      ) : null}
    </div>
  );
}
