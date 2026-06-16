"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import {
  TASK_LABEL_COLOR_KEYS,
  labelTheme,
  normalizeTaskLabelColorKey,
  type TaskLabelRecord,
} from "@/modules/tasks/labels";

import { createTaskLabelAction } from "./actions";

type Props = {
  catalog: TaskLabelRecord[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  canWrite: boolean;
};

export function TaskLabelPicker({ catalog, selectedIds, onChange, canWrite }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState<string>("sky");

  function toggle(id: string) {
    if (!canWrite || pending) return;
    onChange(
      selectedIds.includes(id) ? selectedIds.filter((x) => x !== id) : [...selectedIds, id],
    );
  }

  function createLabel() {
    const name = newName.trim();
    if (!name || !canWrite || pending) return;
    const fd = new FormData();
    fd.set("name", name);
    fd.set("colorKey", newColor);
    startTransition(async () => {
      try {
        const created = await createTaskLabelAction(fd);
        onChange([...selectedIds, created.id]);
        setNewName("");
        router.refresh();
      } catch (err) {
        alert(err instanceof Error ? err.message : "No se pudo crear la etiqueta.");
      }
    });
  }

  return (
    <div className={`space-y-2 ${pending ? "opacity-60" : ""}`}>
      <div className="flex flex-wrap gap-1.5">
        {catalog.map((label) => {
          const active = selectedIds.includes(label.id);
          const theme = labelTheme(label.colorKey);
          return (
            <button
              key={label.id}
              type="button"
              disabled={!canWrite || pending}
              onClick={() => toggle(label.id)}
              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium ring-1 ring-inset transition ${
                active
                  ? theme.chip
                  : "bg-white text-slate-600 ring-slate-200 hover:bg-slate-50"
              }`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${theme.dot}`} aria-hidden />
              {label.name}
            </button>
          );
        })}
        {catalog.length === 0 ? (
          <p className="text-xs text-slate-500">Sin etiquetas aún. Crea la primera abajo.</p>
        ) : null}
      </div>
      {canWrite ? (
        <div className="flex flex-wrap gap-2">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                createLabel();
              }
            }}
            placeholder="Nueva etiqueta…"
            maxLength={40}
            className="min-w-[10rem] flex-1 rounded-md border border-slate-300 bg-white px-2 py-1.5 text-xs outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
          />
          <select
            value={newColor}
            onChange={(e) => setNewColor(e.target.value)}
            className="rounded-md border border-slate-300 bg-white px-2 py-1.5 text-xs outline-none focus:border-sky-500"
            aria-label="Color de etiqueta"
          >
            {TASK_LABEL_COLOR_KEYS.map((key) => (
              <option key={key} value={key}>
                {key}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={createLabel}
            disabled={!newName.trim() || pending}
            className="rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium hover:bg-slate-50 disabled:opacity-50"
          >
            Añadir
          </button>
        </div>
      ) : null}
    </div>
  );
}

export function TaskLabelChips({
  labels,
  max = 3,
  size = "sm",
}: {
  labels: TaskLabelRecord[];
  max?: number;
  size?: "sm" | "xs";
}) {
  if (labels.length === 0) return null;
  const visible = labels.slice(0, max);
  const hidden = labels.length - visible.length;
  const text = size === "xs" ? "text-[9px]" : "text-[10px]";
  const pad = size === "xs" ? "px-1.5 py-0.5" : "px-2 py-0.5";

  return (
    <div className="flex flex-wrap gap-1">
      {visible.map((label) => {
        const theme = labelTheme(label.colorKey);
        return (
          <span
            key={label.id}
            className={`inline-flex items-center gap-1 rounded-full font-medium ring-1 ring-inset ${text} ${pad} ${theme.chip}`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${theme.dot}`} aria-hidden />
            {label.name}
          </span>
        );
      })}
      {hidden > 0 ? (
        <span className={`${text} text-slate-400`}>+{hidden}</span>
      ) : null}
    </div>
  );
}

export function labelColorDotClass(colorKey: string) {
  return labelTheme(normalizeTaskLabelColorKey(colorKey)).dot;
}
