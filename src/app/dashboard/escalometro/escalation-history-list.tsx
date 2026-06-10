"use client";

import Link from "next/link";
import { useState } from "react";

import { ESCALOMETRO_REPORT } from "@/lib/dashboard-paths";
import {
  ESCALATION_INDICATOR_KEYS,
  ESCALATION_INDICATOR_SHORT,
  formatEscalationDateTime,
  formatRelativeDate,
  getEscalationTierBadge,
  getEscalationTierCardClass,
  getIndicatorLevelClass,
} from "@/lib/escalation-utils";

import {
  EscalationDetailDialog,
  type EscalationDetailRecord,
} from "@/app/dashboard/pmo/escalation-detail-dialog";

type EscalationHistoryListProps = {
  rows: EscalationDetailRecord[];
  canCreateRisk?: boolean;
};

export function EscalationHistoryList({ rows, canCreateRisk = false }: EscalationHistoryListProps) {
  const [selected, setSelected] = useState<EscalationDetailRecord | null>(null);

  return (
    <>
      {rows.map((check) => {
        const badge = getEscalationTierBadge(check.tier);
        return (
          <li
            key={check.id}
            className={`rounded-lg p-3 text-sm shadow-sm transition ${getEscalationTierCardClass(check.tier)}`}
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <button
                type="button"
                onClick={() => setSelected(check)}
                className="min-w-0 flex-1 text-left hover:opacity-90"
              >
                <p className="font-medium text-slate-900">
                  {check.project.name}
                  {check.topic ? (
                    <span className="font-normal text-slate-600"> · {check.topic}</span>
                  ) : null}
                </p>
                <p className="text-slate-600">{check.title}</p>
                <p className="mt-0.5 text-xs text-slate-500">
                  {check.authorName} · {formatEscalationDateTime(new Date(check.createdAt))}
                </p>
              </button>
              <div className="text-right">
                <span className={badge.className}>{badge.label}</span>
                <p className="mt-1 text-xs text-slate-500">
                  {formatRelativeDate(new Date(check.createdAt))}
                </p>
              </div>
            </div>
            <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap gap-1.5">
                {ESCALATION_INDICATOR_KEYS.map((key) => {
                  const level = check.indicators[key] ?? "low";
                  return (
                    <span
                      key={key}
                      className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] font-medium text-slate-600"
                    >
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${getIndicatorLevelClass(level)}`}
                        aria-hidden
                      />
                      {ESCALATION_INDICATOR_SHORT[key]}
                    </span>
                  );
                })}
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setSelected(check)}
                  className="text-xs font-medium text-slate-700 underline hover:text-slate-900"
                >
                  Ver detalle
                </button>
                <Link
                  href={ESCALOMETRO_REPORT(check.id)}
                  target="_blank"
                  className="text-xs font-medium text-slate-700 underline hover:text-slate-900"
                >
                  PDF
                </Link>
              </div>
            </div>
          </li>
        );
      })}
      <EscalationDetailDialog
        record={selected}
        onClose={() => setSelected(null)}
        canCreateRisk={canCreateRisk}
      />
    </>
  );
}
