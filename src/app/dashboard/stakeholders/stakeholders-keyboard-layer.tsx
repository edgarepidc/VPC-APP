"use client";

import { useEffect } from "react";

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

export function StakeholdersKeyboardLayer() {
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (isTypingTarget(e.target)) return;
      if (e.key === "/" && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        document.getElementById("stakeholders-search-input")?.focus();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return null;
}

export function StakeholdersShortcutsHint() {
  return (
    <p className="mt-3 text-[11px] text-slate-400">
      Atajo: <kbd className="rounded border border-slate-200 bg-slate-50 px-1">/</kbd> buscar
    </p>
  );
}
