"use client";

import { useCallback, useEffect, useId, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import {
  deleteMeetingRoiSessionAction,
  updateMeetingRoiSessionAction,
} from "@/app/dashboard/roi-meetings/actions";
import {
  formatDurationMinutes,
  formatMxn,
  getCostLevelBadge,
  MEETING_OBJECTIVE_LABELS,
  ROLE_LABELS,
  type MeetingRoiDetailRecord,
} from "@/lib/meeting-roi-utils";
import { formatEscalationDateTime } from "@/lib/escalation-utils";
import { dashAlertError, uiInput, uiLabel } from "@/lib/ui-classes";

type RoiSessionDetailDialogProps = {
  record: MeetingRoiDetailRecord | null;
  canEdit?: boolean;
  onClose: () => void;
};

export function RoiSessionDetailDialog({
  record,
  canEdit = false,
  onClose,
}: RoiSessionDetailDialogProps) {
  const router = useRouter();
  const titleId = useId();
  const [editing, setEditing] = useState(false);
  const [sessionName, setSessionName] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!record) {
      setEditing(false);
      setConfirmDelete(false);
      setError(null);
      return;
    }
    setSessionName(record.sessionName ?? "");
    setEditing(false);
    setConfirmDelete(false);
    setError(null);
  }, [record]);

  const handleKey = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape" && !pending) onClose();
    },
    [onClose, pending],
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

  const badge = getCostLevelBadge(record.costLevel);
  const roles = (["junior", "senior", "director", "tech"] as const).filter(
    (role) => record.participants[role] > 0,
  );

  function saveName() {
    if (!record) return;
    startTransition(async () => {
      const result = await updateMeetingRoiSessionAction(record.id, sessionName.trim() || null);
      if (result.ok) {
        router.refresh();
        setEditing(false);
        setError(null);
      } else {
        setError(result.error);
      }
    });
  }

  function removeSession() {
    if (!record) return;
    startTransition(async () => {
      const result = await deleteMeetingRoiSessionAction(record.id);
      if (result.ok) {
        router.refresh();
        onClose();
      } else {
        setError(result.error);
        setConfirmDelete(false);
      }
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center" role="presentation">
      <button
        type="button"
        className="absolute inset-0 bg-black/45"
        aria-label="Cerrar detalle"
        onClick={onClose}
        disabled={pending}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative max-h-[min(90dvh,640px)] w-full max-w-lg overflow-y-auto rounded-t-2xl border border-slate-200 bg-white p-5 shadow-xl sm:rounded-xl"
      >
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-slate-200 sm:hidden" aria-hidden />

        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 id={titleId} className="text-lg font-semibold text-slate-900">
              {record.project.name}
              {!editing && record.sessionName ? (
                <span className="font-normal text-slate-600"> · {record.sessionName}</span>
              ) : null}
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              {MEETING_OBJECTIVE_LABELS[record.objective] ?? record.objective}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={pending}
            className="shrink-0 rounded-lg px-2 py-1 text-slate-500 hover:bg-slate-100 disabled:opacity-50"
            aria-label="Cerrar"
          >
            ✕
          </button>
        </div>

        {canEdit && editing ? (
          <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3">
            <label className="block">
              <span className={uiLabel}>Nombre de la sesión</span>
              <input
                type="text"
                value={sessionName}
                onChange={(e) => setSessionName(e.target.value)}
                maxLength={200}
                className={`${uiInput} mt-1`}
                placeholder="Ej. Sprint planning…"
              />
            </label>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                disabled={pending}
                onClick={saveName}
                className="rounded-lg bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
              >
                {pending ? "Guardando…" : "Guardar"}
              </button>
              <button
                type="button"
                disabled={pending}
                onClick={() => {
                  setSessionName(record.sessionName ?? "");
                  setEditing(false);
                  setError(null);
                }}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-white"
              >
                Cancelar
              </button>
            </div>
          </div>
        ) : null}

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className={badge.className}>{badge.label}</span>
          <span className="text-sm font-medium text-slate-900">{formatMxn(record.totalCost)}</span>
          <span className="text-xs text-slate-500">
            {record.totalParticipants} participantes · {formatDurationMinutes(record.durationMinutes)}
          </span>
        </div>

        <p className="mt-1 text-xs text-slate-500">
          {formatMxn(record.costPerMinute)}/min · {record.authorName} ·{" "}
          {formatEscalationDateTime(new Date(record.createdAt))}
        </p>

        <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3">
          <p className="text-sm font-medium text-slate-900">{record.diagnosisTitle}</p>
          <p className="mt-1 text-sm text-slate-600">{record.diagnosisText}</p>
        </div>

        {roles.length > 0 && (
          <div className="mt-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Desglose por rol
            </p>
            <ul className="mt-2 space-y-1.5 text-sm">
              {roles.map((role) => (
                <li key={role} className="flex justify-between gap-2 text-slate-700">
                  <span>
                    {record.participants[role]}× {ROLE_LABELS[role]}
                  </span>
                  <span className="font-medium">{formatMxn(record.roleCosts[role])}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {error ? <p className={`mt-4 ${dashAlertError}`}>{error}</p> : null}

        {canEdit ? (
          <div className="mt-5 space-y-3 border-t border-slate-200 pt-4">
            {!editing && !confirmDelete ? (
              <button
                type="button"
                disabled={pending}
                onClick={() => setEditing(true)}
                className="w-full rounded-lg border border-slate-200 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                Editar nombre
              </button>
            ) : null}

            {confirmDelete ? (
              <div className="rounded-lg border border-rose-200 bg-rose-50 p-3">
                <p className="text-sm font-medium text-rose-950">
                  ¿Eliminar esta sesión del historial?
                </p>
                <p className="mt-1 text-xs text-rose-800">
                  Esta acción no se puede deshacer.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={pending}
                    onClick={removeSession}
                    className="rounded-lg bg-rose-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-rose-800 disabled:opacity-50"
                  >
                    {pending ? "Eliminando…" : "Sí, eliminar"}
                  </button>
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => setConfirmDelete(false)}
                    className="rounded-lg border border-rose-200 px-3 py-1.5 text-sm font-medium text-rose-900 hover:bg-white"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                disabled={pending || editing}
                onClick={() => setConfirmDelete(true)}
                className="w-full rounded-lg border border-rose-200 py-2 text-sm font-medium text-rose-800 hover:bg-rose-50 disabled:opacity-50"
              >
                Eliminar sesión
              </button>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export type { MeetingRoiDetailRecord };
