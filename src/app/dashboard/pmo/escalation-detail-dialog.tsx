"use client";

import Link from "next/link";
import { useCallback, useEffect, useId } from "react";

import { ESCALOMETRO_REPORT } from "@/lib/dashboard-paths";
import {
  ESCALATION_INDICATOR_KEYS,
  formatRelativeDate,
  getEscalationTierBadge,
  getIndicatorLevelClass,
} from "@/lib/escalation-utils";
import { getIndicatorLabel, getIndicatorLevelLabel } from "@/lib/escalation-indicators";
import { uiButtonSecondary } from "@/lib/ui-classes";

export type EscalationDetailRecord = {
  id: string;
  tier: string;
  title: string;
  levelLabel: string;
  topic: string | null;
  indicators: Record<string, string>;
  actions: string[];
  createdAt: string;
  project: { id: string; name: string };
};

type EscalationDetailDialogProps = {
  record: EscalationDetailRecord | null;
  onClose: () => void;
};

export function EscalationDetailDialog({ record, onClose }: EscalationDetailDialogProps) {
  const titleId = useId();

  const handleKey = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    },
    [onClose],
  );

  useEffect(() => {
    if (!record) return;
    window.addEventListener("keydown", handleKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", handleKey);
      document.body.style.overflow = prev;
    };
  }, [record, handleKey]);

  if (!record) return null;

  const badge = getEscalationTierBadge(record.tier);
  const createdAt = new Date(record.createdAt);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center" role="presentation">
      <button
        type="button"
        className="absolute inset-0 bg-black/45"
        aria-label="Cerrar detalle"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative max-h-[min(90dvh,640px)] w-full max-w-lg overflow-y-auto rounded-xl border border-slate-200 bg-white p-5 shadow-xl"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p id={titleId} className="font-semibold text-slate-900">
              {record.project.name}
            </p>
            {record.topic ? (
              <p className="text-sm text-slate-600">{record.topic}</p>
            ) : null}
          </div>
          <span className={badge.className}>{badge.label}</span>
        </div>

        <p className="mt-2 text-sm font-medium text-slate-800">{record.title}</p>
        <p className="text-xs text-slate-500">
          {record.levelLabel} · {formatRelativeDate(createdAt)}
        </p>

        <div className="mt-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Indicadores
          </p>
          <ul className="mt-2 space-y-1.5 text-sm">
            {ESCALATION_INDICATOR_KEYS.map((key) => {
              const level = record.indicators[key] ?? "low";
              return (
                <li
                  key={key}
                  className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2"
                >
                  <span className="text-slate-700">{getIndicatorLabel(key)}</span>
                  <span className="inline-flex items-center gap-1.5 text-slate-600">
                    <span
                      className={`h-2 w-2 rounded-full ${getIndicatorLevelClass(level)}`}
                      aria-hidden
                    />
                    {getIndicatorLevelLabel(level)}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="mt-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Acciones recomendadas
          </p>
          <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-slate-700">
            {record.actions.map((action) => (
              <li key={action}>{action}</li>
            ))}
          </ol>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          <Link
            href={`${ESCALOMETRO_REPORT(record.id)}?auto=1`}
            target="_blank"
            className={uiButtonSecondary}
          >
            Exportar PDF
          </Link>
          <button type="button" onClick={onClose} className={uiButtonSecondary}>
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
