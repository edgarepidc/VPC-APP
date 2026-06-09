"use client";

import { useMemo, useState } from "react";

import {
  calculateMeetingRoi,
  getMeetingDiagnosis,
  type MeetingCalculatorInput,
  type MeetingCalculatorSnapshot,
} from "@/lib/meeting-roi-calculator";
import { formatMxn, getCostLevelBadge, MEETING_OBJECTIVE_LABELS } from "@/lib/meeting-roi-utils";
import type { MeetingObjective } from "@/modules/meeting-roi/service";
import { uiInput, uiLabel } from "@/lib/ui-classes";

const OBJECTIVES: MeetingObjective[] = ["informativa", "decision", "tecnica", "crisis"];

const toneClass = {
  info: "border-sky-200 bg-sky-50 text-sky-950",
  warning: "border-amber-200 bg-amber-50 text-amber-950",
  success: "border-emerald-200 bg-emerald-50 text-emerald-950",
  danger: "border-rose-200 bg-rose-50 text-rose-950",
};

type RoiMeetingsCalculatorProps = {
  canRegister: boolean;
  pending?: boolean;
  onRegister: (snapshot: MeetingCalculatorSnapshot) => void;
};

export function RoiMeetingsCalculator({
  canRegister,
  pending = false,
  onRegister,
}: RoiMeetingsCalculatorProps) {
  const [input, setInput] = useState<MeetingCalculatorInput>({
    junior: 0,
    senior: 1,
    director: 0,
    tech: 0,
    hours: 1,
    mins: 0,
    objective: "decision",
  });

  const snapshot = useMemo(() => calculateMeetingRoi(input), [input]);
  const badge = getCostLevelBadge(snapshot.costLevel);
  const diagnosis = getMeetingDiagnosis(
    snapshot.objective,
    snapshot.totalCost,
    snapshot.totalParticipants,
    snapshot.durationMinutes,
    snapshot.costPerMinute,
  );
  const barPct = Math.min(100, (snapshot.totalCost / 30000) * 100);

  function setRole(key: keyof Pick<MeetingCalculatorInput, "junior" | "senior" | "director" | "tech">, value: number) {
    setInput((prev) => ({ ...prev, [key]: Math.max(0, value) }));
  }

  return (
    <div className="space-y-4 p-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {(
          [
            ["junior", "Junior PM"],
            ["senior", "Senior PM"],
            ["director", "Director"],
            ["tech", "Líder técnico"],
          ] as const
        ).map(([key, label]) => (
          <label key={key} className="block">
            <span className={uiLabel}>{label}</span>
            <input
              type="number"
              min={0}
              value={input[key]}
              onChange={(e) => setRole(key, Number(e.target.value))}
              className={`${uiInput} mt-1`}
            />
          </label>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <label className="block">
          <span className={uiLabel}>Horas</span>
          <input
            type="number"
            min={0}
            value={input.hours}
            onChange={(e) =>
              setInput((p) => ({ ...p, hours: Math.max(0, Number(e.target.value)) }))
            }
            className={`${uiInput} mt-1`}
          />
        </label>
        <label className="block">
          <span className={uiLabel}>Minutos</span>
          <input
            type="number"
            min={0}
            max={59}
            value={input.mins}
            onChange={(e) =>
              setInput((p) => ({
                ...p,
                mins: Math.max(0, Math.min(59, Number(e.target.value))),
              }))
            }
            className={`${uiInput} mt-1`}
          />
        </label>
        <label className="block sm:col-span-1">
          <span className={uiLabel}>Objetivo</span>
          <select
            value={input.objective}
            onChange={(e) =>
              setInput((p) => ({ ...p, objective: e.target.value as MeetingObjective }))
            }
            className={`${uiInput} mt-1`}
          >
            {OBJECTIVES.map((o) => (
              <option key={o} value={o}>
                {MEETING_OBJECTIVE_LABELS[o]}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Inversión estimada
            </p>
            <p className="mt-1 text-3xl font-semibold tabular-nums text-slate-900">
              {formatMxn(snapshot.totalCost)}
            </p>
          </div>
          <span className={badge.className}>{badge.label}</span>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200">
          <div
            className="h-full rounded-full bg-slate-800 transition-all"
            style={{ width: `${barPct}%` }}
          />
        </div>
        <p className="mt-2 text-xs text-slate-500">
          {snapshot.totalParticipants} participantes · {snapshot.durationMinutes} min ·{" "}
          {formatMxn(Math.round(snapshot.costPerMinute))}/min
        </p>
      </div>

      {snapshot.totalCost > 0 ? (
        <div className={`rounded-lg border p-3 ${toneClass[diagnosis.tone]}`}>
          <p className="text-sm font-semibold">{diagnosis.title}</p>
          <p className="mt-1 text-sm leading-relaxed opacity-90">{diagnosis.text}</p>
        </div>
      ) : null}

      {canRegister ? (
        <button
          type="button"
          disabled={
            pending ||
            snapshot.totalParticipants === 0 ||
            snapshot.durationMinutes === 0 ||
            snapshot.totalCost === 0
          }
          onClick={() => onRegister(snapshot)}
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
        >
          {pending ? "Registrando…" : "Registrar sesión"}
        </button>
      ) : null}
    </div>
  );
}
