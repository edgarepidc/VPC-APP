"use client";

import { useEffect } from "react";

type TasksKeyboardLayerProps = {
  canWrite: boolean;
};

function isTypingTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return (
    tag === "INPUT" ||
    tag === "TEXTAREA" ||
    tag === "SELECT" ||
    target.isContentEditable
  );
}

export function TasksKeyboardLayer({ canWrite }: TasksKeyboardLayerProps) {
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (isTypingTarget(e.target)) return;

      if (e.key === "/" && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        document.getElementById("tasks-search-input")?.focus();
        return;
      }

      if ((e.key === "n" || e.key === "N") && canWrite && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent("tasks:quick-add"));
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [canWrite]);

  return null;
}

export function TasksShortcutsHint({ canWrite }: { canWrite: boolean }) {
  return (
    <p className="mt-3 text-[11px] text-slate-400">
      Atajos: <kbd className="rounded border border-slate-200 bg-slate-50 px-1">/</kbd> buscar
      {canWrite ? (
        <>
          {" "}
          · <kbd className="rounded border border-slate-200 bg-slate-50 px-1">N</kbd> nueva tarea
        </>
      ) : null}
    </p>
  );
}
