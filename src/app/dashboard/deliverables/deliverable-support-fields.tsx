"use client";

import { useRef, useState, useTransition } from "react";

import type { DeliverableSupportFile } from "@/modules/deliverables/json";
import { uiInput, uiLabel } from "@/lib/ui-classes";

import {
  clearDeliverablePdfAction,
  uploadDeliverablePdfAction,
} from "./support-actions";

type DeliverableSupportFieldsProps = {
  deliverableId?: string;
  supportUrl: string;
  onSupportUrlChange: (value: string) => void;
  supportFiles: DeliverableSupportFile[];
  canEdit: boolean;
  onUploadComplete?: () => void;
  compact?: boolean;
};

export function DeliverableSupportFields({
  deliverableId,
  supportUrl,
  onSupportUrlChange,
  supportFiles,
  canEdit,
  onUploadComplete,
  compact = false,
}: DeliverableSupportFieldsProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(
    supportFiles[0]?.url ?? null,
  );

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
          Enlace a carpeta compartida y uno o más PDFs de respaldo.
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
        <span className="text-xs text-slate-600">PDFs adjuntos</span>
        {supportFiles.length > 0 ? (
          <ul className="mt-1 space-y-1">
            {supportFiles.map((file) => (
              <li key={file.url} className="flex flex-wrap items-center gap-2 text-sm">
                <button
                  type="button"
                  onClick={() => setPreviewUrl(file.url)}
                  className={`font-medium underline ${
                    previewUrl === file.url ? "text-slate-900" : "text-slate-700"
                  }`}
                >
                  {file.name}
                </button>
                <a
                  href={file.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-slate-500 hover:text-slate-800"
                >
                  Abrir
                </a>
                {canEdit ? (
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() =>
                      deliverableId &&
                      startTransition(async () => {
                        await clearDeliverablePdfAction(deliverableId, file.url);
                        if (previewUrl === file.url) setPreviewUrl(null);
                        onUploadComplete?.();
                      })
                    }
                    className="text-xs text-rose-700 underline"
                  >
                    Quitar
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-1 text-xs text-slate-400">Sin PDFs adjuntos</p>
        )}

        {canEdit ? (
          <div className="mt-2">
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
        ) : null}
      </div>

      {previewUrl ? (
        <div className="mt-3 overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
          <div className="border-b border-slate-200 px-2 py-1 text-[10px] font-medium text-slate-500">
            Vista previa
          </div>
          <iframe
            title="Vista previa PDF"
            src={previewUrl}
            className="h-[min(320px,50vh)] w-full bg-white"
          />
        </div>
      ) : null}

      {error ? <p className="mt-2 text-xs text-rose-700">{error}</p> : null}
    </div>
  );
}
