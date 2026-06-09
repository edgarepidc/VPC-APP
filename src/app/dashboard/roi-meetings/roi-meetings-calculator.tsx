"use client";

import { useMemo, useState } from "react";

import { FieldHint } from "@/app/dashboard/_components/field-hint";
import {
  calculateMeetingRoi,
  getMeetingDiagnosis,
  MEETING_ROLE_RATES,
  type MeetingCalculatorInput,
  type MeetingCalculatorSnapshot,
} from "@/lib/meeting-roi-calculator";
import {
  formatDurationMinutes,
  formatMxn,
  MEETING_OBJECTIVE_LABELS,
  ROLE_LABELS,
} from "@/lib/meeting-roi-utils";
import type { MeetingObjective } from "@/modules/meeting-roi/service";

const OBJECTIVES: MeetingObjective[] = ["informativa", "decision", "tecnica", "crisis"];

const ROLES = ["junior", "senior", "director", "tech"] as const;

const diagnosisPanelClass = {
  info: "border-sky-200/80 bg-sky-50 [&_.diag-title]:text-[#1a6fd4]",
  warning: "border-amber-200/80 bg-amber-50 [&_.diag-title]:text-[#b36200]",
  success: "border-emerald-200/80 bg-emerald-50 [&_.diag-title]:text-[#1d7a4a]",
  danger: "border-rose-200/80 bg-rose-50 [&_.diag-title]:text-[#c0392b]",
};

function taximeterColor(totalCost: number) {
  if (totalCost >= 15_000) return "text-[#c0392b]";
  if (totalCost >= 5_000) return "text-[#b36200]";
  if (totalCost > 0) return "text-[#1d7a4a]";
  return "text-slate-900";
}

function barColor(totalCost: number) {
  if (totalCost === 0) return "#e2e8f0";
  if (totalCost < 3_000) return "#1d7a4a";
  if (totalCost < 8_000) return "#1a6fd4";
  if (totalCost < 15_000) return "#b36200";
  return "#c0392b";
}

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
  const diagnosis = getMeetingDiagnosis(
    snapshot.objective,
    snapshot.totalCost,
    snapshot.totalParticipants,
    snapshot.durationMinutes,
    snapshot.costPerMinute,
  );
  const barPct = Math.min(100, (snapshot.totalCost / 30_000) * 100);

  const activeRoles = ROLES.filter((role) => input[role] > 0);

  function setRole(
    key: (typeof ROLES)[number],
    value: number,
  ) {
    setInput((prev) => ({ ...prev, [key]: Math.max(0, value) }));
  }

  return (
    <div className="space-y-4 p-4 sm:p-5">
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-[14px] border border-slate-200 bg-white p-5 shadow-sm">
          <p className="mb-4 text-[11px] font-medium uppercase tracking-[0.07em] text-slate-400">
            Participantes por rol
          </p>
          <div className="space-y-2.5">
            {ROLES.map((role) => (
              <div key={role} className="flex flex-wrap items-center gap-2 sm:flex-nowrap sm:gap-2.5">
                <span className="min-w-0 flex-1 text-[13px] text-slate-900">{ROLE_LABELS[role]}</span>
                <span className="w-full text-[11px] text-slate-400 sm:w-[72px] sm:text-right">
                  {formatMxn(MEETING_ROLE_RATES[role])}/hr
                </span>
                <input
                  type="number"
                  min={0}
                  max={50}
                  value={input[role]}
                  onChange={(e) => setRole(role, Number(e.target.value))}
                  className="w-[72px] rounded-[10px] border border-slate-300 bg-slate-100 px-2.5 py-1.5 text-center text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/15"
                />
              </div>
            ))}
          </div>

          <hr className="my-5 border-slate-200" />

          <p className="mb-3 text-[11px] font-medium uppercase tracking-[0.07em] text-slate-400">
            Duración
          </p>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={0}
              max={8}
              value={input.hours}
              onChange={(e) =>
                setInput((p) => ({ ...p, hours: Math.max(0, Number(e.target.value)) }))
              }
              placeholder="HH"
              className="min-w-0 flex-1 rounded-[10px] border border-slate-300 bg-slate-100 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/15"
            />
            <span className="text-base font-light text-slate-400">h</span>
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
              placeholder="MM"
              className="min-w-0 flex-1 rounded-[10px] border border-slate-300 bg-slate-100 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/15"
            />
            <span className="text-base font-light text-slate-400">min</span>
          </div>

          <hr className="my-5 border-slate-200" />

          <p className="mb-3 text-[11px] font-medium uppercase tracking-[0.07em] text-slate-400">
            Objetivo de la reunión
          </p>
          <select
            value={input.objective}
            onChange={(e) =>
              setInput((p) => ({ ...p, objective: e.target.value as MeetingObjective }))
            }
            className="w-full rounded-[10px] border border-slate-300 bg-slate-100 px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-500 focus:bg-white"
          >
            {OBJECTIVES.map((o) => (
              <option key={o} value={o}>
                {MEETING_OBJECTIVE_LABELS[o]}
              </option>
            ))}
          </select>
        </div>

        <div className="rounded-[14px] border border-slate-200 bg-white p-5 shadow-sm">
          <p className="mb-4 text-[11px] font-medium uppercase tracking-[0.07em] text-slate-400">
            Inversión en tiempo real
          </p>

          <div className="mb-4 rounded-[10px] border border-slate-200 bg-slate-100 px-5 py-5 text-center">
            <p className="text-[11px] font-medium uppercase tracking-[0.07em] text-slate-400">
              Costo total de la sesión
            </p>
            <p
              className={`mt-2 text-[42px] font-light tabular-nums leading-none tracking-tight transition-colors sm:text-5xl ${taximeterColor(snapshot.totalCost)}`}
            >
              <span className="mr-0.5 align-super text-xl font-normal opacity-60">$</span>
              {snapshot.totalCost.toLocaleString("es-MX", { maximumFractionDigits: 0 })}
            </p>
          </div>

          <div className="mb-4 grid grid-cols-3 gap-2">
            {(
              [
                ["Por minuto", formatMxn(Math.round(snapshot.costPerMinute))],
                ["Participantes", String(snapshot.totalParticipants)],
                ["Duración", formatDurationMinutes(snapshot.durationMinutes)],
              ] as const
            ).map(([label, value]) => (
              <div
                key={label}
                className="rounded-[10px] border border-slate-200 bg-slate-100 px-3 py-2.5"
              >
                <p className="text-[11px] text-slate-400">{label}</p>
                <p className="mt-0.5 text-[15px] font-medium tabular-nums text-slate-900">
                  {value}
                </p>
              </div>
            ))}
          </div>

          <div className="mb-4">
            <div className="mb-1.5 flex justify-between text-[11px] text-slate-400">
              <span>Nivel de inversión</span>
              <span>{snapshot.costLevel}</span>
            </div>
            <div className="h-1 overflow-hidden rounded-full bg-slate-200">
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{ width: `${barPct}%`, backgroundColor: barColor(snapshot.totalCost) }}
              />
            </div>
          </div>

          <hr className="mb-4 border-slate-200" />

          <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.07em] text-slate-400">
            Desglose por rol
          </p>
          <div className="space-y-1.5 text-xs">
            {activeRoles.length === 0 ? (
              <div className="flex justify-between text-slate-500">
                <span>Sin participantes configurados</span>
                <span>—</span>
              </div>
            ) : (
              <>
                {activeRoles.map((role) => (
                  <div key={role} className="flex justify-between gap-2 text-slate-600">
                    <span>
                      {input[role]}× {ROLE_LABELS[role]}
                    </span>
                    <span className="tabular-nums text-slate-900">
                      {formatMxn(snapshot.roleCosts[role])}
                    </span>
                  </div>
                ))}
                <div className="flex justify-between border-t border-slate-200 pt-2 text-[13px] font-medium text-slate-900">
                  <span>Total</span>
                  <span className="tabular-nums">{formatMxn(snapshot.totalCost)}</span>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <div
        className={`rounded-[10px] border p-4 transition-colors ${diagnosisPanelClass[diagnosis.tone]}`}
      >
        <p className="diag-title text-[11px] font-medium uppercase tracking-[0.06em]">
          {diagnosis.title}
        </p>
        <p className="mt-1.5 text-[13px] leading-relaxed text-slate-900">{diagnosis.text}</p>
      </div>

      {snapshot.totalParticipants === 0 || snapshot.durationMinutes === 0 ? (
        <div className="rounded-[10px] border border-slate-200 bg-slate-100 px-3.5 py-2.5 text-xs leading-relaxed text-slate-600">
          Tip: Las reuniones de más de 6 personas con objetivo informativo tienen un retorno bajo.
          Considera documentación asíncrona para comunicados unidireccionales.
        </div>
      ) : null}

      {canRegister ? (
        <div className="flex flex-wrap gap-2 border-t border-slate-200 pt-4">
          <button
            type="button"
            disabled={
              pending ||
              snapshot.totalParticipants === 0 ||
              snapshot.durationMinutes === 0 ||
              snapshot.totalCost === 0
            }
            onClick={() => onRegister(snapshot)}
            className="inline-flex items-center gap-2 rounded-[10px] bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800 disabled:opacity-50"
          >
            {pending ? "Registrando…" : "Registrar sesión"}
          </button>
        </div>
      ) : null}
    </div>
  );
}
