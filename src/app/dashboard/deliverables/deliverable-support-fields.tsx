"use client";

import { useRef, useState, useTransition } from "react";

import { uiInput, uiLabel } from "@/lib/ui-classes";

import {
  clearDeliverablePdfAction,
  uploadDeliverablePdfAction,
} from "./support-actions";

type DeliverableSupportFieldsProps = {
  deliverableId?: string;
  supportUrl: string;
  onSupportUrlChange: (value: string) => void;
  supportFileUrl: string | null;
  supportFileName: string | null;
  canEdit: boolean;
  onUploadComplete?: () => void;
  compact?: boolean;
};

export function DeliverableSupportFields({
  deliverableId,
  supportUrl,
  onSupportUrlChange,
  supportFileUrl,
  supportFileName,
  canEdit,
  onUploadComplete,
  compact = false,
}: DeliverableSupportFieldsProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function uploadFile(file: File) {
    if (!deliverableId) {
      setError("Guarda el entregable primero para adjuntar el PDF.");
      return;
    }
    startTransition(async () => {
      setError(null);
      const fd = new FormData();
      fd.append("deliverableId", deliverableId);
      fd.append("file", file);
      const result = await uploadDeliverablePdfAction(fd);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      onUploadComplete?.();
    });
  }

  return (
    <div className={`rounded-lg border border-slate-200 ${compact ? "p-2.5" : "p-3"}`}>
      <p className={uiLabel}>Soporte documental</p>
      {!compact ? (
        <p className="mt-1 text-xs text-slate-500">
          Enlace a carpeta compartida o PDF de respaldo del entregable.
        </p>
      ) : null}

      <label className="mt-3 block">
        <span className="text-xs text-slate-600">Enlace a carpeta o ubicación</span>
        <input
          type="url"
          value={supportUrl}
          onChange={(e) => onSupportUrlChange(e.target.value)}
          placeholder="https://…"
          disabled={!canEdit}
          className={`${uiInput} mt-1`}
        />
      </label>

      <div className="mt-3">
        <span className="text-xs text-slate-600">PDF adjunto</span>
        {supportFileUrl ? (
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <a
              href={supportFileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-medium text-slate-800 underline"
            >
              {supportFileName ?? "Ver PDF"}
            </a>
            {canEdit ? (
              <button
                type="button"
                disabled={pending}
                onClick={() =>
                  deliverableId &&
                  startTransition(async () => {
                    await clearDeliverablePdfAction(deliverableId);
                    onUploadComplete?.();
                  })
                }
                className="text-xs text-rose-700 underline"
              >
                Quitar
              </button>
            ) : null}
          </div>
        ) : canEdit ? (
          <div className="mt-1">
            <input
              ref={fileRef}
              type="file"
              accept="application/pdf,.pdf"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) uploadFile(file);
                e.target.value = "";
              }}
            />
            <button
              type="button"
              disabled={pending}
              onClick={() => fileRef.current?.click()}
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
            >
              {pending ? "Subiendo…" : deliverableId ? "Adjuntar PDF" : "PDF tras guardar"}
            </button>
          </div>
        ) : (
          <p className="mt-1 text-xs text-slate-400">Sin PDF adjunto</p>
        )}
      </div>

      {error ? <p className="mt-2 text-xs text-rose-700">{error}</p> : null}
    </div>
  );
}
